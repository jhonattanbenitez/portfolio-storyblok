import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateStory, revalidateAll } from "../../../../utils/cache";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");
  const tag = searchParams.get("tag");

  // Check for valid secret
  // Using the preview token as a simple shared secret for now
  if (secret !== process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN) {
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
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 },
    );
  }
}
