type Person = { id?: number; is_bot?: boolean };
type Message = { from?: Person; chat?: { id?: number; type?: string }; text?: string; message_id?: number };
export type OwnerUpdate = { update_id: number; message?: Message; callback_query?: { id?: string; from?: Person; data?: string; message?: Message } };
export function isPrivateOwnerUpdate(update: OwnerUpdate, owner: string | undefined) {
  if (!owner || !Number.isSafeInteger(update?.update_id)) return false;
  const actor = update.callback_query?.from || update.message?.from;
  const chat = (update.callback_query?.message || update.message)?.chat;
  return Boolean(actor && !actor.is_bot && String(actor.id) === owner && chat?.type === "private" && String(chat.id) === owner);
}
