import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateStory, revalidateAll } from "../../../../utils/cache";
import { isRevalidationRequestAuthorized } from "../../../../lib/request-security";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");
  const tag = searchParams.get("tag");

  if (!isRevalidationRequestAuthorized(secret)) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  try {
    if (slug) {
      if (slug === "all") {
        await revalidateAll();
        return NextResponse.json({ revalidated: true, type: "all" });
      }
      // Revalidate specific story
      await revalidateStory(slug);
      return NextResponse.json({ revalidated: true, slug });
    }

    if (tag) {
      revalidateTag(tag, "default");
      return NextResponse.json({ revalidated: true, tag });
    }

    // Default: revalidate everything if no specific slug/tag provided but authorized
    await revalidateAll();
    return NextResponse.json({ revalidated: true, type: "all" });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 },
    );
  }
}
