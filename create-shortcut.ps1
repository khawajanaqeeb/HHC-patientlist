# Creates a Desktop Shortcut for HHC Patient Visit Sheet on any PC
$scriptDir = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "HHC Patient Visit Sheet.lnk"

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($shortcutPath)
$s.TargetPath = Join-Path $scriptDir "run-app.bat"
$s.WorkingDirectory = $scriptDir

$iconPath = Join-Path $scriptDir "app-icon.ico"
if (Test-Path $iconPath) {
    $s.IconLocation = $iconPath
}

$s.Save()
Write-Host "Desktop shortcut successfully created on your Desktop!" -ForegroundColor Green
