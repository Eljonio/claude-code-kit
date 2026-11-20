#!/usr/bin/env bash
# Install claude-code-kit on Linux or macOS: house rules (CLAUDE.md), the memory vault, the vault-memory skill and
# the Claude Code hooks. No root needed. Re-running is safe.
#
#   ./install.sh [--owner "Name"] [--force]
#
#   --owner  name written as "by" when a fact is confirmed from the web UI (prints the export line to add)
#   --force  replace an existing ~/.claude/CLAUDE.md (backed up first) and an existing vault-memory skill
#
# What it does:
#   1. checks Node.js 20+ and git;
#   2. copies the kit to ~/claude-kit (if run from somewhere else);
#   3. ~/.claude/CLAUDE.md: installs it if missing; if a different one exists, writes CLAUDE.kit.md next to it
#      (or replaces it with --force, keeping a .bak copy);
#   4. the vault-memory skill -> ~/.claude/skills/ (kept as is if present, unless --force);
#   5. the empty memory -> ~/claude-vault (an EXISTING vault is never touched) + a local git repository;
#   6. hooks and autoMemoryDirectory -> ~/.claude/settings.json (other settings kept, old file -> .bak-<date>);
#   7. links vault, vault-recall, vaultctl, vault-commit into ~/.local/bin;
#   8. starts the memory server once to check it, then stops it.
set -euo pipefail

OWNER=""; FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --owner) OWNER="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

ok()   { printf '  [ok] %s\n' "$*"; }
warn() { printf '  [!]  %s\n' "$*"; }
fail() { printf '  [x]  %s\n' "$*" >&2; exit 1; }
stamp() { date +%Y%m%d-%H%M%S; }

SRC="$(cd "$(dirname "$0")" && pwd)"
KIT="$HOME/claude-kit"
CLAUDE_DIR="$HOME/.claude"
VAULT="$HOME/claude-vault"
BIN_DIR="$HOME/.local/bin"

echo
echo "claude-code-kit: install"
echo

# 1. Node and git
command -v node >/dev/null 2>&1 || fail "Node.js not found. Install Node.js 20 or newer and run again."
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js $NODE_MAJOR is too old, 20+ is needed."
ok "Node.js $(node -v)"
command -v git >/dev/null 2>&1 || fail "git not found. Install git and run again."
ok "$(git --version)"

# 2. kit -> ~/claude-kit
if [ "$SRC" != "$KIT" ]; then
  mkdir -p "$KIT"
  (cd "$SRC" && tar --exclude=./.git -cf - .) | (cd "$KIT" && tar -xf -)
  ok "kit copied to $KIT"
else
  ok "kit already in place: $KIT"
fi

# 3. CLAUDE.md
mkdir -p "$CLAUDE_DIR"
NEW_MD="$KIT/claude/CLAUDE.md"
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  cp "$NEW_MD" "$CLAUDE_DIR/CLAUDE.md"; ok "house rules: $CLAUDE_DIR/CLAUDE.md"
elif cmp -s "$NEW_MD" "$CLAUDE_DIR/CLAUDE.md"; then
  ok "house rules already installed: $CLAUDE_DIR/CLAUDE.md"
elif [ "$FORCE" = 1 ]; then
  BAK="$CLAUDE_DIR/CLAUDE.md.bak-$(stamp)"
  cp "$CLAUDE_DIR/CLAUDE.md" "$BAK"; cp "$NEW_MD" "$CLAUDE_DIR/CLAUDE.md"
  warn "replaced $CLAUDE_DIR/CLAUDE.md; your old one is $BAK (move your own rules into \"My preferences\")"
else
  cp "$NEW_MD" "$CLAUDE_DIR/CLAUDE.kit.md"
  warn "you already have a CLAUDE.md, left as is; the kit's version is $CLAUDE_DIR/CLAUDE.kit.md (merge it, or re-run with --force)"
fi

# 4. skill
mkdir -p "$CLAUDE_DIR/skills"
for d in "$KIT"/claude/skills/*/; do
  name="$(basename "$d")"; dst="$CLAUDE_DIR/skills/$name"
  if [ -e "$dst" ] && [ "$FORCE" != 1 ]; then warn "skill $name already exists, left as is (replace: --force)"
  else rm -rf "$dst"; cp -R "$d" "$dst"; ok "skill: $dst"; fi
done

# 5. memory
if [ -e "$VAULT" ]; then
  warn "memory already exists ($VAULT), not touched"
else
  cp -R "$KIT/vault" "$VAULT"
  git -C "$VAULT" init -q
  git -C "$VAULT" add -A
  git -C "$VAULT" -c user.name=vault -c user.email=vault@localhost commit -q -m "memory: empty skeleton"
  ok "memory: $VAULT (local git, no remote)"
fi

# 6. settings.json
node "$KIT/vault-app/bin/install-settings.js" "$CLAUDE_DIR/settings.json" "$KIT" "$VAULT" || fail "settings.json not updated (see the message above)."
ok "hooks: SessionStart / SessionEnd (vault) + UserPromptSubmit (vault-recall)"

# 7. commands
mkdir -p "$BIN_DIR"
ln -sf "$KIT/vault-app/bin/vault"            "$BIN_DIR/vault"
ln -sf "$KIT/vault-app/bin/vault-recall"     "$BIN_DIR/vault-recall"
ln -sf "$KIT/vault-app/bin/vaultctl.js"      "$BIN_DIR/vaultctl"
ln -sf "$KIT/vault-app/bin/vault-commit.js"  "$BIN_DIR/vault-commit"
ok "commands linked into $BIN_DIR"
case ":$PATH:" in *":$BIN_DIR:"*) ;; *) warn "$BIN_DIR is not on PATH; add: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;; esac
[ -n "$OWNER" ] && warn "to sign facts confirmed from the web UI, add to your shell profile: export VAULT_OWNER=\"$OWNER\""

# 8. check
PORT="${VAULT_PORT:-4040}"
node "$KIT/vault-app/bin/vaultctl.js" start install-check >/dev/null
if node -e "fetch('http://127.0.0.1:$PORT/api/rebuild').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"; then
  ok "memory server starts (http://127.0.0.1:$PORT)"
else
  warn "memory server did not answer; see $KIT/vault-app/server.log (port $PORT busy? set VAULT_PORT)"
fi
node "$KIT/vault-app/bin/vaultctl.js" stop install-check >/dev/null
if VAULT_DIR="$VAULT" node "$KIT/vault-app/bin/vault-recall" "open tasks" >/dev/null; then ok "vault-recall answers"; else warn "vault-recall failed, see the output above"; fi

echo
echo "Done. Next:"
echo "  1. Open a new terminal (so PATH is picked up) and run: claude"
echo "  2. Check: vault issues   and   vault fact ls"
echo "  3. Web UI: http://127.0.0.1:$PORT (while at least one Claude Code session is open)"
echo
