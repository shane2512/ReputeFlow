# Temporarily rename contracts to prevent compilation
Write-Host "Renaming contracts to .bak..." -ForegroundColor Yellow

# Rename core contracts
Get-ChildItem -Path "contracts\core" -Filter "*.sol" | ForEach-Object {
    $newName = $_.Name + ".bak"
    Rename-Item $_.FullName $newName
    Write-Host "  Renamed: $($_.Name) -> $newName"
}

# Rename other integration contracts (except Yellow)
Get-ChildItem -Path "contracts\integrations" -Filter "*.sol" | Where-Object { $_.Name -ne "YellowChannelManager.sol" } | ForEach-Object {
    $newName = $_.Name + ".bak"
    Rename-Item $_.FullName $newName
    Write-Host "  Renamed: $($_.Name) -> $newName"
}

# Rename test contracts
Get-ChildItem -Path "contracts\test" -Filter "*.sol" -ErrorAction SilentlyContinue | ForEach-Object {
    $newName = $_.Name + ".bak"
    Rename-Item $_.FullName $newName
    Write-Host "  Renamed: $($_.Name) -> $newName"
}

Write-Host "`n✅ Done! Only YellowChannelManager.sol will be compiled." -ForegroundColor Green
