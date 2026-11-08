import jwt from "jsonwebtoken";

const DEV_SECRET = "dev-only-secret-change-me";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }
    return DEV_SECRET;
  }
  return secret;
};

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  isVendor?: boolean;
  /** Issued-at (seconds), set by jsonwebtoken */
  iat?: number;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch (error) {
    return null;
  }
};
