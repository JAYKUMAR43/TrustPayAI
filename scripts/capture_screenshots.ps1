$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$targets = @{
    "dashboard_overview" = "http://localhost:5173/#overview"
    "procurement_console" = "http://localhost:5173/#console"
    "mandate_security" = "http://localhost:5173/#mandates"
    "security_center" = "http://localhost:5173/#security"
    "audit_ledger" = "http://localhost:5173/#audit"
    "paypal_transactions" = "http://localhost:5173/#payments"
    "agent_fleet" = "http://localhost:5173/#agents"
    "policy_rules" = "http://localhost:5173/#policies"
}

foreach ($name in $targets.Keys) {
    $url = $targets[$name]
    $output = "D:\TrustPayAI\docs\screenshots\$name.png"
    Write-Host "Capturing $name from $url..."
    Start-Process -FilePath $edge -ArgumentList "--headless", "--window-size=1440,900", "--disable-gpu", "--screenshot=$output", $url -Wait
}
Write-Host "All screenshots captured successfully."
