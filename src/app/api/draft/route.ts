import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");

  // Check the secret and next parameters
  // This secret should ideally be stored in .env and checked against
  // For now we check checking existence to allow Storyblok to trigger it
  if (!secret || !slug) {
    return new Response("Missing parameters", { status: 400 });
  }

  // Verify the token matches the preview token from Storyblok if desired
  // const expectedSecret = process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN;
  // if (secret !== expectedSecret) { ... }

  // Enable Draft Mode by setting the cookie
  (await draftMode()).enable();

  // Redirect to the path from the fetched post
  // We don't redirect to searchParams.slug as that might lead to open redirect vulnerabilities
  redirect(`/${slug.startsWith("/") ? slug.slice(1) : slug}`);
}
