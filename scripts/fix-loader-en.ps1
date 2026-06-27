# Replace Cyrillic / broken loader labels with ASCII English in all run.html files.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false

Get-ChildItem $root -Recurse -Filter run.html | ForEach-Object {
    $c = [IO.File]::ReadAllText($_.FullName, $utf8)
    $orig = $c

    $c = $c -replace '<div id="loader-text">[^<]*</div>', '<div id="loader-text">Loading</div>'
    $c = $c -replace 'setLoadProgress\(12 \+ p \* 0\.83, ''[^'']*''\)', "setLoadProgress(12 + p * 0.83, 'Loading data')"
    $c = $c -replace 'setLoadProgress\(100, ''[^'']*''\)', "setLoadProgress(100, 'Starting')"
    $c = $c -replace 'setLoadProgress\(2, ''[^'']*''\)', "setLoadProgress(2, 'Preparing')"
    $c = $c -replace 'setLoadProgress\(5, ''[^'']*''\)', "setLoadProgress(5, 'Your files')"
    $c = $c -replace 'setLoadProgress\(8, ''[^'']*''\)', "setLoadProgress(8, 'Loading scripts')"
    $c = $c -replace 'setLoadProgress\(10, ''[^'']*''\)', "setLoadProgress(10, 'Loading')"
    $c = $c -replace 'setLoadProgress\(12 \+ pct \* 0\.83, ''[^'']*''\)', "setLoadProgress(12 + pct * 0.83, 'Loading data')"
    $c = $c -replace 'setLoadProgress\(12, ''[^'']*''\)', "setLoadProgress(12, 'Loading data')"
    $c = $c -replace 'if \(/run/i\.test\(text\)\) setLoadProgress\(96, ''[^'']*''\)', "if (/run/i.test(text)) setLoadProgress(96, 'Starting')"
    $c = $c -replace 'setLoadProgress\(0, ''[^'']*serve\.py[^'']*''\)', "setLoadProgress(0, 'Open via serve.py')"
    $c = $c -replace 'setLoadProgress\(0, ''(?!Loading|Open via serve\.py)[^'']*''\)', "setLoadProgress(0, 'Error')"

    if ($c -ne $orig) {
        [IO.File]::WriteAllText($_.FullName, $c, $utf8)
        Write-Host "Updated: $($_.FullName)"
    }
}

Write-Host 'Done.'
