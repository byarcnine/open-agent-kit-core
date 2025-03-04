// app/sessions.ts
import { createCookieSessionStorage } from "react-router";

type SessionData = {
  invite?: {
    code: string;
    email: string;
  };
};

type SessionFlashData = {
  error: string;
  message: {
    heading: string;
    type: "success" | "error";
  };
};

export const sessionStorage = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({
  // a Cookie from `createCookie` or the CookieOptions to create one
  cookie: {
    name: "__session",

    // all of these are optional
    // domain: "remix.run",
    // Expires can also be set (although maxAge overrides it when used in combination).
    // Note that this method is NOT recommended as `new Date` creates only one date on each server deployment, not a dynamic date in the future!
    //
    // expires: new Date(Date.now() + 60_000),
    httpOnly: true,
    maxAge: 60 * 60, // 1 hour
    path: "/",
    sameSite: "lax",
    secrets: [process.env.APP_SECRET as string],
    secure: process.env.NODE_ENV !== "development",
  },
});
