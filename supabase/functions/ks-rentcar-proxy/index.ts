import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const KS_BASE = "https://ks-rentcar.com";
const ALLOWED_PREFIXES = ["/estimate", "/lib/ajax/infoCar2024/"];

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cookie",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apikey = req.headers.get("apikey");
  const auth = req.headers.get("Authorization");
  if (!apikey && !auth) {
    return jsonResponse({ error: "Missing apikey or Authorization" }, 401);
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";
  if (!path || !isAllowedPath(path)) {
    return jsonResponse({ error: "Invalid or disallowed path" }, 400);
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const forwardHeaders: Record<string, string> = {
    "User-Agent":
      req.headers.get("User-Agent") ||
      "Mozilla/5.0 (compatible; PurpleLeaseSync/1.0)",
    Accept: req.headers.get("Accept") || "application/json, text/html, */*",
  };

  const contentType = req.headers.get("Content-Type");
  if (contentType) forwardHeaders["Content-Type"] = contentType;

  const cookie = req.headers.get("Cookie");
  if (cookie) forwardHeaders["Cookie"] = cookie;

  const targetUrl = KS_BASE + path;
  const init: RequestInit = { method: req.method, headers: forwardHeaders };

  if (req.method === "POST") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const responseHeaders = new Headers(corsHeaders);

    const upstreamContentType = upstream.headers.get("Content-Type");
    if (upstreamContentType) {
      responseHeaders.set("Content-Type", upstreamContentType);
    }

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return jsonResponse(
      { error: "upstream error", message: String(err) },
      447,
    );
  }
});
