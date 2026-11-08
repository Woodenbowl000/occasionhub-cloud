// This file augments the Express Request interface globally
// It should be imported once in the main entry point (index.ts)

import type { TokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      userId?: string;
    }
  }
}

export {};
