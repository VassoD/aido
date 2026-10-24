// Plays a multi-turn conversation against the local chat API, keeping full UI messages between turns.
import { readUIMessageStream } from "ai";

const turns = process.argv.slice(2);
const messages = [];
for (const [index, text] of turns.entries()) {
  messages.push({ id: `u${index}`, role: "user", parts: [{ type: "text", text }] });
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale: "fr", country: "FR", messages }),
  });
  const sse = response.body.pipeThrough(new TextDecoderStream());
  const chunks = new ReadableStream({
    async start(controller) {
      let buffer = "";
      for await (const piece of sse) {
        buffer += piece;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") controller.enqueue(JSON.parse(line.slice(6)));
        }
      }
      controller.close();
    },
  });
  let last;
  for await (const message of readUIMessageStream({ stream: chunks })) last = message;
  messages.push(last);
  console.log(`\n=== turn ${index + 1}: ${text}`);
  for (const part of last.parts) {
    if (part.type === "text") console.log("TEXT:", part.text.trim());
    else if (part.type?.startsWith("tool-")) {
      const name = part.type.slice(5);
      if (name === "draftApplication" && part.output) {
        console.log("DRAFT CARD:", JSON.stringify({ mission: part.output.mission?.title, firstName: part.output.firstName, city: part.output.city, answers: part.output.answers.map((a) => `${a.question} => ${a.answer}`), motivation: part.output.motivation }, null, 2));
      } else console.log("TOOL:", name, part.state);
    }
  }
}
