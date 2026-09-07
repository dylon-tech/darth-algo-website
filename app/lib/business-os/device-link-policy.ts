import { createHmac } from "node:crypto";
export function deviceLinkDigest(token: string, key: string | undefined) {
  if (!/^[a-f0-9]{64}$/.test(token) || !key || key.length < 32) throw new Error("INVALID_DEVICE_LINK");
  return createHmac("sha256",key).update(`darth-owner-device-v1:${token}`).digest("hex");
}
