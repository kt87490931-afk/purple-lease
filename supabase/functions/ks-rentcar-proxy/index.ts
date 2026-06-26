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

async function forwardToKs(
  method: string,
  path: string,
  body: string | null,
  req: Request,
  wrapJson: boolean,
): Promise<Response> {
  if (!path || !isAllowedPath(path)) {
    return jsonResponse({ error: "Invalid or disallowed path", path }, 400);
  }
  if (method !== "GET" && method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const forwardHeaders: Record<string, string> = {
    "User-Agent":
      req.headers.get("User-Agent") ||
      "Mozilla/5.0 (compatible; PurpleLeaseSync/1.0)",
    Accept: req.headers.get("Accept") || "application/json, text/html, */*",
  };

  if (method === "POST" && body != null) {
    forwardHeaders["Content-Type"] =
      "application/x-www-form-urlencoded; charset=UTF-8";
  }

  const cookie = req.headers.get("Cookie");
  if (cookie) forwardHeaders["Cookie"] = cookie;

  const init: RequestInit = { method, headers: forwardHeaders };
  if (method === "POST" && body != null) init.body = body;

  const upstream = await fetch(KS_BASE + path, init);
  const text = await upstream.text();
  const upstreamContentType =
    upstream.headers.get("Content-Type") || "text/plain";

  if (wrapJson) {
    return jsonResponse(
      {
        _purpleProxy: true,
        status: upstream.status,
        contentType: upstreamContentType,
        body: text,
      },
      upstream.status >= 400 ? upstream.status : 200,
    );
  }

  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set("Content-Type", upstreamContentType);
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) responseHeaders.set("set-cookie", setCookie);

  return new Response(text, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (!req.headers.get("apikey") && !req.headers.get("Authorization")) {
    return jsonResponse({ error: "Missing apikey or Authorization" }, 401);
  }

  try {
    const contentType = req.headers.get("Content-Type") || "";

    if (req.method === "POST" && contentType.indexOf("application/json") >= 0) {
      const text = await req.text();
      let payload: { method?: string; path?: string; body?: string | null } =
        {};
      try {
        payload = JSON.parse(text || "{}");
      } catch (_) {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
      return await forwardToKs(
        payload.method || "POST",
        payload.path || "",
        payload.body != null ? String(payload.body) : null,
        req,
        true,
      );
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";
    const body = req.method === "POST" ? await req.text() : null;
    return await forwardToKs(req.method, path, body, req, false);
  } catch (err) {
    return jsonResponse({ error: "upstream error", message: String(err) }, 502);
  }
});
