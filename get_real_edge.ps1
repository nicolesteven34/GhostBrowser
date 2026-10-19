$proc = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=D:\temp-edge-dump", "--headless=new", "https://fingerprint-scan.com/" -PassThru
Start-Sleep -Seconds 10
try {
    $tabs = Invoke-RestMethod -Uri "http://localhost:9222/json"
    $tab = $tabs | Where-Object { $_.url -like "*fingerprint-scan.com*" } | Select-Object -First 1
    if ($tab) {
        $ws = New-Object System.Net.WebSockets.ClientWebSocket
        $ct = New-Object System.Threading.CancellationToken
        $ws.ConnectAsync([uri]$tab.webSocketDebuggerUrl, $ct).Wait()
        
        $req = '{"id":1,"method":"Runtime.evaluate","params":{"expression":"JSON.stringify(window.FINGERPRINT_SCAN || null)","returnByValue":true}}'
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($req)
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
        $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
        
        $buffer = New-Object byte[] 65536
        $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
        $res = $ws.ReceiveAsync($recvSegment, $ct).Result
        $json = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $res.Count)
        $json | Out-File -FilePath "D:\real_edge_scan.json" -Encoding utf8
        Write-Output "REAL_EDGE_CAPTURED"
    } else {
        Write-Output "NO_TAB"
    }
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "D:\temp-edge-dump" -ErrorAction SilentlyContinue
}
