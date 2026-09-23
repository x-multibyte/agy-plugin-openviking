#!/usr/bin/env bash
# ==============================================================================
# OpenViking Plugin Installer for Google Antigravity CLI (agy)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_NAME="openviking"

info() {
  printf "\033[1;34m[INFO]\033[0m %s\n" "$*"
}

success() {
  printf "\033[1;32m[SUCCESS]\033[0m %s\n" "$*"
}

warn() {
  printf "\033[1;33m[WARN]\033[0m %s\n" "$*"
}

error() {
  printf "\033[1;31m[ERROR]\033[0m %s\n" "$*" >&2
}

# 1. Check prerequisites
info "Checking prerequisites..."

if ! command -v node >/dev/null 2>&1; then
  error "Node.js is required but not found on PATH. Please install Node.js >= 18."
  exit 1
fi

NODE_VERSION="$(node -v | sed 's/v//' | cut -d. -f1)"
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js >= 18 is required. Current version: $(node -v)"
  exit 1
fi

if ! command -v agy >/dev/null 2>&1; then
  error "Antigravity CLI ('agy') is not found on PATH. Please ensure agy is installed."
  exit 1
fi

# 2. Check OpenViking daemon status (advisory)
OV_URL="${OPENVIKING_URL:-http://127.0.0.1:1933}"
if curl -sf "${OV_URL}/api/v1/system/status" >/dev/null 2>&1; then
  info "OpenViking server detected at ${OV_URL} (healthy)."
else
  warn "OpenViking server at ${OV_URL} did not respond to health check."
  warn "Make sure openviking-server is running before starting an agy session."
fi

# 3. Validate plugin structure
info "Validating plugin structure with agy..."
agy plugin validate "${SCRIPT_DIR}"

# 4. Install via agy plugin install
info "Installing plugin into Antigravity CLI profile..."
agy plugin uninstall "${PLUGIN_NAME}" 2>/dev/null || true
agy plugin install "${SCRIPT_DIR}"

# 5. Verify components
info "Verifying loaded components..."
agy plugin list

echo ""
success "OpenViking plugin for Antigravity CLI has been installed successfully!"
echo ""
echo "Enabled capabilities:"
echo "  ✔ Auto-Recall: Passively injects relevant memories and skills before model turns"
echo "  ✔ Auto-Capture: Incremental conversation turn capture after model responses"
echo "  ✔ Auto-Commit: Asynchronously commits session to OpenViking on exit"
echo "  ✔ URI Guard: Intercepts native filesystem tools from modifying viking:// paths"
echo "  ✔ MCP Tools & Skills: Full suite of 15 tools and 4 agent skills"
echo ""
echo "Try running:"
echo "  agy -p \"What are my preferences regarding documentation indexing?\""
echo ""
