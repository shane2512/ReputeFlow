# Restore contracts from .bak
Write-Host "Restoring contracts from .bak..." -ForegroundColor Yellow

# Restore core contracts
Get-ChildItem -Path "contracts\core" -Filter "*.sol.bak" | ForEach-Object {
    $newName = $_.Name -replace '\.bak$', ''
    Rename-Item $_.FullName $newName
    Write-Host "  Restored: $($_.Name) -> $newName"
}

# Restore integration contracts
Get-ChildItem -Path "contracts\integrations" -Filter "*.sol.bak" | ForEach-Object {
    $newName = $_.Name -replace '\.bak$', ''
    Rename-Item $_.FullName $newName
    Write-Host "  Restored: $($_.Name) -> $newName"
}

# Restore test contracts
Get-ChildItem -Path "contracts\test" -Filter "*.sol.bak" -ErrorAction SilentlyContinue | ForEach-Object {
    $newName = $_.Name -replace '\.bak$', ''
    Rename-Item $_.FullName $newName
    Write-Host "  Restored: $($_.Name) -> $newName"
}

Write-Host "`n✅ Done! All contracts restored." -ForegroundColor Green
