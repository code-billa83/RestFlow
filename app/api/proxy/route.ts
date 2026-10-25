import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ApiRequestLog } from "@/lib/models";
import { checkRateLimit, jsonNoStoreHeaders, sameOriginRequest } from "@/lib/security";
import { ProxyError, proxyRequest } from "@/lib/proxy";

export const runtime = "nodejs";

const schema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z.string().url().max(2000),
  headers: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/),
        value: z.string().max(4000).regex(/^[^\r\n]*$/)
      })
    )
    .max(20)
    .default([]),
  body: z.string().max(100_000).optional()
});

export async function POST(request: Request) {
  const h = jsonNoStoreHeaders();
  if (!sameOriginRequest(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers: h });
  if (Number(request.headers.get("content-length") || 0) > 150_000) {
    return NextResponse.json({ error: "Request too large." }, { status: 413, headers: h });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: h });

  if (!(await checkRateLimit(request, `proxy-${user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429, headers: { ...h, "Retry-After": "60" } });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request. Check URL, method and headers." }, { status: 400, headers: h });
  const { method, headers, body } = parsed.data;

  let url: URL;
  try { url = new URL(parsed.data.url); } catch { return NextResponse.json({ error: "Invalid URL." }, { status: 400, headers: h }); }

  const started = Date.now();
  try {
    const result = await proxyRequest({
      url,
      method,
      headers: Object.fromEntries(headers.map((x) => [x.name, x.value])),
      body
    });
    const durationMs = Math.min(Date.now() - started, 600000);

    // Log only host + path. Never log query strings, headers or bodies: they may contain API keys.
    try {
      await connectDB();
      await ApiRequestLog.create({
        userId: user.id,
        method,
        path: `${url.hostname}${url.pathname}`.slice(0, 500),
        statusCode: Math.min(Math.max(result.status, 100), 599),
        durationMs
      });
    } catch { /* logging must never break the response */ }

    return NextResponse.json({ ...result, durationMs }, { headers: h });
  } catch (err) {
    if (err instanceof ProxyError) return NextResponse.json({ error: err.message }, { status: err.status, headers: h });
    return NextResponse.json({ error: "Proxy error." }, { status: 502, headers: h });
  }
}
