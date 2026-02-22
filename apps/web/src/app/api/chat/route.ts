import { env } from "@omniscient/env/web";

const REQUEST_HEADERS_TO_FORWARD = [
  "content-type",
  "cookie",
  "authorization",
  "x-vercel-ai-ui-message-stream",
  "x-vercel-ai-data-stream",
];

const RESPONSE_HEADERS_TO_FORWARD = [
  "content-type",
  "x-vercel-ai-ui-message-stream",
  "x-vercel-ai-data-stream",
];

export async function POST(request: Request) {
  try {
    const headers = new Headers();
    for (const header of REQUEST_HEADERS_TO_FORWARD) {
      const value = request.headers.get(header);
      if (value) headers.set(header, value);
    }

    const body = await request.text();

    const upstream = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/chat`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    for (const header of RESPONSE_HEADERS_TO_FORWARD) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: "chat backend is unreachable" }, { status: 502 });
  }
}
