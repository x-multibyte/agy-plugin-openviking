# OpenViking 插件 —— 适用于 Google Antigravity CLI (`agy`)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](LICENSE)
[![Antigravity](https://img.shields.io/badge/Antigravity%20CLI-v1.2%2B-orange.svg)](https://antigravity.google)
[![OpenViking](https://img.shields.io/badge/OpenViking-Context%20DB-green.svg)](https://docs.openviking.ai)

为 **Google Antigravity CLI (`agy`)** 打造的 OpenViking 上下文数据库与长期记忆插件。

本插件与 OpenViking 官方的 Claude Code 和 Codex 插件实现**100% 全功能对齐**，为 Antigravity 带来无需手动干预的跨会话长期记忆与经验沉淀体验。

---

## 🌟 核心特性

* 🧠 **被动自动召回 (`PreInvocation`)**：在每轮模型生成决策前，静默提取用户意图并检索 OpenViking 记忆，将历史偏好与操作规范注入为临时上下文（EphemeralMessage）。
* 📋 **首次会话画像注入**：在会话启动时，自动注入用户画像（Profile）、偏好索引以及 OpenViking 技能目录（`<available-skills>`）。
* 🛡️ **虚拟 URI 路径守卫 (`PreToolUse`)**：严格拦截本地文件操作工具（`view_file`, `write_to_file` 等）对 `viking://` 虚拟路径的误用，并自动引导模型切换至 OpenViking MCP 工具。
* 📥 **增量自动捕获 (`PostInvocation`)**：在每轮模型回复后，流式捕获已完成的对话增量并暂存至服务端会话队列，全程不中断推理。
* 💾 **会话自动归档 (`Stop`)**：在会话或任务结束时，自动向 OpenViking 触发 Session Commit，由后台异步提炼用户偏好与技术沉淀。
* 🛠️ **完整 MCP 工具集**：通过 stdio 轻量代理直连 OpenViking 服务，暴露 15 个核心工具（`find`, `search`, `read`, `write`, `edit`, `remember`, `tree`, `add_resource` 等）。
* 📚 **内置专家技能 (Skills)**：预置 4 套原生技能：`openviking-memory`、`openviking-skills`、`ov-experience-memory` 与 `ov-memory-troubleshoot`。

---

## 🏗️ 架构流向图

```text
┌──────────────────────────────────────────────────────────┐
│              Google Antigravity CLI (`agy`)              │
└─────────────┬───────────────────────────────▲────────────┘
              │                               │
       [1] PreInvocation              [2] PreToolUse
              │                               │
              ▼                               ▼
       被动记忆召回 Hook                 虚拟 URI 守卫 Hook
     (以 EphemeralMsg 注入)          (阻断原生文件工具操作虚拟路径)
              │
              ├───────────► OpenViking 服务端 (http://127.0.0.1:1933)
              │                   ▲
       [3] PostInvocation         │
              ▼                   │
       增量对话捕获 Hook ──────────┤
       (流式推送每轮对话增量)      │
                                  │
       [4] Stop                   │
              ▼                   │
       会话自动归档 Hook ──────────┘
       (后台异步提炼经验与偏好)
```

---

## 🚀 快速上手

### 环境要求
* **Node.js** >= 18.0.0
* **Antigravity CLI** (`agy`) >= 1.2.0 (`command -v agy`)
* 正在运行的 **OpenViking** 服务端（默认地址 `http://127.0.0.1:1933`）

### 1. 一键安装

克隆仓库并运行安装脚本：

```bash
git clone https://github.com/x-multibyte/agy-plugin-openviking.git
cd agy-plugin-openviking
./install.sh
```

### 2. 通过 `agy` 手动安装

也可以直接使用 Antigravity CLI 内置命令安装：

```bash
agy plugin validate /path/to/agy-plugin-openviking
agy plugin install /path/to/agy-plugin-openviking
```

### 3. 验证安装

查看已加载的插件组件：

```bash
agy plugin list
```

正常输出示例：
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

## ⚙️ 配置说明

服务连接与凭证解析遵循 OpenViking 标准优先级：

1. **环境变量**：
   * `OPENVIKING_URL`（默认：`http://127.0.0.1:1933`）
   * `OPENVIKING_API_KEY`（或 `OPENVIKING_BEARER_TOKEN`）
   * `OPENVIKING_ACCOUNT` / `OPENVIKING_USER`
2. **CLI 配置文件**：`~/.openviking/ovcli.conf`
3. **服务端配置文件**：`~/.openviking/ov.conf`

### 低延迟模式（可选）

如果对交互延迟要求极高，可关闭检索时的 Query Expansion（查询重构）：

```bash
export OPENVIKING_RECALL_QUERY_EXPANSION=off
```

或在 `~/.openviking/ovcli.conf` 中配置：
```json
{
  "url": "http://127.0.0.1:1933",
  "plugin": {
    "recallQueryExpansion": "off"
  }
}
```

---

## 🧪 自动化测试

项目自带完整的单元测试与规范合规检查：

```bash
npm test
```

测试内容包括：
* Antigravity `transcript_full.jsonl` 日志解析稳定性。
* 插件目录结构、JSON Schema 与清单规范校验。
* 生命周期钩子定义与脚本语法安全检查。

---

## 📄 开源许可证

本项目采用 [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) 开源许可证，与 OpenViking 核心生态保持一致。
