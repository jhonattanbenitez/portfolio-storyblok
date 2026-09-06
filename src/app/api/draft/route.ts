import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { isDraftRequestAuthorized } from "../../../../lib/request-security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing parameters", { status: 400 });
  }
  if (!isDraftRequestAuthorized(secret)) {
    return new Response("Invalid token", { status: 401 });
  }

  // Enable Draft Mode by setting the cookie
  (await draftMode()).enable();

  // Redirect to the path from the fetched post
  // We don't redirect to searchParams.slug as that might lead to open redirect vulnerabilities
  redirect(`/${slug.startsWith("/") ? slug.slice(1) : slug}`);
}
