const DEFAULT_TIMEOUT_MS = 2500;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function withOrigin(requestUrl, origin) {
  const src = new URL(requestUrl);
  const dst = new URL(origin);
  dst.pathname = src.pathname;
  dst.search = src.search;
  return dst.toString();
}

function isMutating(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

function copyHeaders(headers) {
  const out = new Headers(headers);
  out.set("X-Miron-Gateway", "cloudflare-worker");
  out.delete("Host");
  return out;
}

function addGatewayHeaders(response, target, fallbackReason = "") {
  const out = new Response(response.body, response);
  out.headers.set("X-Miron-Backend", target);
  if (fallbackReason) out.headers.set("X-Miron-Fallback-Reason", fallbackReason);
  return out;
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("gateway-timeout"), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function buildUpstreamRequest(incoming, origin, bodyBytes) {
  const method = incoming.method || "GET";
  const init = {
    method,
    headers: copyHeaders(incoming.headers),
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = bodyBytes;
  }
  return new Request(withOrigin(incoming.url, origin), init);
}

async function routeRequest(request, env) {
  const primaryOrigin = normalizeOrigin(env.PRIMARY_ORIGIN);
  const fallbackOrigin = normalizeOrigin(env.FALLBACK_ORIGIN);
  if (!primaryOrigin || !fallbackOrigin) {
    return new Response("Gateway env eksik: PRIMARY_ORIGIN / FALLBACK_ORIGIN", { status: 500 });
  }

  const timeoutMs = Number(env.PRIMARY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const method = request.method || "GET";
  const mutating = isMutating(method);
  const bodyBytes = mutating ? await request.clone().arrayBuffer() : undefined;

  try {
    const primaryReq = await buildUpstreamRequest(request, primaryOrigin, bodyBytes);
    const primaryRes = await fetchWithTimeout(primaryReq, timeoutMs);

    if (!RETRYABLE_STATUS.has(primaryRes.status)) {
      return addGatewayHeaders(primaryRes, "primary");
    }

    // For mutating requests, retrying after an upstream 500 can duplicate side
    // effects if the primary wrote to the shared DB before failing. Network
    // errors/timeouts below still fall back because there was no usable response.
    if (mutating && String(env.FALLBACK_ON_MUTATING_5XX || "false").toLowerCase() !== "true") {
      return addGatewayHeaders(primaryRes, "primary", "mutating-5xx-not-retried");
    }

    const fallbackReq = await buildUpstreamRequest(request, fallbackOrigin, bodyBytes);
    const fallbackRes = await fetchWithTimeout(fallbackReq, Number(env.FALLBACK_TIMEOUT_MS || 45000));
    return addGatewayHeaders(fallbackRes, "fallback", `primary-${primaryRes.status}`);
  } catch (err) {
    const fallbackReq = await buildUpstreamRequest(request, fallbackOrigin, bodyBytes);
    const fallbackRes = await fetchWithTimeout(fallbackReq, Number(env.FALLBACK_TIMEOUT_MS || 45000));
    const reason = err && err.name === "AbortError" ? "primary-timeout" : "primary-network-error";
    return addGatewayHeaders(fallbackRes, "fallback", reason);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return routeRequest(request, env);
    }

    const url = new URL(request.url);
    if (url.pathname === "/__gateway/health") {
      return Response.json({
        ok: true,
        primary: normalizeOrigin(env.PRIMARY_ORIGIN),
        fallback: normalizeOrigin(env.FALLBACK_ORIGIN),
      });
    }

    return routeRequest(request, env);
  },
};
