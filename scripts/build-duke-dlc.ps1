# Build eduke32.data for one Duke3D DLC and deploy to BuildWebGames port folder.
param(
    [Parameter(Mandatory)][ValidateSet('vacation','dc','nwinter','penthouse','all')]
    [string]$Dlc,
    [string]$EmsdkRoot = ''
)
$ErrorActionPreference = 'Stop'
$BuildRoot = Split-Path $PSScriptRoot -Parent
$Desktop = [Environment]::GetFolderPath('Desktop')
$Engine = Join-Path $Desktop 'duke3dweb\NBlood-master'
$BaseDuke = Join-Path $BuildRoot '8776-duke3d'

$ports = @{
    vacation  = @{ Dir = '8779-duke-vacation'; Args = @('-usecwd','-cfg','DUKE3D.CFG','-nologo','-g','vacation.grp') }
    dc        = @{ Dir = '8780-duke-dc';       Args = @('-usecwd','-cfg','DUKE3D.CFG','-nologo') }
    nwinter   = @{ Dir = '8781-duke-nwinter';  Args = @('-usecwd','-cfg','DUKE3D.CFG','-nologo','-g','NWINTER.GRP','-x','NWINTER.CON') }
    penthouse = @{ Dir = '8782-duke-penthouse'; Args = @('-usecwd','-cfg','DUKE3D.CFG','-nologo') }
}

if (-not $EmsdkRoot) {
    $blood = Join-Path $Desktop 'bloodweb\emsdk'
    if (Test-Path (Join-Path $blood 'emsdk_env.ps1')) { $EmsdkRoot = $blood }
}
$EnvPs1 = Join-Path $EmsdkRoot 'emsdk_env.ps1'
if (-not (Test-Path $EnvPs1)) { Write-Error "Emscripten not found at $EnvPs1" }
if (-not (Test-Path (Join-Path $BaseDuke 'eduke32.js'))) { Write-Error 'Missing 8776-duke3d build — build base Duke first' }

$dlcs = if ($Dlc -eq 'all') { @('vacation','dc','nwinter','penthouse') } else { @($Dlc) }

foreach ($id in $dlcs) {
    Write-Host "`n=== Building Duke DLC: $id ===" -ForegroundColor Cyan
    $gamedata = Join-Path $BuildRoot "dlc-build\$id\gamedata"
    & (Join-Path $PSScriptRoot 'stage-duke-dlc.ps1') -Dlc $id -OutDir $gamedata
    $preload = ((Resolve-Path $gamedata).Path -replace '\\', '/') + '@/'
    $env:EMSDK_QUIET = '1'
    Push-Location $Engine
    try {
        . $EnvPs1
        & make EMSCRIPTEN=1 HTML=0 WEBGAME=duke3d web "EMPRELOAD=$preload"
        if ($LASTEXITCODE -ne 0) { throw "make failed for $id" }
    } finally { Pop-Location }

    $dest = Join-Path $BuildRoot $ports[$id].Dir
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory -Path $dest | Out-Null

    foreach ($f in @('eduke32.js','eduke32.wasm','eduke32.data')) {
        Copy-Item (Join-Path $Engine $f) (Join-Path $dest $f) -Force
    }
    Copy-Item (Join-Path $BaseDuke 'saves.js') $dest -Force
    Copy-Item (Join-Path $BuildRoot 'serve-template.py') (Join-Path $dest 'serve.py') -Force

    $runSrc = Join-Path $BaseDuke 'run.html'
    $runDst = Join-Path $dest 'run.html'
    $argsLine = ($ports[$id].Args | ForEach-Object { "'$_'" }) -join ', '
    $html = Get-Content $runSrc -Raw
    $html = $html -replace "var gameArgs = \[[^\]]+\];", "var gameArgs = [$argsLine];"
    if ($id -eq 'dc') {
        $html = $html -replace 'preserveDrawingBuffer: true', 'preserveDrawingBuffer: false'
    }
    Set-Content -Path $runDst -Value $html -NoNewline
    if ($id -eq 'vacation') {
        Copy-Item (Join-Path $gamedata 'USER.CON') (Join-Path $dest 'USER.CON') -Force
    }
    Write-Host "OK -> $($ports[$id].Dir)" -ForegroundColor Green
}

Write-Host "`nDone. Ports 8779-8782 ready."
& (Join-Path $PSScriptRoot 'fix-loader-en.ps1')
