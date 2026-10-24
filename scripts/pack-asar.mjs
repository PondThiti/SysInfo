import asar from '@electron/asar';
import fs from 'fs';
import path from 'path';

async function packAsar() {
  const stagingDir = './build_staging';
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // 1. Copy package.json
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const minimalPkg = {
    name: pkg.name,
    version: pkg.version,
    main: 'electron/main.cjs',
  };
  fs.writeFileSync(path.join(stagingDir, 'package.json'), JSON.stringify(minimalPkg, null, 2));

  // 2. Copy electron directory
  fs.cpSync('./electron', path.join(stagingDir, 'electron'), { recursive: true });

  // 3. Copy dist directory
  fs.cpSync('./dist', path.join(stagingDir, 'dist'), { recursive: true });

  // 4. Create app.asar in release/win-unpacked/resources/app.asar
  const destAsar = './release/win-unpacked/resources/app.asar';
  console.log('Packaging app.asar into', destAsar);
  await asar.createPackage(stagingDir, destAsar);

  // Clean staging
  fs.rmSync(stagingDir, { recursive: true, force: true });
  console.log('Successfully created updated app.asar!');
}

packAsar().catch(console.error);
