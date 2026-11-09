import sharp from "sharp";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Approved public marketing artwork only. Never proxy arbitrary user-supplied URLs.
const approved = new Set([
  "15753028436556487640",
  "13145937750832167253",
  "3767173514113528782",
  "11670916572289699645",
  "50167249629891780",
  "14081559702631680833",
  "17434458873724434204",
  "275772194590970574",
  "11397569345958893021",
  "9945259486736171954",
  "506703163318931102",
  "15251336822011047386",
  "12607026009977007160",
  "5464968098393977522",
  "14488729839401166423",
  "14429534827682332401",
  "9181469478710197451",
  "17795605195540888306",
  "8506514334627426578"
]);
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1080;
const MAX_ORIGIN_BYTES = 9 * 1024 * 1024;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  if (!approved.has(mediaId)) {
    return NextResponse.json({ error: "Unknown approved media" }, { status: 404 });
  }

  try {
    const origin = `https://static.metricool.com/planner/202611/6883362-file-${mediaId}.png`;
    const response = await fetch(origin, {
      headers: { Accept: "image/png" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("image/")) {
      throw new Error("Approved artwork cannot be retrieved");
    }
    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.length < 32 || raw.length > MAX_ORIGIN_BYTES) {
      throw new Error("Approved artwork outside limits");
    }

    // Square padding preserves every original chart label while meeting
    // Instagram's JPEG-only, 4:5..1.91:1 image publication requirements.
    const converted = await sharp(raw, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
        fit: "contain",
        background: "#0a0d14",
        withoutEnlargement: false,
      })
      .jpeg({ quality: 87, mozjpeg: true })
      .toBuffer();

    if (new URL(request.url).searchParams.get("inspect") === "1") {
      return NextResponse.json({
        ok: true,
        mediaType: "image/jpeg",
        bytes: converted.length,
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        source: "approved_public_artwork",
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return new Response(new Uint8Array(converted), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Disposition": `inline; filename="darth-algo-${mediaId}.jpg"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media temporarily unavailable" }, { status: 503 });
  }
}
