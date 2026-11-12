import {ownerSessionFromRequest, privateHeaders, sameOrigin} from '../../../lib/business-os/owner-session';
import {founderInbox, founderInboxDetail, updateFounderInbox, validInboxId} from '../../../lib/business-os/founder-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const headers = {...privateHeaders, 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie'};
const json = (value: unknown, status = 200) => Response.json(value, {status, headers});

export async function GET(request: Request) {
  if (!ownerSessionFromRequest(request)) return json({error: 'Unauthorized'}, 401);
  const id = new URL(request.url).searchParams.get('id');
  if (id !== null && !validInboxId(id)) return json({error: 'Invalid Inbox item'}, 400);
  try {
    if (id) {const detail = await founderInboxDetail(id); return detail ? json(detail) : json({error: 'Inbox item not found'}, 404);}
    const snapshot = await founderInbox(); return json(snapshot, snapshot.status === 'unavailable' ? 503 : 200);
  } catch {return json({error: 'Inbox records could not be read. No message was sent.'}, 503);}
}

export async function POST(request: Request) {
  if (!ownerSessionFromRequest(request)) return json({error: 'Unauthorized'}, 401);
  if (!sameOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) return json({error: 'Same-origin JSON required'}, 403);
  const raw = await request.text(); if (raw.length > 85000) return json({error: 'Draft is too large'}, 413);
  let body: unknown; try {body = JSON.parse(raw);} catch {return json({error: 'Invalid JSON'}, 400);}
  try {
    const result = await updateFounderInbox(body);
    return json(result, result.status === 'conflict' ? 409 : result.status === 'not_found' ? 404 : 200);
  } catch (error) {
    if (error instanceof Error && /^INVALID_/.test(error.message)) return json({error: 'Invalid Inbox change. Drafts are limited to 20,000 characters and snoozes to 30 days.'}, 400);
    return json({error: 'Save was not confirmed. Your draft has not been sent. Refresh the saved version before retrying.'}, 503);
  }
}
