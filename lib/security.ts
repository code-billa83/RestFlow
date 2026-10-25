import { createHash } from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { RateLimitBucket } from "@/lib/models";

/**
 * MongoDB-backed fixed-window limiter. For production, put the app behind a trusted
 * proxy and ensure it overwrites incoming forwarded-IP headers. A managed Redis
 * limiter is preferable for high-traffic / multi-region deployments.
 */
export async function checkRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs + 60_000);
  const digest = createHash("sha256").update(`${scope}:${ip}:${windowStart}`).digest("hex");
  await connectDB();
  const bucket = await RateLimitBucket.findOneAndUpdate(
    { key: digest },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return (bucket?.count ?? limit + 1) <= limit;
}

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase() &&
      ["http:", "https:"].includes(originUrl.protocol);
  } catch { return false; }
}

export function jsonNoStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
}
