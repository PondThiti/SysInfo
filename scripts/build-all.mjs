import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version || '0.1.2';

console.log('====================================================');
console.log(`   Building SysInfo v${version} Distribution Packages    `);
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

// Cleanup old files in PC-App (remove old versions and legacy naming)
if (fs.existsSync(targetDir)) {
  const dirFiles = fs.readdirSync(targetDir);
  for (const f of dirFiles) {
    // If it's a versioned SysInfo file with different version, or an obsolete app file, remove it
    const isOldVersionSysInfo = /^(SysInfo-Setup-|SysInfo-)[0-9]+\.[0-9]+(\.[0-9]+)?.*(\.exe|\.msi|\.zip)$/i.test(f) && !f.includes(version);
    const isLegacyApp = /SystemStorage|System Storage/i.test(f);
    if (isOldVersionSysInfo || isLegacyApp) {
      const p = path.join(targetDir, f);
      try {
        fs.unlinkSync(p);
        console.log(`  - Removed obsolete file: ${f}`);
      } catch (e) {
        console.error(`  ! Failed to remove ${f}: ${e.message}`);
      }
    }
  }
}

// Copy NSIS Setup .exe
const nsisFile = `release/SysInfo-Setup-${version}.exe`;
if (fs.existsSync(nsisFile)) {
  fs.copyFileSync(nsisFile, path.join(targetDir, 'SysInfo_Setup.exe'));
  fs.copyFileSync(nsisFile, path.join(targetDir, `SysInfo-Setup-${version}.exe`));
  console.log(`  -> Copied SysInfo_Setup.exe & SysInfo-Setup-${version}.exe`);
}

// Copy Portable .zip
const zipFile = `release/SysInfo-${version}-win.zip`;
if (fs.existsSync(zipFile)) {
  fs.copyFileSync(zipFile, path.join(targetDir, 'SysInfo_Portable.zip'));
  fs.copyFileSync(zipFile, path.join(targetDir, `SysInfo-${version}-win.zip`));
  console.log(`  -> Copied SysInfo_Portable.zip & SysInfo-${version}-win.zip`);
}

// Copy MSI
if (fs.existsSync('release/SysInfo_Setup.msi')) {
  fs.copyFileSync('release/SysInfo_Setup.msi', path.join(targetDir, 'SysInfo_Setup.msi'));
  fs.copyFileSync('release/SysInfo_Setup.msi', path.join(targetDir, `SysInfo-Setup-${version}.msi`));
  console.log(`  -> Copied SysInfo_Setup.msi & SysInfo-Setup-${version}.msi`);
}

console.log('\n====================================================');
console.log(`   All v${version} Installers Successfully Exported!     `);
console.log('====================================================\n');
