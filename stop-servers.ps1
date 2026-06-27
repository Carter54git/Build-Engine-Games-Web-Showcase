# Stop Python HTTP servers on BuildWebGames ports (old multi-server setup + unified).
$ports = 8760..8782
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -match 'python') {
            Write-Host "Stop PID $($p.Id) on port $port ($($p.Path))"
            Stop-Process -Id $p.Id -Force
        }
    }
}
Write-Host "Done. Now run: powershell -File start-servers.ps1"
