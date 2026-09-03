import { publishEducationPost } from "../../../lib/community-education";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await publishEducationPost();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Community education cron failed", error);
    return Response.json({ ok: false, error: "Education post failed" }, { status: 500 });
  }
}
