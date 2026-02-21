// AI SDK chat API route — plumbing only
// To enable AI responses, install a model provider (e.g. @ai-sdk/openai)
// and uncomment the streamText call below.
//
// import { streamText } from "ai";
// import { openai } from "@ai-sdk/openai";

export async function POST() {
  // const { messages } = await request.json();
  //
  // const result = streamText({
  //   model: openai("gpt-4o-mini"),
  //   messages,
  // });
  //
  // return result.toDataStreamResponse();

  return Response.json(
    { error: "AI provider not configured yet" },
    { status: 501 },
  );
}
