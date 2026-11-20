# Install claude-code-kit on Windows: house rules (CLAUDE.md), the memory vault, the vault-memory skill and the
# Claude Code hooks. No administrator rights needed. Re-running is safe.
#
# Run from PowerShell or cmd:
#   powershell -ExecutionPolicy Bypass -File "%USERPROFILE%\claude-kit\install.ps1"
# Optional: -Owner "Name"  name written as "by" when a fact is confirmed from the web UI (sets VAULT_OWNER).
#           -Force         replace an existing CLAUDE.md (backed up first) and an existing vault-memory skill.
#
# What it does:
#   1. checks Node.js 20+ and Git;
#   2. copies the kit to %USERPROFILE%\claude-kit (if run from somewhere else);
#   3. %USERPROFILE%\.claude\CLAUDE.md: installs it if missing; if a different one exists, writes CLAUDE.kit.md
#      next to it (or replaces it with -Force, keeping a .bak copy);
#   4. the vault-memory skill -> %USERPROFILE%\.claude\skills\ (kept as is if present, unless -Force);
#   5. the empty memory -> %USERPROFILE%\claude-vault (an EXISTING vault is never touched) + a local git repository;
#   6. hooks and autoMemoryDirectory -> %USERPROFILE%\.claude\settings.json (other settings kept, old file -> .bak);
#   7. %USERPROFILE%\claude-kit\bin -> user PATH (commands vault, vault-recall, vault-commit, vaultctl);
#   8. starts the memory server once to check it, then stops it.
#
# This file is ASCII on purpose: Windows PowerShell 5.1 reads a UTF-8 file without BOM as the ANSI code page.

param(
  [string]$Owner = '',
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Say($msg)  { Write-Host "  $msg" }
function Ok($msg)   { Write-Host "  [ok] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  [x]  $msg" -ForegroundColor Red; exit 1 }
function Stamp      { Get-Date -Format 'yyyyMMdd-HHmmss' }

$HomeDir   = [Environment]::GetFolderPath('UserProfile')
$KitHome   = Join-Path $HomeDir 'claude-kit'
$ClaudeDir = Join-Path $HomeDir '.claude'
$VaultDir  = Join-Path $HomeDir 'claude-vault'
$Src       = $PSScriptRoot

Write-Host ''
Write-Host 'claude-code-kit: install' -ForegroundColor Cyan
Write-Host ''

# 1. Node and Git
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail 'Node.js not found. Install the LTS: winget install OpenJS.NodeJS.LTS, open a new window and run again.' }
$nodeMajor = [int](& node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 20) { Fail "Node.js $nodeMajor is too old, 20+ is needed." }
Ok "Node.js $(& node -v)"
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { Fail 'Git not found. Install Git for Windows: winget install Git.Git (Claude Code needs it too), open a new window and run again.' }
Ok "$(& git --version)"

