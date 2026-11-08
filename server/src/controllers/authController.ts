import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import type { User } from "@prisma/client";
import prisma from "../lib/prisma";
import { generateToken } from "../utils/jwt";
import { sendEmail, clientUrl } from "../utils/email";

const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const googleClient = new OAuth2Client();

const normalizeEmail = (email: string) => String(email).trim().toLowerCase();

// Older accounts may have been stored with mixed-case emails
const findByEmail = (email: string) =>
  prisma.user.findFirst({
    where: { email: { equals: String(email).trim(), mode: "insensitive" } },
  });

const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

/** User fields safe to send to the client. */
const publicUser = ({
  password,
  googleId,
  passwordResetToken,
  passwordResetExpires,
  passwordChangedAt,
  ...user
}: User) => ({
  ...user,
  hasPassword: !!password,
  hasGoogle: !!googleId,
});

const sessionResponse = (user: User) => ({
  user: publicUser(user),
  token: generateToken({ id: user.id, email: user.email, role: user.role }),
});

const passwordTooShort = (password: unknown) =>
  !password || String(password).length < MIN_PASSWORD_LENGTH;

const PASSWORD_TOO_SHORT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: "Name, email and password are required" });
      return;
    }
    if (passwordTooShort(password)) {
      res.status(400).json({ message: PASSWORD_TOO_SHORT });
      return;
    }

    const existingUser = await findByEmail(email);
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(email),
        password: hashedPassword,
        name,
        phone,
        role: "USER",
      },
    });

    res.status(201).json(sessionResponse(user));
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await findByEmail(email);
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.password) {
      res.status(401).json({
        message:
          "This account uses Google sign-in. Continue with Google, or reset your password to set one.",
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    res.status(200).json(sessionResponse(user));
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Sign in (or sign up) with a Google ID token from Google Identity Services.
 * A Google account whose verified email matches an existing user is linked
 * to that user.
 */
export const googleSignin = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(503).json({ message: "Google sign-in is not configured" });
      return;
    }

    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ message: "Missing Google credential" });
      return;
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      // 400, not 401: the client treats 401 as "session expired"
      res.status(400).json({ message: "Google sign-in failed. Please try again." });
      return;
    }

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      res.status(400).json({ message: "Your Google account email is not verified" });
      return;
    }

    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      const existing = await findByEmail(payload.email);
      user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { googleId: payload.sub },
          })
        : await prisma.user.create({
            data: {
              email: normalizeEmail(payload.email),
              name: payload.name || payload.email.split("@")[0],
              googleId: payload.sub,
              role: "USER",
            },
          });
    }

    res.status(200).json(sessionResponse(user));
  } catch (error) {
    console.error("Google signin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/** Emails a one-time reset link. Responds the same whether or not the account exists. */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await findByEmail(email);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashResetToken(rawToken),
          passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const link = `${clientUrl()}/reset-password?token=${rawToken}`;
      await sendEmail(
        user.email,
        "Reset your OccasionHub password",
        `<p>Hi,</p>
<p>We got a request to reset your OccasionHub password. This link works for 1 hour:</p>
<p><a href="${link}">Reset my password</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>`,
        `Hi,\n\nReset your OccasionHub password (link works for 1 hour):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`
      );
    }

    res.status(200).json({
      message: "If an account exists for that email, we've sent a reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ message: "Couldn't send the reset email. Please try again later." });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token) {
      res.status(400).json({ message: "Reset token is required" });
      return;
    }
    if (passwordTooShort(password)) {
      res.status(400).json({ message: PASSWORD_TOO_SHORT });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: hashResetToken(String(token)) },
    });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      res.status(400).json({ message: "This reset link is invalid or has expired" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 10),
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Password updated. You can sign in now." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Change (or, for Google-only accounts, set) the password. Signs out other
 * sessions and returns a fresh token for this one.
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (passwordTooShort(newPassword)) {
      res.status(400).json({ message: PASSWORD_TOO_SHORT });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.password) {
      const valid =
        !!currentPassword && (await bcrypt.compare(currentPassword, user.password));
      if (!valid) {
        // 400, not 401: the client treats 401 as "session expired"
        res.status(400).json({ message: "Current password is incorrect" });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt: new Date(),
      },
    });

    res.status(200).json(sessionResponse(updated));
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ message: "Name and email are required" });
      return;
    }

    const existing = await findByEmail(email);
    if (existing && existing.id !== req.user!.id) {
      res.status(400).json({ message: "That email is already in use" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: name.trim(),
        email: normalizeEmail(email),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });

    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(publicUser(user));
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
