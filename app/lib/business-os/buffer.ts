type BufferGraphQLResponse<T> = { data?: T; errors?: Array<{ message?: string }> };

function token() {
  const value = process.env.BUFFER_API_KEY?.trim();
  if (!value) throw new Error("BUFFER_API_KEY_MISSING");
  return value;
}

async function bufferGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`BUFFER_HTTP_${response.status}`);
  const body = await response.json() as BufferGraphQLResponse<T>;
  if (body.errors?.length) throw new Error("BUFFER_GRAPHQL_ERROR");
  if (!body.data) throw new Error("BUFFER_EMPTY_RESPONSE");
  return body.data;
}

export type BufferChannel = {
  id: string;
  name?: string | null;
  displayName?: string | null;
  service?: string | null;
  isQueuePaused?: boolean | null;
};

export async function bufferStatus() {
  if (!process.env.BUFFER_API_KEY) return { configured: false, connected: false, xChannel: null as BufferChannel | null };
  const account = await bufferGraphQL<{ account: { organizations: Array<{ id: string }> } }>(`
    query BufferOrganizations {
      account { organizations { id } }
    }
  `);
  const organizationId = account.account?.organizations?.[0]?.id;
  if (!organizationId) return { configured: true, connected: true, xChannel: null as BufferChannel | null };
  const channels = await bufferGraphQL<{ channels: BufferChannel[] }>(`
    query BufferChannels($organizationId: ID!) {
      channels(input: { organizationId: $organizationId }) {
        id
        name
        displayName
        service
        isQueuePaused
      }
    }
  `, { organizationId });
  const xChannel = channels.channels.find(channel => ["twitter","x"].includes(String(channel.service || "").toLowerCase())) || null;
  return { configured: true, connected: true, organizationId, xChannel, channels: channels.channels };
}

function gqlString(value: string) {
  return JSON.stringify(value);
}

export async function createBufferXPost(input: { text: string; mode?: "addToQueue" | "shareNow" | "shareNext"; channelId?: string }) {
  if (!input.text?.trim()) throw new Error("BUFFER_POST_TEXT_REQUIRED");
  if (input.text.length > 12000) throw new Error("BUFFER_POST_TEXT_TOO_LONG");
  const state = await bufferStatus();
  const channelId = input.channelId || state.xChannel?.id;
  if (!channelId) throw new Error("BUFFER_X_CHANNEL_NOT_FOUND");
  const mode = input.mode || "addToQueue";
  const query = `
    mutation BufferCreatePost {
      createPost(input: {
        text: ${gqlString(input.text)}
        channelId: ${gqlString(channelId)}
        schedulingType: automatic
        mode: ${mode}
      }) {
        ... on PostActionSuccess {
          post { id text dueAt }
        }
        ... on MutationError { message }
      }
    }
  `;
  const data = await bufferGraphQL<{ createPost: { post?: { id: string; text: string; dueAt?: string | null }; message?: string } }>(query);
  if (!data.createPost?.post) throw new Error(data.createPost?.message ? "BUFFER_POST_REJECTED" : "BUFFER_POST_FAILED");
  return data.createPost.post;
}
