import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { connectDB } from "@/lib/mongodb";
import { ApiRequestLog } from "@/lib/models";
import { checkRateLimit, jsonNoStoreHeaders } from "@/lib/security";

const schema = z.object({ data: z.unknown().optional() });

export async function POST(request: Request) {
  const started = Date.now();
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 16_384) {
    return NextResponse.json({ error: "Request too large." }, { status: 413, headers: jsonNoStoreHeaders() });
  }

  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json({ error: "Valid API key required." }, { status: 401, headers: jsonNoStoreHeaders() });
    }
    if (!(await checkRateLimit(request, `api-key-${auth.keyId}`, 60, 60_000))) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again shortly." }, { status: 429, headers: { ...jsonNoStoreHeaders(), "Retry-After": "60" } });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Body must be a valid JSON object." }, { status: 400, headers: jsonNoStoreHeaders() });
    }

    await connectDB();
    await ApiRequestLog.create({ userId: auth.userId, method: "POST", path: "/api/v1/echo", statusCode: 200, durationMs: Math.min(Date.now() - started, 600000) });
    return NextResponse.json({ ok: true, data: parsed.data.data ?? null, timestamp: new Date().toISOString() }, { headers: jsonNoStoreHeaders() });
  } catch {
    return NextResponse.json({ error: "API temporarily unavailable." }, { status: 503, headers: jsonNoStoreHeaders() });
  }
}
