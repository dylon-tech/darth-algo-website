import { createHash } from "node:crypto";

// Fixed, owner-supplied assets. Pre-rendered at build time and served from the
// Darth Algo domain, without relying on a browser to reach third-party storage.
// No user-controlled URLs, uploads, image generation, or photo retouching.
const assets = {
  "dylon-d-feagin.jpg": {
    url: "https://d2ol7oe51mr4n9.cloudfront.net/user_3GjCrDqrkf77RLg2koyExGkjpYm/717cb5a4-3804-479a-8783-ed2c8c4441a3.jpg",
    sha256: "0f03065a7a637cc19dd0031429a52048b768f2c50fdb4b513c8f8b05d4822bca",
    type: "image/jpeg",
  },
  "darth-algo-dark.png": {
    url: "https://d2ol7oe51mr4n9.cloudfront.net/user_3GjCrDqrkf77RLg2koyExGkjpYm/c2a82107-f041-4801-a432-fc6a05f0aeae.png",
    sha256: "4401f07347f7eab6f30d8f468cafee33c69de17d181f4ecccbb0af87611043f1",
    type: "image/png",
  },
  "darth-algo-color.jpg": {
    url: "https://d2ol7oe51mr4n9.cloudfront.net/user_3GjCrDqrkf77RLg2koyExGkjpYm/e8cea262-a83c-42d9-b081-1ad164f2185f.jpg",
    sha256: "f0f3db4f49a31c0e6fc96d2a0f03723d28a5636f4f32c4b9582c8bc8599a608f",
    type: "image/jpeg",
  },
} as const;

export const runtime = "nodejs";
export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return Object.keys(assets).map((asset) => ({ asset }));
}

export async function GET(_request: Request, context: { params: Promise<{ asset: string }> }) {
  const { asset } = await context.params;
  if (!Object.prototype.hasOwnProperty.call(assets, asset)) return new Response("Not found", { status: 404 });
  const source = assets[asset as keyof typeof assets];
  const response = await fetch(source.url, { cache: "force-cache", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Founder asset unavailable: ${asset} (${response.status})`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 2000000 || bytes.byteLength < 1000) throw new Error(`Invalid founder asset size: ${asset}`);
  if (createHash("sha256").update(new Uint8Array(bytes)).digest("hex") !== source.sha256) {
    throw new Error(`Founder asset integrity check failed: ${asset}`);
  }
  return new Response(bytes, { headers: {
    "Content-Type": source.type,
    "Cache-Control": "public, max-age=86400, s-maxage=31536000",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${asset}"`,
  } });
}