# 2. kit -> %USERPROFILE%\claude-kit
if ((Resolve-Path $Src).Path.TrimEnd('\', '/') -ne $KitHome.TrimEnd('\', '/')) {
  New-Item -ItemType Directory -Force -Path $KitHome | Out-Null
  Get-ChildItem -Path $Src -Force | Where-Object { $_.Name -ne '.git' } |
    ForEach-Object { Copy-Item -Path $_.FullName -Destination $KitHome -Recurse -Force }
  Ok "kit copied to $KitHome"
} else { Ok "kit already in place: $KitHome" }

# 3. CLAUDE.md
New-Item -ItemType Directory -Force -Path $ClaudeDir | Out-Null
$claudeMd = Join-Path $ClaudeDir 'CLAUDE.md'
$newMd = Join-Path (Join-Path $KitHome 'claude') 'CLAUDE.md'
if (-not (Test-Path $claudeMd)) {
  Copy-Item $newMd $claudeMd
  Ok "house rules: $claudeMd"
} elseif ((Get-FileHash $claudeMd).Hash -eq (Get-FileHash $newMd).Hash) {
  Ok "house rules already installed: $claudeMd"
} elseif ($Force) {
  $bak = "$claudeMd.bak-$(Stamp)"
  Copy-Item $claudeMd $bak
  Copy-Item $newMd $claudeMd -Force
  Warn "replaced $claudeMd; your old one is $bak (move your own rules into 'My preferences')"
} else {
  Copy-Item $newMd (Join-Path $ClaudeDir 'CLAUDE.kit.md') -Force
  Warn "you already have a CLAUDE.md, left as is; the kit's version is $(Join-Path $ClaudeDir 'CLAUDE.kit.md') (merge it, or re-run with -Force)"
}

# 4. skill
$skillsDir = Join-Path $ClaudeDir 'skills'
New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
Get-ChildItem (Join-Path (Join-Path $KitHome 'claude') 'skills') -Directory | ForEach-Object {
  $dst = Join-Path $skillsDir $_.Name
  if ((Test-Path $dst) -and -not $Force) { Warn "skill $($_.Name) already exists, left as is (replace: -Force)" }
  else { Copy-Item $_.FullName $skillsDir -Recurse -Force; Ok "skill: $dst" }
}

# 5. memory
if (Test-Path $VaultDir) {
  Warn "memory already exists ($VaultDir), not touched"
} else {
  Copy-Item (Join-Path $KitHome 'vault') $VaultDir -Recurse
  & git -C $VaultDir init -q
  & git -C $VaultDir add -A
  & git -C $VaultDir -c user.name=vault -c user.email=vault@localhost commit -q -m 'memory: empty skeleton'
  Ok "memory: $VaultDir (local git, no remote)"
}

# 6. settings.json
& node (Join-Path $KitHome 'vault-app\bin\install-settings.js') (Join-Path $ClaudeDir 'settings.json') $KitHome $VaultDir
if ($LASTEXITCODE -ne 0) { Fail 'settings.json not updated (see the message above).' }
Ok 'hooks: SessionStart / SessionEnd (vault) + UserPromptSubmit (vault-recall)'

# 7. PATH and owner name
$binDir = Join-Path $KitHome 'bin'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }
if (($userPath -split ';') -notcontains $binDir) {
  [Environment]::SetEnvironmentVariable('Path', (($userPath.TrimEnd(';') + ";$binDir").TrimStart(';')), 'User')
  Ok "PATH: added $binDir (works in NEW windows)"
} else { Ok "PATH: $binDir already there" }
if ($Owner) {
  [Environment]::SetEnvironmentVariable('VAULT_OWNER', $Owner, 'User')
  Ok "VAULT_OWNER = $Owner"
}

# 8. check
$ctl = Join-Path $KitHome 'vault-app\bin\vaultctl.js'
& node $ctl start install-check | Out-Null
$up = $false
$port = 4040; if ($env:VAULT_PORT) { $port = $env:VAULT_PORT }
try { $up = (Invoke-WebRequest "http://127.0.0.1:$port/api/rebuild" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } catch {}
& node $ctl stop install-check | Out-Null
if ($up) { Ok "memory server starts (http://127.0.0.1:$port)" }
else { Warn "memory server did not answer; see $KitHome\vault-app\server.log (port 4040 busy? set VAULT_PORT)" }
$recall = (& node (Join-Path $KitHome 'vault-app\bin\vault-recall') 'open tasks') -join ' '
if ($LASTEXITCODE -eq 0) { Ok 'vault-recall answers' } else { Warn 'vault-recall failed, see the output above' }

Write-Host ''
Write-Host 'Done. Next:' -ForegroundColor Cyan
Say '1. Close this window and open a new terminal (so PATH is picked up).'
Say '2. Run claude: the memory server starts with the session, and each prompt gets hints from memory.'
Say '3. Check, in the new window: vault issues   and   vault fact ls'
Say "4. Web UI: http://127.0.0.1:$port (while at least one Claude Code session is open)."
Write-Host ''
