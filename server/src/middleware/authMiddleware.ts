import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authMiddleware = (allowedRoles?: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    req.user = decoded;

    // Check role-based access
    if (allowedRoles && !allowedRoles.includes(decoded.role.toLowerCase())) {
      res
        .status(403)
        .json({ message: "Access Denied - Insufficient permissions" });
      return;
    }

    next();
  };
};

// Simplified middleware exports
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  (req as any).userId = decoded.id;
  (req as any).userRole = decoded.role;
  req.user = decoded;

  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;

    if (!roles.includes(userRole)) {
      res
        .status(403)
        .json({ message: "Access Denied - Insufficient permissions" });
      return;
    }

    next();
  };
};
