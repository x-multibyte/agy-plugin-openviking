#!/usr/bin/env node

/**
 * OpenViking lifecycle hook handler for Antigravity CLI (agy).
 *
 * Implements:
 * - PreInvocation: Auto-recall (injects user profile & skills on start + recalls memories per turn)
 * - PreToolUse: URI guard (prevents native file tools from accessing viking:// URIs)
 * - PostInvocation: Incremental turn capture to OpenViking session
 * - Stop: Final session commit for asynchronous memory extraction
 */

import { readFile } from "node:fs/promises";
import {
  addAgentMessages,
  buildAgentProfile,
  commitAgentSession,
  createAgentLogger,
  loadAgentHookConfig,
  makeAgentFetchJSON,
  readHookState,
  recallForPrompt,
  stableHash,
  withAgentHookLock,
  writeHookState,
} from "./shared/agent-hook-runtime.mjs";
import { filterCaptureTurns, isCaptureEnabled } from "./shared/capture-utils.mjs";
import { extractUserPrompt, parseAgyTranscript } from "./agy-transcript.mjs";

const event = process.argv[2] || process.env.OPENVIKING_HOOK_EVENT || "unknown";
const clientId = "antigravity-cli";
const cfg = loadAgentHookConfig(clientId);
const { log, logError } = createAgentLogger(clientId, event, cfg);
const { fetchJSON } = makeAgentFetchJSON(cfg);

function emit(outputObj) {
  process.stdout.write(JSON.stringify(outputObj) + "\n");
}

async function readStdin() {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  if (!data.trim()) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function getLatestPrompt(transcriptPath) {
  if (!transcriptPath) return "";
  try {
    const raw = await readFile(transcriptPath, "utf8");
    const lines = raw.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      const entry = JSON.parse(line);
      if (entry.source === "USER_EXPLICIT" && entry.type === "USER_INPUT") {
        return extractUserPrompt(entry.content || "");
      }
    }
  } catch {}
  return "";
}

async function captureTranscript(transcriptPath, conversationId, state) {
  if (!transcriptPath || !isCaptureEnabled(cfg)) return { state, captured: 0 };
  let turns = [];
  try {
    const raw = await readFile(transcriptPath, "utf8");
    turns = parseAgyTranscript(raw);
  } catch {
    return { state, captured: 0 };
  }

  const capturedHashes = new Set(Array.isArray(state.capturedHashes) ? state.capturedHashes : []);
  const toSend = [];
  for (const [index, turn] of turns.entries()) {
    const hash = stableHash(index, turn.role, turn.content);
    if (capturedHashes.has(hash)) continue;
    const { kept } = filterCaptureTurns([turn], cfg);
    if (!kept.length) {
      capturedHashes.add(hash);
      continue;
    }
    toSend.push({ hash, turn: kept[0] });
  }

  if (toSend.length === 0) {
    return { state, captured: 0 };
  }

  const sessionId = `agy-${conversationId}`;
  const result = await addAgentMessages(fetchJSON, sessionId, toSend.map(item => item.turn));
  const captured = result.sent + result.queued;
  for (const item of toSend.slice(0, captured)) {
    capturedHashes.add(item.hash);
  }

  return {
    captured,
    state: {
      ...state,
      capturedHashes: [...capturedHashes].slice(-1000),
      capturedSinceCommit: Number(state.capturedSinceCommit || 0) + captured,
    },
  };
}

async function handlePreInvocation(input) {
  const conversationId = input.conversationId || "default";
  const transcriptPath = input.transcriptPath || "";
  const invocationNum = Number(input.invocationNum ?? 0);
  const cwd = (input.workspacePaths && input.workspacePaths[0]) || process.cwd();

  const blocks = [];
  const prompt = await getLatestPrompt(transcriptPath);

  await withAgentHookLock(clientId, conversationId, async () => {
    const state = await readHookState(clientId, conversationId);
    const now = Date.now();

    // 1. Session start profile injection (only on invocation 0)
    if (invocationNum === 0 && !cfg.noAutoInject) {
      try {
        const profile = await buildAgentProfile(fetchJSON, cfg, cwd);
        if (profile) blocks.push(profile);
      } catch (err) {
        logError("profile_inject", err);
      }
    }

    // 2. Auto-recall for the current prompt
    if (prompt && cfg.autoRecall !== false) {
      const promptHash = stableHash(prompt);
      const isDuplicate = state.lastPromptHash === promptHash && (now - Number(state.lastPromptAt || 0) < 1500);

      if (!isDuplicate) {
        try {
          const recallBlock = await recallForPrompt(fetchJSON, cfg, prompt, cwd, log, {
            sessionId: `agy-${conversationId}`,
          });
          if (recallBlock) {
            blocks.push(recallBlock);
          }
          state.lastPromptHash = promptHash;
          state.lastPromptAt = now;
        } catch (err) {
          logError("auto_recall", err);
        }
      }
    }

    await writeHookState(clientId, conversationId, state);
  });

  if (blocks.length > 0) {
    emit({
      injectSteps: [
        {
          ephemeralMessage: blocks.join("\n\n"),
        },
      ],
    });
  } else {
    emit({});
  }
}

async function handlePreToolUse(input) {
  const toolName = input.toolCall?.name || "";
  const toolArgs = JSON.stringify(input.toolCall?.args || {});

  // Guard against filesystem tools accessing viking:// URIs
  const isFileTool = [
    "view_file",
    "write_to_file",
    "replace_file_content",
    "multi_replace_file_content",
    "list_dir",
    "find_by_name",
  ].includes(toolName);

  if (isFileTool && toolArgs.includes("viking://")) {
    emit({
      decision: "deny",
      reason: `Target path contains a viking:// virtual URI. Do not use filesystem tool "${toolName}"; use OpenViking MCP tools (read, write, edit, list, tree, search, find) instead.`,
    });
    return;
  }

  emit({ decision: "allow" });
}

async function handlePostInvocation(input) {
  const conversationId = input.conversationId || "default";
  const transcriptPath = input.transcriptPath || "";

  await withAgentHookLock(clientId, conversationId, async () => {
    const state = await readHookState(clientId, conversationId);
    const { state: next } = await captureTranscript(transcriptPath, conversationId, state);
    await writeHookState(clientId, conversationId, next);
  });

  emit({});
}

async function handleStop(input) {
  const conversationId = input.conversationId || "default";
  const transcriptPath = input.transcriptPath || "";
  const sessionId = `agy-${conversationId}`;

  await withAgentHookLock(clientId, conversationId, async () => {
    const state = await readHookState(clientId, conversationId);
    const { state: next } = await captureTranscript(transcriptPath, conversationId, state);

    try {
      log("session_commit_start", { sessionId });
      const res = await commitAgentSession(fetchJSON, sessionId, log);
      if (res && res.ok) {
        next.capturedSinceCommit = 0;
        log("session_commit_success", { sessionId });
      }
    } catch (err) {
      logError("session_commit", err);
    }

    await writeHookState(clientId, conversationId, next);
  });

  emit({});
}

async function main() {
  const input = await readStdin();
  try {
    switch (event) {
      case "PreInvocation":
        await handlePreInvocation(input);
        break;
      case "PreToolUse":
        await handlePreToolUse(input);
        break;
      case "PostInvocation":
        await handlePostInvocation(input);
        break;
      case "Stop":
        await handleStop(input);
        break;
      default:
        emit({});
        break;
    }
  } catch (err) {
    logError(`unhandled_${event}`, err);
    emit(event === "PreToolUse" ? { decision: "allow" } : {});
  }
}

main();
