# Renumber Caribbean USER.CON: drop DUKEMATCH (vol 1), LIFE'S A BEACH -> vol 1, THE BIRTH -> vol 2.
param(
    [Parameter(Mandatory)][string]$Path
)
$ErrorActionPreference = 'Stop'
$text = [IO.File]::ReadAllText($Path)

if ($text -notmatch 'definevolumename 1 VACATION DUKEMATCH') {
    Write-Host "Already patched or unexpected format: $Path"
    return
}

$text = $text -replace '(?m)^definevolumeflags\s+1\s.*\r?\n', ''
$text = $text -replace '(?m)^undefinevolume\s+1\s*\r?\n', ''
$text = $text -replace '(?m)^definevolumename 1 VACATION DUKEMATCH\s*\r?\n', ''
$text = $text -replace "definevolumename 2 LIFE'S A BEACH", "definevolumename 1 LIFE'S A BEACH"
$text = $text -replace 'definevolumename 3 THE BIRTH', "definevolumename 2 THE BIRTH"

$text = $text -replace '(?m)^definelevelname 1 \d+ VACADM[^\r\n]*\r?\n', ''
$text = $text -replace '(?m)^definelevelname 1 \d+ E2L[^\r\n]*\r?\n', ''

$text = $text -replace 'definelevelname 3 ', 'definelevelname __VOL3__ '
$text = $text -replace 'definelevelname 2 ', 'definelevelname 1 '
$text = $text -replace 'definelevelname __VOL3__ ', 'definelevelname 2 '

$text = $text -replace '(?ms)^music 2 PRTYCRUZ\.mid.+?^music 4 missimp\.mid.+?restrict\.mid\s*\r?\n', @"
music 2 IRIEPRTY.mid DUKE-O.mid IRIEPRTY.MID PRTYCRUZ.mid JUNGVEIN.mid SOL-MAN1.mid
        DOOMSDAY.mid SOL-MAN1.mid urban.mid spook.mid whomp.mid

music 3 missimp.mid prepd.mid bakedgds.mid cf.mid lemchill.mid
       pob.mid warehaus.mid layers.mid floghorn.mid depart.mid restrict.mid

"@

[IO.File]::WriteAllText($Path, $text)
Write-Host "Patched: $Path"
