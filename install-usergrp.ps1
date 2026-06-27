# Copy usergrp.js into game ports and enable ?usergrp=1 loading in run.html
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$SrcJs = Join-Path $Root 'usergrp.js'
if (-not (Test-Path $SrcJs)) { Write-Error 'Missing usergrp.js' }

$games = @(
    @{ Dir = '8767-redneck';      Js = 'rednukem.js';    Create = 'createRednukemModule' },
    @{ Dir = '8768-nam';          Js = 'rednukem.js';    Create = 'createRednukemModule' },
    @{ Dir = '8769-ww2gi';        Js = 'rednukem.js';    Create = 'createRednukemModule' },
    @{ Dir = '8791-ww2-platoon';  Js = 'rednukem.js';    Create = 'createRednukemModule' },
    @{ Dir = '8772-rrridesagain'; Js = 'rednukem.js';    Create = 'createRednukemModule' },
    @{ Dir = '8773-rrroute66';    Js = 'rednukem.js';    Create = 'createRednukemModule' },
    @{ Dir = '8774-powerslave';   Js = 'pcexhumed.js';   Create = 'createPCExhumedModule' },
    @{ Dir = '8775-swarrior';     Js = 'voidsw.js';      Create = 'createVoidswModule' },
    @{ Dir = '8776-duke3d';       Js = 'eduke32.js';     Create = 'createEDuke32Module' },
    @{ Dir = '8778-liquidator';   Js = 'eduke32.js';     Create = 'createEDuke32Module' },
    @{ Dir = '8786-plunder';      Js = 'eduke32.js';     Create = 'createEDuke32Module' },
    @{ Dir = '8789-quest-hussein'; Js = 'eduke32.js';    Create = 'createEDuke32Module' },
    @{ Dir = '8790-quest-alqaeda'; Js = 'eduke32.js';   Create = 'createEDuke32Module' },
    @{ Dir = '8787-sw-twindragon'; Js = 'voidsw.js';     Create = 'createVoidswModule' },
    @{ Dir = '8788-sw-wanton';    Js = 'voidsw.js';     Create = 'createVoidswModule' },
    @{ Dir = '8777-tekwar';       Js = 'etekwar.js';     Create = 'createETekwarModule' },
    @{ Dir = '8783-witchaven';    Js = 'ewitchaven.js';  Create = 'createEWitchavenModule' },
    @{ Dir = '8784-witchaven2';   Js = 'ewitchaven.js';  Create = 'createEWitchavenModule' }
)

$marker = 'BEGW_USERGRP'
$prepareBlock = @"
    var useUserGrp = params.get('usergrp') === '1';

    loadSavesHelper()
      .then(function () {
        if (!useUserGrp) return;
        setLoadProgress(5, 'Ваши файлы');
        return loadScript('/usergrp.js?v=' + buildTag).then(function () {
          if (!window.BEGW_UserGrp) throw new Error('usergrp.js missing');
          return BEGW_UserGrp.prepare();
        });
      })
      .then(function () {
"@

foreach ($g in $games) {
    $destDir = Join-Path $Root $g.Dir
    if (-not (Test-Path $destDir)) {
        Write-Warning "Skip $($g.Dir): not found"
        continue
    }
    Copy-Item $SrcJs (Join-Path $destDir 'usergrp.js') -Force

    $run = Join-Path $destDir 'run.html'
    if (-not (Test-Path $run)) { continue }
    $text = Get-Content $run -Raw
    if ($text -match $marker) {
        Write-Host "OK $($g.Dir) (already patched)"
        continue
    }

    if ($text -notmatch 'loadSavesHelper\(\)\s*\r?\n\s*\.then\(function \(\) \{\s*\r?\n\s*setLoadProgress\(8') {
        Write-Warning "Skip patch $($g.Dir): unexpected run.html layout"
        continue
    }

    $text = $text -replace '(loadSavesHelper\(\)\s*\r?\n\s*\.then\(function \(\) \{\s*\r?\n\s*setLoadProgress\(8)', ($prepareBlock + "`r`n        setLoadProgress(8")

    $createPat = "return $($g.Create)\(\{"
    if ($text -notmatch [regex]::Escape($createPat)) {
        Write-Warning "Skip $($g.Dir): create call not found"
        continue
    }

    $inject = @"
        var gameArgs = $($null);
        var preRunHooks = [];
        if (useUserGrp && window.BEGW_UserGrp && BEGW_UserGrp.getPending()) {
          preRunHooks.push(function () { BEGW_UserGrp.mount(this); });
        }
        return $($g.Create)({
"@

    # Capture original arguments line
    if ($text -match "arguments:\s*(\[[^\]]+\])") {
        $origArgs = $Matches[1]
        $text = $text -replace [regex]::Escape($createPat), ($inject -replace '\$\(\$null\)', $origArgs)
        $text = $text -replace "(\s+)arguments:\s*\[[^\]]+\],", "`$1arguments: useUserGrp && window.BEGW_UserGrp ? BEGW_UserGrp.wrapArgs(gameArgs, BEGW_UserGrp.getPending()) : gameArgs,`r`n`$1preRun: preRunHooks,"
    } else {
        Write-Warning "Skip $($g.Dir): arguments line not found"
        continue
    }

    if ($text -notmatch $marker) {
        $text = $text -replace '(<script>\s*\r?\n\(function \(\) \{)', "`$1`r`n  /* $marker */"
    }

    Set-Content -Path $run -Value $text -NoNewline
    Write-Host "Patched $($g.Dir)"
}

Write-Host 'Done. usergrp.js installed.'
