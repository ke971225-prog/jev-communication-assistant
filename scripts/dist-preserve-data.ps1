$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $rootDir 'release\win-unpacked\data'
$backupDir = Join-Path ([System.IO.Path]::GetTempPath()) ('communication-assistant-data-' + [guid]::NewGuid().ToString('N'))
$builder = Join-Path $rootDir 'node_modules\.bin\electron-builder.cmd'
$hadData = Test-Path -LiteralPath $dataDir
$exitCode = 0

try {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    if ($hadData) {
        Get-ChildItem -LiteralPath $dataDir -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $backupDir -Recurse -Force
        }
    }

    Push-Location $rootDir
    & $builder --win dir
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw "electron-builder 退出码: $exitCode" }
}
finally {
    if ($hadData) {
        if (Test-Path -LiteralPath $dataDir) { Remove-Item -LiteralPath $dataDir -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
        Get-ChildItem -LiteralPath $backupDir -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $dataDir -Recurse -Force
        }
    }
    if (Test-Path -LiteralPath $backupDir) { Remove-Item -LiteralPath $backupDir -Recurse -Force }
    if ((Get-Location).Path -eq $rootDir) { Pop-Location }
}

exit $exitCode
