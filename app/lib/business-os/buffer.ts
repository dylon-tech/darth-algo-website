type BufferGraphQLResponse<T> = { data?: T; errors?: Array<{ message?: string }> };

async function bufferGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const key = process.env.BUFFER_API_KEY?.trim();
  if (!key) throw new Error("BUFFER_API_KEY_MISSING");
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }), cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  // Never retry writes or return provider error text (which can echo credentials/content).
  if (!response.ok) throw new Error(`BUFFER_HTTP_${response.status}`);
  const body = await response.json() as BufferGraphQLResponse<T>;
  if (body.errors?.length) throw new Error("BUFFER_GRAPHQL_ERROR");
  if (!body.data) throw new Error("BUFFER_EMPTY_RESPONSE");
  return body.data;
}

export type BufferChannel = {
  id: string;
  organizationId?: string;
  name?: string | null;
  displayName?: string | null;
  service?: string | null;
  isDisconnected: boolean;
  isLocked: boolean;
  isQueuePaused: boolean;
};
export type BufferConnection = {
  configured: boolean; connected: boolean; ready: boolean;
  xChannel: BufferChannel | null; channels: BufferChannel[]; error?: string;
};

export async function bufferStatus(): Promise<BufferConnection> {
  const state: BufferConnection = { configured: Boolean(process.env.BUFFER_API_KEY?.trim()), connected: false, ready: false, xChannel: null, channels: [] };
  if (!state.configured) return { ...state, error: "BUFFER_API_KEY_MISSING" };
  const account = await bufferGraphQL<{ account: { organizations: Array<{ id: string }> } }>(`
    query BufferOrganizations { account { organizations { id } } }
  `);
  const organizations = account.account?.organizations || [];
  if (organizations.length > 10) throw new Error("BUFFER_ORGANIZATION_LIMIT");
  // A valid key does not mean an X account is available or authorized for posting.
  const channelGroups = await Promise.all(organizations.map(async organization => {
    const result = await bufferGraphQL<{ channels: BufferChannel[] }>(`
      query BufferChannels($input: ChannelsInput!) {
        channels(input: $input) { id name displayName service isDisconnected isLocked isQueuePaused }
      }
    `, { input: { organizationId: organization.id } });
    return result.channels.map(channel => ({ ...channel, organizationId: organization.id }));
  }));
  state.channels = channelGroups.flat();
  state.connected = true;
  const candidates = state.channels.filter(channel => ["twitter", "x"].includes(String(channel.service).toLowerCase()));
  const pinnedId = process.env.BUFFER_X_CHANNEL_ID?.trim();
  state.xChannel = pinnedId ? candidates.find(channel => channel.id === pinnedId) || null : candidates.length === 1 ? candidates[0] : null;
  state.error = !state.xChannel ? candidates.length > 1 && !pinnedId ? "BUFFER_X_CHANNEL_AMBIGUOUS" : "BUFFER_X_CHANNEL_MISSING"
    : state.xChannel.isDisconnected !== false ? "BUFFER_X_DISCONNECTED"
    : state.xChannel.isLocked !== false ? "BUFFER_X_LOCKED"
    : state.xChannel.isQueuePaused !== false ? "BUFFER_X_QUEUE_PAUSED" : undefined;
  state.ready = !state.error;
  return state;
}

export type BufferPost = {
  id: string; text: string; channelId: string; status: string;
  dueAt?: string | null; sentAt?: string | null;
};

export async function getBufferPost(id: string): Promise<BufferPost> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("BUFFER_POST_ID_INVALID");
  const data = await bufferGraphQL<{ post: BufferPost }>(`
    query BufferPost($input: PostInput!) {
      post(input: $input) { id text channelId status dueAt sentAt }
    }
  `, { input: { id } });
  return data.post;
}

// Internal adapter only. Public scheduling must be called from a durable,
// exact-payload approved executor. Draft is the safe default.
export async function createBufferXPost(input: {
  text: string; channelId: string; saveToDraft?: boolean;
  mode?: "addToQueue" | "shareNow" | "shareNext";
}): Promise<BufferPost> {
  if (typeof input.text !== "string" || !input.text.trim()) throw new Error("BUFFER_POST_TEXT_REQUIRED");
  if (input.text.length > 12000) throw new Error("BUFFER_POST_TEXT_TOO_LONG");
  const mode = input.mode || "addToQueue";
  if (!["addToQueue", "shareNow", "shareNext"].includes(mode)) throw new Error("BUFFER_POST_MODE_INVALID");
  if (input.saveToDraft !== undefined && typeof input.saveToDraft !== "boolean") throw new Error("BUFFER_DRAFT_FLAG_INVALID");
  const state = await bufferStatus();
  if (!state.ready || !state.xChannel) throw new Error(state.error || "BUFFER_X_NOT_READY");
  if (input.channelId !== state.xChannel.id) throw new Error("BUFFER_X_CHANNEL_MISMATCH");
  const data = await bufferGraphQL<{ createPost: { post?: BufferPost } }>(`
    mutation BufferCreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text channelId status dueAt sentAt } }
        ... on MutationError { message }
      }
    }
  `, { input: { text: input.text, channelId: input.channelId, assets: [], needsApproval: false,
    saveToDraft: input.saveToDraft ?? true, schedulingType: "automatic", mode } });
  if (!data.createPost?.post?.id) throw new Error("BUFFER_POST_REJECTED");
  return data.createPost.post;
}
