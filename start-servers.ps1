# Unified BuildWebGames server — launcher + all games on one port (8760).
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Close old per-game python servers so port 8760 is free for the unified server.
& (Join-Path $root 'stop-servers.ps1') | Out-Null

$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { Write-Error "Python 3 not found in PATH. Install Python and try again." }

$port = if ($env:BEGW_PORT) { $env:BEGW_PORT } else { '8760' }
$cmd = "Set-Location -LiteralPath '$root'; `$env:BEGW_PORT='$port'; & '$py' serve.py"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmd -WindowStyle Minimized

Write-Host ""
Write-Host "Build Engine Games Web - unified server"
Write-Host "Launcher:  http://127.0.0.1:$port/"
Write-Host "Unplugged: http://127.0.0.1:$port/Unplugged/"
Write-Host "Example:   http://127.0.0.1:$port/8775-swarrior/run.html"
Write-Host "Witchaven: http://127.0.0.1:$port/8783-witchaven/run.html"
Write-Host "WH II:     http://127.0.0.1:$port/8784-witchaven2/run.html"
Write-Host ""
Write-Host "Select game files in the launcher, then PLAY (same port = IndexedDB works)."
Write-Host "Stop: close the minimized python window or kill the process on port $port."
