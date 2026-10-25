import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

const MAX_RESPONSE_BYTES = 1_000_000; // 1 MB
const TIMEOUT_MS = 15_000;

export class ProxyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ProxyInput = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

export type ProxyOutput = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
};

const BLOCKED_REQUEST_HEADERS = new Set([
  "host", "content-length", "connection", "upgrade", "transfer-encoding", "te",
  "trailer", "keep-alive", "proxy-authorization", "proxy-connection", "expect"
]);

/** Only for local development: ALLOW_PRIVATE_PROXY=true lets you test APIs on localhost. Ignored in production. */
function allowPrivate() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_PRIVATE_PROXY === "true";
}

function isPrivateV4(ip: string) {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) {
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateV4(mapped[1]);
    const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    if (ip.startsWith("::")) return true; // ::, ::1, IPv4-compatible
    const first = parseInt(ip.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (ip.startsWith("64:ff9b:") || ip.startsWith("2001:db8:") || ip.startsWith("2001:0db8:")) return true;
    return false;
  }
  return true; // not a valid IP -> block
}

/**
 * DNS lookup that validates the *resolved* IPs at connection time.
 * This closes the DNS-rebinding gap: the IP we check is the IP we connect to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeLookup: any = (hostname: string, options: any, callback: any) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = (addresses as any) as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      return callback(new Error("BLOCKED_ADDRESS"), "", 0);
    }
    if (options?.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
};

function mapError(err: unknown): ProxyError {
  const e = err as NodeJS.ErrnoException;
  if (e?.message === "BLOCKED_ADDRESS") return new ProxyError("Private/local network targets are not allowed.");
  switch (e?.code) {
    case "ENOTFOUND":
    case "EAI_AGAIN": return new ProxyError("Host not found. Check the URL.", 502);
    case "ECONNREFUSED": return new ProxyError("Connection refused by the target server.", 502);
    case "ECONNRESET": return new ProxyError("Connection was reset by the target server.", 502);
    case "CERT_HAS_EXPIRED":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE": return new ProxyError("TLS certificate of the target is not valid.", 502);
    default: return new ProxyError("Request to the target failed.", 502);
  }
}

export function proxyRequest(input: ProxyInput): Promise<ProxyOutput> {
  return new Promise((resolve, reject) => {
    const { url, method, body } = input;
    if (!["http:", "https:"].includes(url.protocol)) return reject(new ProxyError("Only HTTP/HTTPS URLs are allowed."));
    if (url.username || url.password) return reject(new ProxyError("Do not put credentials in the URL. Use a header instead."));
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const privateOk = allowPrivate();
    if (!privateOk && isIP(host) && isPrivateAddress(host)) {
      return reject(new ProxyError("Private/local network targets are not allowed."));
    }

    const headers: Record<string, string> = {
      "User-Agent": "DevFlow-Playground/1.0",
      Accept: "*/*",
      "Accept-Encoding": "identity"
    };
    for (const [name, value] of Object.entries(input.headers)) {
      if (!BLOCKED_REQUEST_HEADERS.has(name.toLowerCase())) headers[name] = value;
    }
    const hasBody = body !== undefined && body !== "" && !["GET", "HEAD"].includes(method);
    if (hasBody) headers["Content-Length"] = String(Buffer.byteLength(body as string));

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: host,
        port: url.port || undefined,
        path: url.pathname + url.search,
        method,
        headers,
        lookup: privateOk ? undefined : safeLookup
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        let truncated = false;

        const done = () =>
          finish(() => {
            const outHeaders: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) {
              if (v !== undefined) outHeaders[k] = Array.isArray(v) ? v.join(", ") : String(v);
            }
            const type = outHeaders["content-type"] || "";
            const buf = Buffer.concat(chunks);
            const textual = !type || /text|json|xml|javascript|html|yaml|csv|x-www-form-urlencoded/i.test(type);
            resolve({
              status: res.statusCode || 0,
              statusText: res.statusMessage || "",
              headers: outHeaders,
              body: textual ? buf.toString("utf8") : `[Binary content (${type}), ${buf.length} bytes - not shown]`,
              truncated
            });
          });

        res.on("data", (chunk: Buffer) => {
          if (truncated) return;
          total += chunk.length;
          if (total > MAX_RESPONSE_BYTES) {
            chunks.push(chunk.subarray(0, chunk.length - (total - MAX_RESPONSE_BYTES)));
            truncated = true;
            res.destroy();
            done();
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", done);
        res.on("error", (err) => finish(() => reject(mapError(err))));
      }
    );

    const timer = setTimeout(() => {
      req.destroy();
      finish(() => reject(new ProxyError("The target server took too long to respond (15s).", 504)));
    }, TIMEOUT_MS);

    req.on("error", (err) => finish(() => reject(mapError(err))));
    if (hasBody) req.write(body);
    req.end();
  });
}
