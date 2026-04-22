import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { type AuthUser } from "../lib/auth";
import { sendError } from "../lib/http";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }
    export interface AuthedRequest {
      user: User;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    replit?: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const userId = req.session?.userId;
  if (!userId) {
    next();
    return;
  }

  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!u) {
    next();
    return;
  }

  req.user = {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
  };
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.isAuthenticated()) {
    sendError(res, 401, "unauthorized", "Unauthorized");
    return;
  }
  next();
}
