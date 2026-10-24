import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('   Building SysInfo v0.1.1 Distribution Packages    ');
console.log('====================================================\n');

const targetDir = 'C:\\Users\\zeroy\\Desktop\\MyProject\\Apps\\PC-App';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Build Frontend
console.log('1. Building frontend with Vite...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Build Windows NSIS & Portable Zip via electron-builder
console.log('\n2. Building Windows NSIS Installer (.exe) and Portable (.zip)...');
execSync('npx electron-builder --win nsis zip', { stdio: 'inherit' });

// 3. Build Windows MSI Installer via WiX
console.log('\n3. Building Windows MSI Installer (.msi)...');
execSync('node scripts/build-msi.mjs', { stdio: 'inherit' });

// 4. Export all artifacts to PC-App
console.log(`\n4. Exporting and synchronizing artifacts to ${targetDir}...`);

// Cleanup old names in PC-App so user is never confused
const oldFiles = [
  'System Storage & Port Inspector Setup.exe',
  'System Storage & Port Inspector Setup 0.0.3.exe',
  'SystemStoragePortInspector_Setup.msi',
  'System Storage & Port Inspector-win.zip',
  'System Storage & Port Inspector-0.0.3-win.zip'
];
for (const oldFile of oldFiles) {
  const p = path.join(targetDir, oldFile);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log(`  - Removed obsolete file: ${oldFile}`);
    } catch (e) {}
  }
}

// Copy NSIS Setup .exe
if (fs.existsSync('release/SysInfo-Setup-0.1.1.exe')) {
  fs.copyFileSync('release/SysInfo-Setup-0.1.1.exe', path.join(targetDir, 'SysInfo_Setup.exe'));
  fs.copyFileSync('release/SysInfo-Setup-0.1.1.exe', path.join(targetDir, 'SysInfo-Setup-0.1.1.exe'));
  console.log('  -> Copied SysInfo_Setup.exe & SysInfo-Setup-0.1.1.exe');
}

// Copy Portable .zip
if (fs.existsSync('release/SysInfo-0.1.1-win.zip')) {
  fs.copyFileSync('release/SysInfo-0.1.1-win.zip', path.join(targetDir, 'SysInfo_Portable.zip'));
  fs.copyFileSync('release/SysInfo-0.1.1-win.zip', path.join(targetDir, 'SysInfo-0.1.1-win.zip'));
  console.log('  -> Copied SysInfo_Portable.zip & SysInfo-0.1.1-win.zip');
}

// Copy MSI
if (fs.existsSync('release/SysInfo_Setup.msi')) {
  fs.copyFileSync('release/SysInfo_Setup.msi', path.join(targetDir, 'SysInfo_Setup.msi'));
  fs.copyFileSync('release/SysInfo_Setup.msi', path.join(targetDir, 'SysInfo-Setup-0.1.1.msi'));
  console.log('  -> Copied SysInfo_Setup.msi & SysInfo-Setup-0.1.1.msi');
}

console.log('\n====================================================');
console.log('   All v0.1.1 Installers Successfully Exported!     ');
console.log('====================================================\n');
