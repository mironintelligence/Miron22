import worker from "./worker.js";

const primary = process.env.PRIMARY_ORIGIN || "https://shareware-disciplinary-trends-avoid.trycloudflare.com";
const fallback = process.env.FALLBACK_ORIGIN || "https://miron22.onrender.com";
const gatewayEnv = {
  PRIMARY_ORIGIN: primary,
  FALLBACK_ORIGIN: fallback,
  PRIMARY_TIMEOUT_MS: process.env.PRIMARY_TIMEOUT_MS || "2500",
  FALLBACK_TIMEOUT_MS: process.env.FALLBACK_TIMEOUT_MS || "45000",
  FALLBACK_ON_MUTATING_5XX: "false",
};

async function check(name, request, env = gatewayEnv) {
  const res = await worker.fetch(request, env);
  const text = await res.text();
  console.log(`${name}: ${res.status} backend=${res.headers.get("X-Miron-Backend") || "-"} reason=${res.headers.get("X-Miron-Fallback-Reason") || "-"}`);
  if (!res.ok) {
    throw new Error(`${name} failed: ${res.status} ${text.slice(0, 500)}`);
  }
  return { res, text };
}

await check("primary health", new Request("https://api.mironintelligence.com/api/health"));
await check(
  "fallback health",
  new Request("https://api.mironintelligence.com/api/health"),
  { ...gatewayEnv, PRIMARY_ORIGIN: "http://127.0.0.1:1", PRIMARY_TIMEOUT_MS: "500" },
);
await check("gateway health", new Request("https://api.mironintelligence.com/__gateway/health"));
