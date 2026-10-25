import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";

export function createApiKey() {
  const raw = `df_live_${randomBytes(24).toString("hex")}`;
  return { raw, prefix: raw.slice(0, 15), hash: createHash("sha256").update(raw).digest("hex") };
}
export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
export function makeWebhookPath() { return randomBytes(18).toString("hex"); }

/**
 * Basic URL validation only. Not sufficient for a public production service:
 * DNS rebinding/private IP protections require resolving and validating every IP.
 */
export function safeUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP/HTTPS URLs are allowed.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host === "::1" || host === "0.0.0.0" || host.startsWith("127.") ||
      host.startsWith("10.") || host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) || (isIP(host) === 6 && (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")))) {
    throw new Error("Private/local network targets are not allowed.");
  }
  return url;
}
