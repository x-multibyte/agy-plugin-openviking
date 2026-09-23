import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractUserPrompt, parseAgyTranscript } from "../servers/agy-transcript.mjs";

describe("Antigravity Transcript Parser", () => {
  it("extracts clean user prompt from XML-wrapped USER_REQUEST", () => {
    const raw = `<USER_REQUEST>
Build a login page in React
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-23T15:00:00+08:00
</ADDITIONAL_METADATA>`;
    const prompt = extractUserPrompt(raw);
    assert.equal(prompt, "Build a login page in React");
  });

  it("handles plain text input when tags are absent", () => {
    const raw = "How to configure Docker compose?";
    const prompt = extractUserPrompt(raw);
    assert.equal(prompt, "How to configure Docker compose?");
  });

  it("parses multi-turn JSONL into standard user and assistant turns", () => {
    const jsonl = [
      JSON.stringify({
        step_index: 0,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        content: "<USER_REQUEST>Deploy app to Kubernetes</USER_REQUEST>"
      }),
      JSON.stringify({
        step_index: 1,
        source: "SYSTEM_SDK",
        type: "EPHEMERAL_MESSAGE",
        content: "System reminder"
      }),
      JSON.stringify({
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        content: "Here is the deployment YAML definition."
      })
    ].join("\n");

    const turns = parseAgyTranscript(jsonl);
    assert.equal(turns.length, 2);
    assert.deepEqual(turns[0], {
      role: "user",
      content: "Deploy app to Kubernetes"
    });
    assert.deepEqual(turns[1], {
      role: "assistant",
      content: "Here is the deployment YAML definition."
    });
  });

  it("gracefully returns empty array on empty or corrupt input", () => {
    assert.deepEqual(parseAgyTranscript(""), []);
    assert.deepEqual(parseAgyTranscript("not-a-json\n\n"), []);
  });
});
