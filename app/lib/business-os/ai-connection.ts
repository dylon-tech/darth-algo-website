// Explicit owner-only diagnostic. Never generates output or returns credentials.
export async function checkAIConnection() {
  const checkedAt = new Date().toISOString();
  const key = process.env.OPENAI_API_KEY;
  const scope = "Model-list access only; generation permissions, billing and successful agent execution remain unverified.";
  if (!key) return { checkedAt, status: "credential_missing", scope };
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { checkedAt, status: response.status === 401 ? "authentication_rejected" : response.status === 403 ? "permission_denied" : "provider_unavailable", httpStatus: response.status, scope };
    const body = await response.json();
    if (!Array.isArray(body.data)) return { checkedAt, status: "invalid_provider_response", scope };
    const models = body.data.map((item: { id?: unknown }) => item?.id)
      .filter((id: unknown): id is string => typeof id === "string" && /^gpt-[a-zA-Z0-9.-]{1,80}$/.test(id)).sort();
    return { checkedAt, status: "model_list_verified", availableGPTModels: models,
      configuredModelAvailable: process.env.AI_OS_MODEL ? models.includes(process.env.AI_OS_MODEL) : null, scope };
  } catch { return { checkedAt, status: "connection_failed", scope }; }
}
