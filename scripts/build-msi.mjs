import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== Building System Storage & Port Inspector MSI Installer ===\n');

// 1. Build Frontend
console.log('1. Building frontend with Vite...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Pack asar
console.log('\n2. Packing application into app.asar...');
execSync('node scripts/pack-asar.mjs', { stdio: 'inherit' });

// 2.5 Ensure uninstall.bat exists in win-unpacked
console.log('\n2.5 Creating uninstall.bat in release/win-unpacked...');
const uninstallBatContent = `@echo off
title Uninstall System Storage & Port Inspector
echo ====================================================================
echo   Uninstalling System Storage ^& Port Inspector (SysPulse)
echo ====================================================================
echo.
echo Starting Windows Installer (msiexec /x)...
start /wait msiexec.exe /x {B6A87432-84F1-4F2A-949B-E412581699AB}
echo.
echo Uninstallation completed.
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
  '.\\tools\\wix\\light.exe -ext WixUIExtension -sval -out "release\\SystemStoragePortInspector_Setup.msi" "wix\\Product.wixobj" "wix\\AppFiles.wixobj"',
  { stdio: 'inherit' }
);

// 6. Copy to PC-App directory and current root
const targetDir = 'C:\\Users\\zeroy\\Desktop\\MyProject\\Apps\\PC-App';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.copyFileSync(
  'release/SystemStoragePortInspector_Setup.msi',
  path.join(targetDir, 'SystemStoragePortInspector_Setup.msi')
);
fs.copyFileSync(
  'release/SystemStoragePortInspector_Setup.msi',
  'SystemStoragePortInspector_Setup.msi'
);

const stats = fs.statSync(path.join(targetDir, 'SystemStoragePortInspector_Setup.msi'));
console.log(`\nSUCCESS: MSI created and exported to:`);
console.log(`  -> ${path.join(targetDir, 'SystemStoragePortInspector_Setup.msi')} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
