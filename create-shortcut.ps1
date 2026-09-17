# Creates a Desktop Shortcut for Human Healthcare Log on any PC
$scriptDir = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Human Healthcare Log.lnk"
$oldShortcutPath = Join-Path $desktop "HHC Patient Visit Sheet.lnk"

if (Test-Path $oldShortcutPath) {
    Remove-Item $oldShortcutPath -Force
}

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($shortcutPath)
$s.TargetPath = Join-Path $scriptDir "run-app.bat"
$s.WorkingDirectory = $scriptDir

$iconPath = Join-Path $scriptDir "app-icon.ico"
if (Test-Path $iconPath) {
    $s.IconLocation = $iconPath
}

$s.Save()
Write-Host "Human Healthcare Log shortcut successfully created on your Desktop!" -ForegroundColor Green
