import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateStory, revalidateAll } from "../../../../utils/cache";
import { getRequestSecret, isRevalidationRequestAuthorized, SENSITIVE_RESPONSE_HEADERS } from "../../../../lib/request-security";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = getRequestSecret(request);
  const slug = searchParams.get("slug");
  const tag = searchParams.get("tag");

  if (!isRevalidationRequestAuthorized(secret)) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401, headers: SENSITIVE_RESPONSE_HEADERS });
  }

  try {
    if (slug) {
      if (slug === "all") {
        await revalidateAll();
        return NextResponse.json({ revalidated: true, type: "all" }, { headers: SENSITIVE_RESPONSE_HEADERS });
      }
      // Revalidate specific story
      await revalidateStory(slug);
      return NextResponse.json({ revalidated: true, slug }, { headers: SENSITIVE_RESPONSE_HEADERS });
    }

    if (tag) {
      revalidateTag(tag, "default");
      return NextResponse.json({ revalidated: true, tag }, { headers: SENSITIVE_RESPONSE_HEADERS });
    }

    // Default: revalidate everything if no specific slug/tag provided but authorized
    await revalidateAll();
    return NextResponse.json({ revalidated: true, type: "all" }, { headers: SENSITIVE_RESPONSE_HEADERS });
  } catch {
    console.error("Revalidation failed");
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500, headers: SENSITIVE_RESPONSE_HEADERS },
    );
  }
}
