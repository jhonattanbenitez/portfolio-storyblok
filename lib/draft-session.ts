import { cookies, draftMode } from "next/headers";
import { isPreviewSessionAuthorized, PREVIEW_SESSION_COOKIE } from "./request-security";

/** Next.js deliberately relaxes its bypass cookie in development. Require our
 * expiring signed session in every environment before selecting draft content. */
export async function getAuthorizedDraftMode(): Promise<{ isEnabled: boolean }> {
  if (!(await draftMode()).isEnabled) return { isEnabled: false };
  const session = (await cookies()).get(PREVIEW_SESSION_COOKIE)?.value;
  return { isEnabled: isPreviewSessionAuthorized(session) };
}
