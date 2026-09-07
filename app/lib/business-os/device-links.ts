import { randomBytes, randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { deviceLinkDigest } from "./device-link-policy";

export async function createDeviceLink(origin: string) {
  const url = new URL(origin);
  if (url.protocol !== "https:" && !["localhost","127.0.0.1"].includes(url.hostname)) throw new Error("HTTPS_REQUIRED");
  const token = randomBytes(32).toString("hex");
  const hash = deviceLinkDigest(token,process.env.AI_OS_OWNER_KEY);
  const id = randomUUID();
  const expiresAt = new Date(Date.now()+24*60*60*1000);
  await db().begin(async tx => {
    await tx`select pg_advisory_xact_lock(730920)`;
    await tx`update os_device_links set revoked_at=now() where used_at is null and revoked_at is null`;
    await tx`insert into os_device_links(id,token_hash,expires_at) values(${id},${hash},${expiresAt})`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','device_link_created',${id},'{"expiresInHours":24}'::jsonb)`;
  });
  // Fragment stays out of HTTP access logs and Referer headers. Never log it.
  return {url:`${url.origin}/owner/connect#${token}`,expiresAt:expiresAt.toISOString()};
}
export async function consumeDeviceLink(token: string) {
  const hash = deviceLinkDigest(token,process.env.AI_OS_OWNER_KEY);
  return db().begin(async tx => {
    const [link] = await tx`update os_device_links set used_at=now() where token_hash=${hash} and used_at is null and revoked_at is null and expires_at>now() returning id`;
    if (!link) throw new Error("DEVICE_LINK_UNAVAILABLE");
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','device_connected',${link.id},'{}'::jsonb)`;
  });
}
