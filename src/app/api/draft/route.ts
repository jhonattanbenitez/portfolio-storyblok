import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import {
  createPreviewSession, getInternalPreviewPath, getRequestSecret, isDraftRequestAuthorized,
  PREVIEW_SESSION_COOKIE, PREVIEW_SESSION_SECONDS, SENSITIVE_RESPONSE_HEADERS,
} from "../../../../lib/request-security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = getRequestSecret(request);
  if (!isDraftRequestAuthorized(secret)) {
    return new Response("Invalid token", { status: 401, headers: SENSITIVE_RESPONSE_HEADERS });
  }

  const pathname = getInternalPreviewPath(searchParams.get("slug"));
  if (!pathname) {
    return new Response("Invalid preview path", { status: 400, headers: SENSITIVE_RESPONSE_HEADERS });
  }
  if (!process.env.STORYBLOK_PREVIEW_TOKEN) {
    return new Response("Preview is not configured", { status: 503, headers: SENSITIVE_RESPONSE_HEADERS });
  }

  try {
    const session = createPreviewSession();
    (await draftMode()).enable();
    const destination = new URL(pathname, request.url);
    // Keep the editor bridge context, never our authorization secret or arbitrary parameters.
    for (const [key, value] of searchParams) {
      if (/^_storyblok(?:$|_)/.test(key) && key.length <= 100 && value.length <= 4096) {
        destination.searchParams.append(key, value);
      }
    }
    const response = NextResponse.redirect(destination, {
      status: 307,
      headers: SENSITIVE_RESPONSE_HEADERS,
    });
    response.cookies.set(PREVIEW_SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: PREVIEW_SESSION_SECONDS,
    });
    return response;
  } catch {
    // Do not log framework/request errors that may include authorization data.
    return new Response("Preview could not be enabled", { status: 500, headers: SENSITIVE_RESPONSE_HEADERS });
  }
}
