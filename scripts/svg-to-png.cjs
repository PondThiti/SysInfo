const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true
      }
    });

    const svgPath = path.resolve(__dirname, '../icon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body { margin: 0; padding: 0; width: 512px; height: 512px; background: transparent; overflow: hidden; }
            svg { width: 512px; height: 512px; display: block; }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    // Wait for render
    await new Promise(r => setTimeout(r, 1000));
    const image = await win.capturePage();
    const pngBuf = image.toPNG();
    fs.writeFileSync(path.resolve(__dirname, '../build/icon_512.png'), pngBuf);
    console.log('Successfully captured PNG, size:', pngBuf.length);
  } catch (err) {
    console.error('Error in capture:', err);
  } finally {
    app.quit();
    process.exit(0);
  }
});
