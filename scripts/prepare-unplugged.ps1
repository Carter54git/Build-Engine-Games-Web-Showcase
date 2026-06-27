# Verify unified BuildWebGames deploy (one copy of games, two launchers).
# Does NOT copy game files — upload the whole BuildWebGames folder to hosting.
param(
    [switch]$RemoveDuplicate
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$dup = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BuildWebGamesUnplugged'

$gameDirs = @(
    '8766-blood', '8770-blood-lenin', '8767-redneck', '8768-nam', '8769-ww2gi',
    '8772-rrridesagain', '8773-rrroute66', '8774-powerslave', '8775-swarrior',
    '8776-duke3d', '8777-tekwar', '8778-liquidator', '8786-plunder', '8787-sw-twindragon', '8788-sw-wanton',
    '8789-quest-hussein', '8790-quest-alqaeda', '8791-ww2-platoon',
    '8779-duke-vacation', '8780-duke-dc', '8781-duke-nwinter', '8782-duke-penthouse',
    '8783-witchaven', '8784-witchaven2'
)

Write-Host 'BuildWebGames — unified deploy (no duplicate game files)'
Write-Host ''

$missing = @()
foreach ($dir in $gameDirs) {
    $run = Join-Path (Join-Path $Root $dir) 'run.html'
    if (Test-Path $run) { Write-Host "OK $dir" }
    else { Write-Host "MISSING $dir"; $missing += $dir }
}

$launchers = @(
    @{ Path = 'index.html'; Url = '/' },
    @{ Path = 'Unplugged\index.html'; Url = '/Unplugged/' }
)
foreach ($l in $launchers) {
    $p = Join-Path $Root $l.Path
    if (Test-Path $p) { Write-Host "OK launcher $($l.Path)" }
    else { Write-Warning "Missing launcher $($l.Path)" }
}

if (Test-Path (Join-Path $Root 'screenshots')) { Write-Host 'OK screenshots' }
else { Write-Warning 'Missing screenshots/' }

Write-Host ''
Write-Host 'Deploy: upload ONE folder to hosting:'
Write-Host "  $Root"
Write-Host ''
Write-Host 'Two entry points, shared game files:'
Write-Host '  /index.html           verified launcher (GRP check)'
Write-Host '  /Unplugged/index.html unplugged (PLAY only)'
Write-Host '  /8766-blood/          same runtime for both'
Write-Host '  /8776-duke3d/         ...'

if ($missing.Count) {
    Write-Host ''
    Write-Warning "$($missing.Count) game(s) not built. Run sync-from-projects.ps1 first."
}

if (Test-Path $dup) {
    Write-Host ''
    Write-Warning "Duplicate folder found: $dup"
    Write-Warning 'It copies all games again and wastes disk space.'
    if ($RemoveDuplicate) {
        Remove-Item -Recurse -Force $dup
        Write-Host "Removed $dup"
    } else {
        Write-Host 'Remove it: powershell -File scripts\prepare-unplugged.ps1 -RemoveDuplicate'
    }
}

Write-Host ''
Write-Host 'Done.'
