# OpenViking Plugin for Google Antigravity CLI (`agy`)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](LICENSE)
[![Antigravity](https://img.shields.io/badge/Antigravity%20CLI-v1.2%2B-orange.svg)](https://antigravity.google)
[![OpenViking](https://img.shields.io/badge/OpenViking-Context%20DB-green.svg)](https://docs.openviking.ai)

Official OpenViking long-term memory and context database plugin for **Google Antigravity CLI (`agy`)**.

This plugin provides **100% feature parity** with the Claude Code and Codex OpenViking memory plugins, giving Antigravity seamless, zero-friction long-term memory across sessions.

[中文文档 (README_CN.md)](README_CN.md)

---

## 🌟 Key Features

* 🧠 **Passive Auto-Recall (`PreInvocation`)**: Automatically searches OpenViking memories and injects relevant historical facts, conventions, and user preferences into the model prompt before each turn.
* 📋 **Initial Profile Injection**: Dynamically injects your OpenViking user profile, memory index, and `<available-skills>` catalog on session startup.
* 🛡️ **Virtual URI Guard (`PreToolUse`)**: Prevents native filesystem tools (`view_file`, `write_to_file`, etc.) from corrupting virtual `viking://` URIs and automatically redirects the agent to OpenViking MCP tools.
* 📥 **Incremental Auto-Capture (`PostInvocation`)**: Stream-captures finished conversation turns without interrupting the model or polluting context.
* 💾 **Automatic Session Commit (`Stop`)**: Automatically submits conversation transcripts to OpenViking on task exit for asynchronous memory and lesson extraction.
* 🛠️ **Full MCP Toolset**: Connects to the local OpenViking daemon over stdio, exposing 15 core tools (`find`, `search`, `read`, `write`, `edit`, `remember`, `tree`, `add_resource`, etc.).
* 📚 **Built-in Agent Skills**: Bundles 4 expert skills: `openviking-memory`, `openviking-skills`, `ov-experience-memory`, and `ov-memory-troubleshoot`.

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────────┐
│              Google Antigravity CLI (`agy`)              │
└─────────────┬───────────────────────────────▲────────────┘
              │                               │
       [1] PreInvocation              [2] PreToolUse
              │                               │
              ▼                               ▼
       Auto-Recall Hook                 URI Guard Hook
   (Injected as EphemeralMsg)      (Block viking:// on fs tools)
              │
              ├───────────► OpenViking Daemon (http://127.0.0.1:1933)
              │                   ▲
       [3] PostInvocation         │
              ▼                   │
       Auto-Capture Hook ─────────┤
   (Incremental turns to session) │
                                  │
       [4] Stop                   │
              ▼                   │
       Auto-Commit Hook ──────────┘
      (Session memory extraction)
```

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** >= 18.0.0
* **Antigravity CLI** (`agy`) >= 1.2.0 (`command -v agy`)
* A running **OpenViking** server (defaults to `http://127.0.0.1:1933`)

### 1. One-Click Installation

Clone the repository and run the installer:

```bash
git clone https://github.com/your-username/agy-plugin-openviking.git
cd agy-plugin-openviking
./install.sh
```

### 2. Manual Installation via `agy`

You can also install directly with the Antigravity CLI:

```bash
agy plugin validate /path/to/agy-plugin-openviking
agy plugin install /path/to/agy-plugin-openviking
```

### 3. Verify Installation

Check installed components:

```bash
agy plugin list
```

Expected output:
```json
{
  "imports": [
    {
      "name": "openviking",
      "source": "antigravity",
      "components": [
        "skills",
        "mcpServers",
        "hooks"
      ]
    }
  ]
}
```

---

## ⚙️ Configuration

Credentials and endpoint resolution follow the standard OpenViking precedence hierarchy:

1. **Environment Variables**:
   * `OPENVIKING_URL` (default: `http://127.0.0.1:1933`)
   * `OPENVIKING_API_KEY` (or `OPENVIKING_BEARER_TOKEN`)
   * `OPENVIKING_ACCOUNT` / `OPENVIKING_USER`
2. **CLI Configuration File**: `~/.openviking/ovcli.conf`
3. **Server Configuration File**: `~/.openviking/ov.conf`

### Low-Latency Mode

If response latency is critical, you can disable optional query expansion:

```bash
export OPENVIKING_RECALL_QUERY_EXPANSION=off
```

Or configure in `~/.openviking/ovcli.conf`:
```json
{
  "url": "http://127.0.0.1:1933",
  "plugin": {
    "recallQueryExpansion": "off"
  }
}
```

---

## 🧪 Testing

Run the included unit and conformance test suites:

```bash
npm test
```

Tests cover:
* Antigravity `transcript_full.jsonl` log parsing.
* JSON Schema and Antigravity plugin manifest conformance.
* Lifecycle hook event definitions and syntax validation.

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) to align with OpenViking core components.
