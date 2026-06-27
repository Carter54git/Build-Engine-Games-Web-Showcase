# Stage gamedata for a Duke3D DLC web build (Emscripten FS is case-sensitive).
param(
    [Parameter(Mandatory)][ValidateSet('vacation','dc','nwinter','penthouse')]
    [string]$Dlc,
    [string]$OutDir = ''
)
$ErrorActionPreference = 'Stop'
$Desktop = [Environment]::GetFolderPath('Desktop')
$BuildRoot = Split-Path $PSScriptRoot -Parent
$DlcRoot = Join-Path $Desktop 'duke3dlc'
$DukeBase = Join-Path $Desktop 'duke3dweb\gamefiles'

$exclude = @('*.exe','*.EXE','*.bat','*.BAT','*.html','*.HTM','*.doc','*.DOC',
    'GNU.TXT','readme.txt','releasenotes.html','LICENSE.DOC','DUKE3D.ori','COMMIT.EXE',
    'DN3DHELP.EXE','SETMAIN.EXE','SETUP.EXE','Checkver.exe','NW95.EXE','NWMAIN.EXE','SWTC.EXE')

$sources = @{
    vacation  = @{ Folder = "Duke Caribbean Life's a Beach"; Grp = @('DUKE3D.GRP','vacation.grp') }
    dc        = @{ Folder = 'Duke it out in DC'; Grp = @('DUKE3D.GRP') }
    nwinter   = @{ Folder = 'Nuclear Winter'; Grp = @('DUKE3D.GRP','NWINTER.GRP') }
    penthouse = @{ Folder = 'Penthouse Paradise'; Grp = @('DUKE3D.GRP') }
}

if (-not $OutDir) { $OutDir = Join-Path $BuildRoot "dlc-build\$Dlc\gamedata" }
$src = Join-Path $DlcRoot $sources[$Dlc].Folder
if (-not (Test-Path $src)) { Write-Error "Missing DLC folder: $src" }

if (Test-Path $OutDir) { Remove-Item -Recurse -Force $OutDir }
New-Item -ItemType Directory -Path $OutDir | Out-Null

function Get-EmscriptenName {
    param([string]$Name)
    if ($Name -match '\.MAP$') { return ($Name.Substring(0, $Name.Length - 4).ToUpper() + '.map') }
    if ($Name -eq 'VACATION.GRP') { return 'vacation.grp' }
    if ($Name -eq 'ppakpent.map') { return 'PPAKPENT.map' }
    if ($Name -eq 'PENTHOUS.MAP') { return 'PENTHOUS.map' }
    if ($Name -match '(?i)^TILES(\d+)\.ART$') { return ('tiles{0:d3}.art' -f [int]$Matches[1]) }
    if ($Name -eq 'ppakgame.con') { return 'PPAKGAME.CON' }
    if ($Name -eq 'ppakdefs.con') { return 'PPAKDEFS.CON' }
    if ($Name -eq 'ppakuser.con') { return 'PPAKUSER.CON' }
    return $Name
}

function Copy-EmscriptenFile {
    param([string]$SrcFile, [string]$DstDir)
    $leaf = Split-Path $SrcFile -Leaf
    $destName = Get-EmscriptenName $leaf
    $final = Join-Path $DstDir $destName
    $tmp = Join-Path $DstDir ('__stg_' + [guid]::NewGuid().ToString('N'))
    Copy-Item $SrcFile $tmp -Force
    if (Test-Path $final) { Remove-Item $final -Force }
    Move-Item $tmp $final -Force
}

function Copy-GameFiles {
    param([string]$From, [switch]$DlcOnly)
    Get-ChildItem $From -File | Where-Object {
        $skip = $false
        foreach ($pat in $exclude) {
            if ($_.Name -like $pat) { $skip = $true; break }
        }
        -not $skip
    } | ForEach-Object {
        if ($DlcOnly -and $_.Name -eq 'DUKE3D.GRP') { return }
        Copy-EmscriptenFile $_.FullName $OutDir
    }
}

switch ($Dlc) {
    'penthouse' {
        if (-not (Test-Path (Join-Path $DukeBase 'DUKE3D.GRP'))) {
            Write-Error 'Missing duke3dweb\gamefiles\DUKE3D.GRP for Penthouse base'
        }
        Get-ChildItem $DukeBase -File | ForEach-Object { Copy-EmscriptenFile $_.FullName $OutDir }
        Copy-GameFiles -From $src -DlcOnly
        foreach ($pair in @(
            @{ Src = 'ppakdefs.con'; Dst = 'DEFS.CON' },
            @{ Src = 'ppakuser.con'; Dst = 'USER.CON' },
            @{ Src = 'ppakgame.con'; Dst = 'GAME.CON' }
        )) {
            $from = Join-Path $src $pair.Src
            if (-not (Test-Path $from)) { Write-Error "Missing Penthouse file: $from" }
            Copy-EmscriptenFile $from $OutDir
            $canonical = Get-EmscriptenName (Split-Path $from -Leaf)
            Copy-Item (Join-Path $OutDir $canonical) (Join-Path $OutDir $pair.Dst) -Force
        }
    }
    default {
        Copy-GameFiles -From $src
    }
}

foreach ($grp in $sources[$Dlc].Grp) {
    if (-not (Test-Path (Join-Path $OutDir $grp))) {
        Write-Error "Staged gamedata missing $grp"
    }
}

function Set-CfgValue {
    param([string]$Path, [string]$Key, [string]$Value)
    if (-not (Test-Path $Path)) { return }
    $text = Get-Content $Path -Raw
    $pat = "(?m)^$([regex]::Escape($Key))\s*=.*$"
    if ($text -match $pat) { $text = $text -replace $pat, "$Key = $Value" }
    else { $text += "`r`n$Key = $Value" }
    Set-Content -Path $Path -Value $text -NoNewline
}

$dukeCfg = Join-Path $OutDir 'DUKE3D.CFG'
if (Test-Path $dukeCfg) {
    Copy-Item $dukeCfg (Join-Path $OutDir 'eduke32.cfg') -Force
    Set-CfgValue $dukeCfg 'MusicToggle' '0'
    Set-CfgValue $dukeCfg 'SoundToggle' '0'
    Set-CfgValue $dukeCfg 'ScreenWidth' '960'
    Set-CfgValue $dukeCfg 'ScreenHeight' '540'
    Set-CfgValue $dukeCfg 'ScreenMode' '1'
    Set-CfgValue (Join-Path $OutDir 'eduke32.cfg') 'MusicToggle' '0'
    Set-CfgValue (Join-Path $OutDir 'eduke32.cfg') 'SoundToggle' '0'
    Set-CfgValue (Join-Path $OutDir 'eduke32.cfg') 'ScreenWidth' '960'
    Set-CfgValue (Join-Path $OutDir 'eduke32.cfg') 'ScreenHeight' '540'
    Set-CfgValue (Join-Path $OutDir 'eduke32.cfg') 'ScreenMode' '1'
}

if ($Dlc -eq 'dc') {
    @(
        'r_flatsky 0',
        'r_parallaxskypanning 0',
        'r_parallaxskyclamping 0',
        'r_skyzbufferhack 1'
    ) | Set-Content -Path (Join-Path $OutDir 'autoexec.cfg') -Encoding ASCII
}

if ($Dlc -eq 'vacation') {
    & (Join-Path $PSScriptRoot 'patch-vacation-usercon.ps1') -Path (Join-Path $OutDir 'USER.CON')
}

$count = (Get-ChildItem $OutDir -Recurse -File).Count
Write-Host "Staged $Dlc : $count files -> $OutDir"
