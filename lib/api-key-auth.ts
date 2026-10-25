import { createHash } from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { ApiKey } from "@/lib/models";

export async function authenticateApiKey(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(df_live_[a-f0-9]{48})$/);
  if (!match) return null;

  await connectDB();
  const keyHash = createHash("sha256").update(match[1]).digest("hex");
  const key = await ApiKey.findOne({ keyHash, revokedAt: null }).select("+keyHash");
  if (!key) return null;

  key.lastUsedAt = new Date();
  await key.save();
  return { userId: String(key.userId), keyId: String(key._id) };
}
