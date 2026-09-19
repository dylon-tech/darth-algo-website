// This payload is also the owner-visible contract. No model proposal is executable
// unless it was separately prepared through the authenticated X composer.
export function bufferPublicationPayload(text: string, channelId: string, channelName: string) {
  if (typeof text !== "string" || !text.trim() || text !== text.trim() || text.length > 280) throw new Error("BUFFER_PUBLICATION_TEXT_INVALID");
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(channelId) || typeof channelName !== "string" || !channelName.trim() || channelName.length > 200) throw new Error("BUFFER_PUBLICATION_CHANNEL_INVALID");
  return {
    kind: "publishing" as const, executor: "buffer_x_v1" as const, policyVersion: 1,
    channelId, channelName, text, mode: "shareNow" as const,
    summary: `Publish now on X: ${channelName}`,
    details: `Account: ${channelName}\nAction: Publish this exact text publicly now.\n\n${text}`,
    evidence: ["buffer_draft_test_verified"],
  };
}
export type BufferPublication = ReturnType<typeof bufferPublicationPayload>;

export function isBufferPublication(value: unknown): value is BufferPublication {
  if (!value || typeof value !== "object") return false;
  const p = value as BufferPublication;
  try {
    const canonical = bufferPublicationPayload(p.text, p.channelId, p.channelName);
    return Object.keys(p).length === Object.keys(canonical).length && Object.entries(canonical).every(([key, v]) => JSON.stringify(p[key as keyof BufferPublication]) === JSON.stringify(v));
  } catch { return false; }
}
