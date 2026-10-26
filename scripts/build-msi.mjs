import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version || '0.1.3';

console.log(`=== Building SysInfo v${version} MSI Installer ===\n`);

// 1. Build Frontend
console.log('1. Building frontend with Vite...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Pack asar
console.log('\n2. Packing application into app.asar...');
execSync('node scripts/pack-asar.mjs', { stdio: 'inherit' });

// 2.5 Ensure smart uninstall.bat exists in win-unpacked
console.log('\n2.5 Creating smart uninstall.bat in release/win-unpacked...');
const uninstallBatContent = `@echo off
setlocal enabledelayedexpansion
title Uninstall SysInfo
echo ====================================================================
echo   Uninstalling SysInfo
echo ====================================================================
echo.

:: 1. Self-elevate to Administrator if not already elevated
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: 2. Terminate any running instances of the app so no files are in use
echo 1. Terminating running application processes...
taskkill /F /IM "sysinfo.exe" /T >nul 2>&1
taskkill /F /IM "SysInfo.exe" /T >nul 2>&1
taskkill /F /IM "System Storage & Port Inspector.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: 3. Check for NSIS uninstaller first
if exist "%~dp0Uninstall SysInfo.exe" (
    echo 2. Running NSIS Uninstaller cleanly...
    start "" /wait "%~dp0Uninstall SysInfo.exe" /S
    goto CLEANUP
)
if exist "%~dp0Uninstall System Storage & Port Inspector.exe" (
    echo 2. Running NSIS Uninstaller cleanly...
    start "" /wait "%~dp0Uninstall System Storage & Port Inspector.exe" /S
    goto CLEANUP
)

:: 4. Search for MSI ProductCode in Registry and uninstall via msiexec
echo 2. Locating Windows Installer (MSI) registration...
set PRODUCT_CODE=
for /f "usebackq tokens=*" %%A in (\`powershell -NoProfile -Command "try { $p = Get-ItemProperty 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq 'SysInfo' -or $_.DisplayName -eq 'System Storage & Port Inspector' } | Select-Object -First 1; if ($p.PSChildName) { $p.PSChildName } elseif ($p.UninstallString -match '\{[A-Fa-f0-9-]+\}') { $matches[0] } } catch {}"\`) do (
    set PRODUCT_CODE=%%A
)

if not "%PRODUCT_CODE%"=="" (
    echo Found ProductCode: %PRODUCT_CODE%
    echo Starting clean MSI removal without reboot...
    start "" /wait msiexec.exe /x %PRODUCT_CODE% /qb REBOOT=ReallySuppress
    goto CLEANUP
)

echo MSI registration not found directly. Searching with UpgradeCode...
for /f "usebackq tokens=*" %%B in (\`powershell -NoProfile -Command "try { $u = '{B6A87432-84F1-4F2A-949B-E412581699AB}'; Get-CimInstance Win32_Property -Filter \"Property = 'UpgradeCode' and Value = '$u'\" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProductCode -First 1 } catch {}"\`) do (
    set PRODUCT_CODE=%%B
)

if not "%PRODUCT_CODE%"=="" (
    echo Found ProductCode: %PRODUCT_CODE%
    start "" /wait msiexec.exe /x %PRODUCT_CODE% /qb REBOOT=ReallySuppress
    goto CLEANUP
)

:CLEANUP
echo 3. Performing final cleanup...
del /f /q "%PUBLIC%\\Desktop\\SysInfo.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\\Desktop\\SysInfo.lnk" >nul 2>&1
del /f /q "%PUBLIC%\\Desktop\\System Storage & Port Inspector.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\\Desktop\\System Storage & Port Inspector.lnk" >nul 2>&1
rd /s /q "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SysInfo" >nul 2>&1
rd /s /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\SysInfo" >nul 2>&1
rd /s /q "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\System Storage & Port Inspector" >nul 2>&1
rd /s /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\System Storage & Port Inspector" >nul 2>&1

echo.
echo ====================================================================
echo   Uninstallation Completed Successfully (No Restart Needed)
echo ====================================================================
timeout /t 3
exit
`;
fs.writeFileSync('release/win-unpacked/uninstall.bat', uninstallBatContent, 'utf8');

// 3. Harvest WiX files
console.log('\n3. Harvesting files with heat.exe...');
execSync(
  '.\\tools\\wix\\heat.exe dir "release\\win-unpacked" -cg AppFiles -dr INSTALLFOLDER -scom -sreg -sfrag -srd -gg -var "var.SourceDir" -out "wix\\AppFiles.wxs"',
  { stdio: 'inherit' }
);

// 4. WiX Candle
console.log('\n4. Compiling WiX sources with candle.exe...');
execSync(
  '.\\tools\\wix\\candle.exe -arch x64 -ext WixUIExtension -dSourceDir="release\\win-unpacked" -out wix\\ "wix\\Product.wxs" "wix\\AppFiles.wxs"',
  { stdio: 'inherit' }
);

// 5. WiX Light
console.log('\n5. Linking MSI package with light.exe...');
execSync(
  '.\\tools\\wix\\light.exe -ext WixUIExtension -sval -out "release\\SysInfo_Setup.msi" "wix\\Product.wixobj" "wix\\AppFiles.wixobj"',
  { stdio: 'inherit' }
);

// 6. Copy to PC-App directory and current root
const targetDir = 'C:\\Users\\zeroy\\Desktop\\MyProject\\Apps\\PC-App';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.copyFileSync(
  'release/SysInfo_Setup.msi',
  path.join(targetDir, 'SysInfo_Setup.msi')
);
fs.copyFileSync(
  'release/SysInfo_Setup.msi',
  path.join(targetDir, `SysInfo-Setup-${version}.msi`)
);
fs.copyFileSync(
  'release/SysInfo_Setup.msi',
  'SysInfo_Setup.msi'
);

const stats = fs.statSync(path.join(targetDir, 'SysInfo_Setup.msi'));
console.log(`\nSUCCESS: MSI created and exported to:`);
console.log(`  -> ${path.join(targetDir, 'SysInfo_Setup.msi')} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
