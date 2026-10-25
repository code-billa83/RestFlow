"use client";
import { FormEvent, useState } from "react";
import { Play, Plus, RotateCcw, X } from "lucide-react";

type Header = { name: string; value: string };
type Result = {
  status: number; statusText: string; durationMs: number;
  headers: Record<string, string>; body: string; truncated: boolean;
};

const NO_BODY = ["GET", "HEAD", "OPTIONS"];
const SECRET_NAME = /auth|key|token|secret|password/i;

export function Playground() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [contentType, setContentType] = useState("application/json");
  const [body, setBody] = useState('{\n  "title": "DevFlow test",\n  "completed": false\n}');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hasBody = !NO_BODY.includes(method);

  function setHeader(i: number, patch: Partial<Header>) {
    setHeaders((old) => old.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  function format(text: string) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const sendBody = hasBody && body.trim() !== "";
      if (sendBody && contentType === "application/json") {
        try { JSON.parse(body); } catch { throw new Error("Body is not valid JSON."); }
      }
      const outHeaders = headers.filter((h) => h.name.trim());
      if (sendBody && !outHeaders.some((h) => h.name.trim().toLowerCase() === "content-type")) {
        outHeaders.push({ name: "Content-Type", value: contentType });
      }
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method, url,
          headers: outHeaders.map((h) => ({ name: h.name.trim(), value: h.value })),
          ...(sendBody ? { body } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setResult(data as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const status = result?.status ?? null;

  return (
    <div className="grid two-col" style={{ alignItems: "start" }}>
      <form className="card" onSubmit={send}>
        <div className="card-heading">
          <div><h2>Request builder</h2><p>Any public API: add your own URL and headers</p></div>
          <span className="badge">HTTP</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="method">Method</label>
            <select id="method" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ctype">Content type</label>
            <select id="ctype" className="select" value={contentType} onChange={(e) => setContentType(e.target.value)} disabled={!hasBody}>
              <option>application/json</option>
              <option>text/plain</option>
              <option>application/x-www-form-urlencoded</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="url">Request URL</label>
            <input id="url" className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
          </div>

          <div className="field full">
            <label>Headers</label>
            {headers.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="input" placeholder="Authorization" value={h.name} onChange={(e) => setHeader(i, { name: e.target.value })} autoComplete="off" />
                <input className="input" placeholder="Bearer sk-..." value={h.value}
                  type={SECRET_NAME.test(h.name) ? "password" : "text"} autoComplete="off"
                  onChange={(e) => setHeader(i, { value: e.target.value })} />
                <button type="button" className="btn" aria-label="Remove header" onClick={() => setHeaders((old) => old.filter((_, idx) => idx !== i))}><X size={14} /></button>
              </div>
            ))}
            <div className="inline-actions">
              <button type="button" className="btn" disabled={headers.length >= 20} onClick={() => setHeaders((old) => [...old, { name: "Authorization", value: "Bearer " }])}><Plus size={14} /> Bearer token</button>
              <button type="button" className="btn" disabled={headers.length >= 20} onClick={() => setHeaders((old) => [...old, { name: "", value: "" }])}><Plus size={14} /> Header</button>
            </div>
          </div>

          {hasBody && (
            <div className="field full">
              <label htmlFor="body">Body</label>
              <textarea id="body" className="textarea" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          )}
        </div>
        <div className="inline-actions" style={{ marginTop: 18 }}>
          <button className="btn primary" disabled={busy}><Play size={15} />{busy ? "Sending…" : "Send request"}</button>
          <button type="button" className="btn" onClick={() => { setResult(null); setError(""); }}><RotateCcw size={15} /> Clear</button>
        </div>
        <div className="callout" style={{ marginTop: 18 }}>
          Requests go through the DevFlow server, so CORS is not a problem. Your headers and keys are forwarded once and never stored or logged. Private/local addresses are blocked.
        </div>
      </form>

      <section className="card">
        <div className="card-heading">
          <div><h2>Response</h2><p>Body and timing</p></div>
          {status !== null && <span className={`badge ${status < 400 ? "success" : "error"}`}>{status} {result?.statusText}</span>}
        </div>
        {result && <p className="muted" style={{ fontSize: 12 }}>Completed in {result.durationMs} ms{result.truncated ? " · response truncated at 1 MB" : ""}</p>}
        {error && <div className="toast error">{error}</div>}
        <div className="response-box">{result ? (format(result.body) || "(empty body)") : "Your response will appear here after you send a request."}</div>
        {result && (
          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>Response headers ({Object.keys(result.headers).length})</summary>
            <div className="response-box" style={{ marginTop: 8 }}>{Object.entries(result.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}</div>
          </details>
        )}
      </section>
    </div>
  );
}
