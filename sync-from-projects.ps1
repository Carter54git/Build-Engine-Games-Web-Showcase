# Copy runtime bundles from *web projects into BuildWebGames.
param(
    [string[]]$Only = @()
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Desktop = [Environment]::GetFolderPath('Desktop')
$ServeTpl = Join-Path $Root 'serve-template.py'

$ports = @(
    @{ Name = 'Blood';         Src = 'bloodweb';        Dir = '8766-blood';        Port = 8766; Js = 'nblood' },
    @{ Name = 'Blood Lenin';   Src = 'fbloodweb';       Dir = '8770-blood-lenin';  Port = 8770; Js = 'nblood' },
    @{ Name = 'Redneck';       Src = 'rredneckweb';     Dir = '8767-redneck';      Port = 8767; Js = 'rednukem' },
    @{ Name = 'NAM';           Src = 'namweb';          Dir = '8768-nam';          Port = 8768; Js = 'rednukem' },
    @{ Name = 'WW2 GI';        Src = 'ww2giweb';        Dir = '8769-ww2gi';        Port = 8769; Js = 'rednukem' },
    @{ Name = 'Platoon Leader'; Src = 'ww2plweb';       Dir = '8791-ww2-platoon';  Port = 8791; Js = 'rednukem' },
    @{ Name = 'Rides Again';   Src = 'rrridesagainweb'; Dir = '8772-rrridesagain'; Port = 8772; Js = 'rednukem' },
    @{ Name = 'Route 66';      Src = 'rrroute66web';    Dir = '8773-rrroute66';    Port = 8773; Js = 'rednukem' },
    @{ Name = 'Powerslave';     Src = 'powerslaveweb';   Dir = '8774-powerslave';   Port = 8774; Js = 'pcexhumed' },
    @{ Name = 'Shadow Warrior'; Src = 'swarriorweb';     Dir = '8775-swarrior';     Port = 8775; Js = 'voidsw' },
    @{ Name = 'Duke3D';         Src = 'duke3dweb';       Dir = '8776-duke3d';       Port = 8776; Js = 'eduke32' },
    @{ Name = 'TekWar';         Src = 'tekwarweb';       Dir = '8777-tekwar';       Port = 8777; Js = 'etekwar' },
    @{ Name = 'Liquidator';     Src = 'liquidatorweb';   Dir = '8778-liquidator';   Port = 8778; Js = 'eduke32' },
    @{ Name = 'Plunder';        Src = 'plunderweb';      Dir = '8786-plunder';    Port = 8786; Js = 'eduke32' },
    @{ Name = 'Twin Dragon';    Src = 'swtdweb';         Dir = '8787-sw-twindragon'; Port = 8787; Js = 'voidsw' },
    @{ Name = 'Wanton Destruction'; Src = 'swwdweb';     Dir = '8788-sw-wanton';    Port = 8788; Js = 'voidsw' },
    @{ Name = 'Quest Hussein';    Src = 'qfhweb';        Dir = '8789-quest-hussein'; Port = 8789; Js = 'eduke32' },
    @{ Name = 'Quest Al-Qaeda';   Src = 'qfblweb';       Dir = '8790-quest-alqaeda'; Port = 8790; Js = 'eduke32' },
    @{ Name = 'Witchaven';      Src = 'witchavenweb';    Dir = '8783-witchaven';    Port = 8783; Js = 'ewitchaven' },
    @{ Name = 'Witchaven II';   Src = 'witchaven2web';   Dir = '8784-witchaven2';   Port = 8784; Js = 'ewitchaven' }
)

if ($Only.Count -gt 0) {
    $ports = @($ports | Where-Object { $Only -contains $_.Name })
    if (-not $ports.Count) { Write-Error "No ports matched -Only: $($Only -join ', ')" }
}

if (-not (Test-Path $ServeTpl)) { Write-Error "Missing serve-template.py" }

foreach ($p in $ports) {
    $srcWeb = Join-Path (Join-Path $Desktop $p.Src) 'web'
    $dest = Join-Path $Root $p.Dir
    if (-not (Test-Path (Join-Path $srcWeb 'run.html'))) {
        Write-Warning "Skip $($p.Name): no build at $srcWeb"
        continue
    }
    $dataFile = Join-Path $srcWeb "$($p.Js).data"
    if (-not (Test-Path $dataFile)) {
        Write-Warning "Skip $($p.Name): missing $($p.Js).data (build not finished?)"
        continue
    }
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory -Path $dest | Out-Null
    foreach ($f in @('run.html')) {
        Copy-Item (Join-Path $srcWeb $f) (Join-Path $dest $f) -Force
    }
    $savesJs = Join-Path $srcWeb 'saves.js'
    if (Test-Path $savesJs) { Copy-Item $savesJs (Join-Path $dest 'saves.js') -Force }
    foreach ($ext in @('js', 'wasm', 'data')) {
        $bin = "$($p.Js).$ext"
        Copy-Item (Join-Path $srcWeb $bin) (Join-Path $dest $bin) -Force
    }
    $img = Join-Path $srcWeb 'indeximg.png'
    if (Test-Path $img) { Copy-Item $img (Join-Path $dest 'indeximg.png') -Force }
    $leninIni = Join-Path $srcWeb 'blood-lenin.ini'
    if (Test-Path $leninIni) { Copy-Item $leninIni (Join-Path $dest 'blood-lenin.ini') -Force }
    $leninGui = Join-Path $srcWeb 'gui-lenin.rff'
    if (Test-Path $leninGui) { Copy-Item $leninGui (Join-Path $dest 'gui-lenin.rff') -Force }
    $leninSnd = Join-Path $srcWeb 'sounds-lenin.rff'
    if (Test-Path $leninSnd) { Copy-Item $leninSnd (Join-Path $dest 'sounds-lenin.rff') -Force }
    foreach ($n in @(3, 6, 7, 8, 9, 10, 11, 12, 14, 15)) {
        $art = Join-Path $srcWeb ("tiles{0:D3}-lenin.art" -f $n)
        if (Test-Path $art) { Copy-Item $art (Join-Path $dest ("tiles{0:D3}-lenin.art" -f $n)) -Force }
    }
    Copy-Item $ServeTpl (Join-Path $dest 'serve.py') -Force
    $userGrp = Join-Path $Root 'usergrp.js'
    if (Test-Path $userGrp) { Copy-Item $userGrp (Join-Path $dest 'usergrp.js') -Force }
    Write-Host "OK $($p.Name) -> $($p.Dir) (port $($p.Port))"
}

$install = Join-Path $Root 'install-usergrp.ps1'
if (Test-Path $install) {
    Write-Host ""
    Write-Host "Note: sync overwrites run.html from *web projects."
    Write-Host "Re-apply usergrp patches: powershell -File install-usergrp.ps1"
}

Write-Host "Done."
