import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import prisma from "../lib/prisma";

/**
 * JWT authentication. The token only proves who the caller is; role and
 * vendor status are read from the database on every request so that admin
 * changes (role edits, vendor approval) apply without signing in again.
 *
 * (Formerly tried AWS Cognito first; Cognito has been removed.)
 */
export const hybridAuth = (allowedRoles?: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res.status(401).json({ message: "Unauthorized - No token provided" });
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        res.status(401).json({ message: "Unauthorized - Invalid token" });
        return;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          isVendor: true,
          passwordChangedAt: true,
        },
      });
      if (!dbUser) {
        res.status(401).json({ message: "Unauthorized - User not found" });
        return;
      }

      // A password change or reset signs out every older session
      if (
        dbUser.passwordChangedAt &&
        (decoded.iat ?? 0) <
          Math.floor(dbUser.passwordChangedAt.getTime() / 1000)
      ) {
        res.status(401).json({ message: "Unauthorized - Session expired" });
        return;
      }

      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        isVendor: dbUser.isVendor,
      };
      // Older controllers read these directly
      (req as any).userId = dbUser.id;
      (req as any).userRole = dbUser.role;

      if (allowedRoles && !allowedRoles.includes(dbUser.role.toLowerCase())) {
        res
          .status(403)
          .json({ message: "Access Denied - Insufficient permissions" });
        return;
      }

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(401).json({ message: "Unauthorized" });
    }
  };
};

export const requireAuth = hybridAuth;
