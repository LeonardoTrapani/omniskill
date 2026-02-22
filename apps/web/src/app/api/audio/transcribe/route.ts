import { env } from "@omniscient/env/web";

const HEADERS_TO_FORWARD = ["cookie", "authorization"];

export async function POST(request: Request) {
  try {
    const headers = new Headers();
    for (const header of HEADERS_TO_FORWARD) {
      const value = request.headers.get(header);
      if (value) headers.set(header, value);
    }

    const body = await request.formData();

    const upstream = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/audio/transcribe`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ error: "transcription backend is unreachable" }, { status: 502 });
  }
}
