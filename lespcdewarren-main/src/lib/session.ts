import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  user?: { id: number; email: string; name?: string | null; role: "USER" | "ADMIN" };
};

export const sessionOptions: SessionOptions = {
  cookieName: "lespcdewarren_session",
  password: process.env.SESSION_SECRET || "dev-secret-change-me-please-32-chars-min",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}
