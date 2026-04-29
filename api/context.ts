import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { parseCookies, getSession } from "./lib/session";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  userId: string | null;
  email: string | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const cookieHeader = opts.req.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const sid = cookies["sid"] || "";
  let userId: string | null = null;
  let email: string | null = null;
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      userId = session.userId;
      email = session.email;
    }
  }
  return { req: opts.req, resHeaders: opts.resHeaders, userId, email };
}
