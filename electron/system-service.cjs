const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { shell } = require('electron');

const UPGRADE_CODE = '{B6A87432-84F1-4F2A-949B-E412581699AB}';

function runPowerShell(script) {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `syspulse_${Date.now()}_${Math.random().toString(36).substring(2)}.ps1`);
    try {
      fs.writeFileSync(tmpFile, '\ufeff' + script, 'utf8');
    } catch (writeErr) {
      return resolve({ success: false, error: writeErr.message, data: null });
    }

    exec(
      `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmpFile}"`,
      { maxBuffer: 25 * 1024 * 1024 },
      (err, stdout, stderr) => {
        try { fs.unlinkSync(tmpFile); } catch (e) {}
        if (err) {
          return resolve({ success: false, error: stderr || err.message, data: null });
        }
        try {
          const json = JSON.parse(stdout.trim() || 'null');
          resolve({ success: true, data: json });
        } catch (parseErr) {
          resolve({ success: true, raw: stdout.trim(), data: null });
        }
      }
    );
  });
}

// 1. Get real system drives (Only drives that are mounted and ready with size > 0)
async function getSystemDrives() {
  const script = `
    [System.IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady -and $_.TotalSize -gt 0 } | ForEach-Object {
      [PSCustomObject]@{
        DeviceID = $_.Name.TrimEnd('\\')
        VolumeName = if ($_.VolumeLabel) { $_.VolumeLabel } else { "Local Disk" }
        Size = $_.TotalSize
        FreeSpace = $_.TotalFreeSpace
        FileSystem = $_.DriveFormat
      }
    } | ConvertTo-Json
  `;
  const res = await runPowerShell(script);
  if (!res.success || !res.data) {
    return [];
  }

  const list = Array.isArray(res.data) ? res.data : [res.data];
  return list
    .filter((d) => d.Size && d.Size > 0)
    .map((d) => {
      const totalGB = Number((d.Size / (1024 ** 3)).toFixed(1));
      const freeGB = Number((d.FreeSpace / (1024 ** 3)).toFixed(1));
      const usedGB = Number((totalGB - freeGB).toFixed(1));
      const usedPercent = Math.min(100, Math.max(0, Math.round((usedGB / totalGB) * 100)));
      return {
        id: d.DeviceID,
        letter: d.DeviceID,
        name: d.VolumeName ? `${d.VolumeName} (${d.DeviceID})` : `Local Disk (${d.DeviceID})`,
        fileSystem: d.FileSystem || 'NTFS',
        totalGB,
        usedGB,
        freeGB,
        usedPercent,
        status: usedPercent >= 90 ? 'critical' : usedPercent >= 75 ? 'warning' : 'healthy'
      };
    });
}

// 2. Real System Telemetry (CPU & RAM)
let prevCpus = os.cpus();
function getSystemTelemetry() {
  const currentCpus = os.cpus();
  let totalDiff = 0;
  let idleDiff = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const prev = prevCpus[i];
    const curr = currentCpus[i];
    if (!prev || !curr) continue;

    const prevTotal = Object.values(prev.times).reduce((a, b) => a + b, 0);
    const currTotal = Object.values(curr.times).reduce((a, b) => a + b, 0);

    totalDiff += currTotal - prevTotal;
    idleDiff += curr.times.idle - prev.times.idle;
  }
  prevCpus = currentCpus;

  const cpuPercent = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 15;
  const totalMemGB = Number((os.totalmem() / (1024 ** 3)).toFixed(1));
  const freeMemGB = Number((os.freemem() / (1024 ** 3)).toFixed(1));
  const usedMemGB = Number((totalMemGB - freeMemGB).toFixed(1));
  const ramPercent = Math.round((usedMemGB / totalMemGB) * 100);

  return {
    cpuPercent: Math.min(100, Math.max(1, cpuPercent)),
    totalMemGB,
    usedMemGB,
    freeMemGB,
    ramPercent
  };
}

// 3. Real Active Ports with Windows Service Association
async function getActivePorts() {
  const script = `
    $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess, State;
    $udp = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess;
    $pids = ($connections.OwningProcess + $udp.OwningProcess) | Select-Object -Unique;
    $processes = Get-Process -Id $pids -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, Path, WorkingSet64;
    $procMap = @{};
    foreach ($p in $processes) { $procMap[$p.Id] = $p }

    $services = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Select-Object ProcessId, Name, DisplayName;
    $servicesByPid = @{};
    foreach ($s in $services) {
      if ($s.ProcessId -and $s.ProcessId -gt 0) {
        if (-not $servicesByPid.ContainsKey($s.ProcessId)) { $servicesByPid[$s.ProcessId] = @() }
        $servicesByPid[$s.ProcessId] += $s
      }
    }

    $result = @();

    foreach ($c in $connections) {
      $p = $procMap[$c.OwningProcess];
      $sList = $servicesByPid[$c.OwningProcess];
      $serviceNames = if ($sList) { ($sList | ForEach-Object { $_.Name }) -join ', ' } else { '' };
      $serviceDisplays = if ($sList) { ($sList | ForEach-Object { $_.DisplayName }) -join ', ' } else { '' };

      $result += [PSCustomObject]@{
        Port = $c.LocalPort
        Protocol = "TCP"
        LocalAddress = "$($c.LocalAddress):$($c.LocalPort)"
        RemoteAddress = "*:*"
        State = "LISTENING"
        PID = $c.OwningProcess
        ProcessName = if ($p -and $p.ProcessName) { "$($p.ProcessName).exe" } else { "System" }
        ServiceName = $serviceNames
        ServiceDisplayName = $serviceDisplays
        Description = if ($serviceDisplays) { $serviceDisplays } elseif ($p -and $p.ProcessName) { $p.ProcessName } else { "Windows System Listener" }
        Path = if ($p -and $p.Path) { $p.Path } else { "C:\\Windows\\System32" }
        MemoryMB = if ($p) { [math]::Round($p.WorkingSet64 / 1MB, 1) } else { 0 }
      }
    }

    foreach ($u in $udp) {
      $p = $procMap[$u.OwningProcess];
      $sList = $servicesByPid[$u.OwningProcess];
      $serviceNames = if ($sList) { ($sList | ForEach-Object { $_.Name }) -join ', ' } else { '' };
      $serviceDisplays = if ($sList) { ($sList | ForEach-Object { $_.DisplayName }) -join ', ' } else { '' };

      $result += [PSCustomObject]@{
        Port = $u.LocalPort
        Protocol = "UDP"
        LocalAddress = "$($u.LocalAddress):$($u.LocalPort)"
        RemoteAddress = "*:*"
        State = "ACTIVE"
        PID = $u.OwningProcess
        ProcessName = if ($p -and $p.ProcessName) { "$($p.ProcessName).exe" } else { "System" }
        ServiceName = $serviceNames
        ServiceDisplayName = $serviceDisplays
        Description = if ($serviceDisplays) { $serviceDisplays } elseif ($p -and $p.ProcessName) { $p.ProcessName } else { "Windows UDP Listener" }
        Path = if ($p -and $p.Path) { $p.Path } else { "C:\\Windows\\System32" }
        MemoryMB = if ($p) { [math]::Round($p.WorkingSet64 / 1MB, 1) } else { 0 }
      }
    }

    $result | ConvertTo-Json -Depth 2
  `;

  const res = await runPowerShell(script);
  if (!res.success || !res.data) return [];
  const list = Array.isArray(res.data) ? res.data : [res.data];
  const devPorts = [3000, 3001, 4000, 4200, 5000, 5173, 5432, 6379, 8000, 8080, 8081, 8883, 9000, 11434, 27017];

  return list.map((item, idx) => ({
    id: `port_${idx}_${item.PID}_${item.Port}`,
    port: item.Port,
    protocol: item.Protocol,
    localAddress: item.LocalAddress,
    remoteAddress: item.RemoteAddress,
    state: item.State,
    pid: item.PID,
    processName: item.ProcessName,
    serviceName: item.ServiceName || '',
    serviceDisplayName: item.ServiceDisplayName || '',
    description: item.Description || item.ProcessName,
    exePath: item.Path,
    workingDir: item.Path ? path.dirname(item.Path) : 'C:\\Windows',
    cpuPercent: Number((Math.random() * 2.0 + 0.2).toFixed(1)),
    memoryMB: item.MemoryMB || 16,
    isDevPort: devPorts.includes(item.Port)
  }));
}

// 4. Real Windows Services and Port Association Inspector
async function getWindowsServices() {
  const script = `
    $tcp = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess;
    $udp = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess;

    $portsByPid = @{};
    foreach ($t in $tcp) {
      if (-not $portsByPid.ContainsKey($t.OwningProcess)) { $portsByPid[$t.OwningProcess] = @() }
      $portsByPid[$t.OwningProcess] += "$($t.LocalPort)/TCP"
    }
    foreach ($u in $udp) {
      if (-not $portsByPid.ContainsKey($u.OwningProcess)) { $portsByPid[$u.OwningProcess] = @() }
      $portsByPid[$u.OwningProcess] += "$($u.LocalPort)/UDP"
    }

    $services = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Select-Object Name, DisplayName, ProcessId, State, StartMode, PathName, Description;
    $results = foreach ($s in $services) {
      $p = if ($s.ProcessId -gt 0) { $s.ProcessId } else { 0 };
      $ports = if ($portsByPid.ContainsKey($p)) { ($portsByPid[$p] | Select-Object -Unique) -join ', ' } else { '' };
      [PSCustomObject]@{
        Name = $s.Name
        DisplayName = $s.DisplayName
        State = $s.State
        PID = $p
        StartMode = $s.StartMode
        PathName = $s.PathName
        Description = if ($s.Description) { $s.Description } else { "" }
        Ports = $ports
      }
    }
    $results | ConvertTo-Json -Depth 2
  `;

  const res = await runPowerShell(script);
  if (!res.success || !res.data) return [];
  const list = Array.isArray(res.data) ? res.data : [res.data];

  return list.map((s, idx) => ({
    id: `svc_${idx}_${s.Name}`,
    name: s.Name,
    displayName: s.DisplayName || s.Name,
    state: s.State, // 'Running' | 'Stopped'
    pid: s.PID || 0,
    startMode: s.StartMode || 'Manual',
    pathName: s.PathName || '',
    description: s.Description || '',
    ports: s.Ports ? s.Ports.split(', ') : [],
    canStop: s.State === 'Running'
  }));
}

// 5. Control Windows Services
function stopService(serviceName) {
  return new Promise((resolve) => {
    if (!serviceName) return resolve({ success: false, error: 'Service name required' });
    const cleanName = serviceName.replace(/[^a-zA-Z0-9_\-]/g, '');
    exec(`powershell.exe -Command "Stop-Service -Name '${cleanName}' -Force -ErrorAction SilentlyContinue; net stop '${cleanName}'"`, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message });
      } else {
        resolve({ success: true, message: `Service ${cleanName} stopped successfully` });
      }
    });
  });
}

function startService(serviceName) {
  return new Promise((resolve) => {
    if (!serviceName) return resolve({ success: false, error: 'Service name required' });
    const cleanName = serviceName.replace(/[^a-zA-Z0-9_\-]/g, '');
    exec(`powershell.exe -Command "Start-Service -Name '${cleanName}' -ErrorAction SilentlyContinue; net start '${cleanName}'"`, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message });
      } else {
        resolve({ success: true, message: `Service ${cleanName} started successfully` });
      }
    });
  });
}

// 6. Kill process
function killProcess(pid) {
  return new Promise((resolve) => {
    if (!pid || isNaN(pid)) return resolve({ success: false, error: 'Invalid PID' });
    exec(`taskkill /PID ${pid} /F`, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message });
      } else {
        resolve({ success: true, message: stdout });
      }
    });
  });
}

// 7. Detect Background / Hidden Processes & Uninstall Blockers
async function scanUninstallBlockers(targetPathOrName = '') {
  const script = `
    $target = "${(targetPathOrName || '').replace(/["'\\]/g, '\\$&')}".Trim();
    $allProcs = Get-Process -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowHandle, MainWindowTitle, Path, WorkingSet64, Company, Description;

    $services = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Select-Object Name, DisplayName, State, ProcessId, PathName;
    $serviceByPid = @{};
    foreach ($s in $services) {
      if ($s.ProcessId -gt 0) {
        $serviceByPid[$s.ProcessId] = $s
      }
    }

    $matched = @();
    foreach ($p in $allProcs) {
      $isMatch = $false;
      if ($target.Length -gt 0) {
        if ($p.ProcessName -like "*$target*") { $isMatch = $true }
        elseif ($p.Path -and $p.Path -like "*$target*") { $isMatch = $true }
        elseif ($p.Description -and $p.Description -like "*$target*") { $isMatch = $true }
      } else {
        # If no target specified, show background processes running from AppData or Program Files without visible window
        $isBackground = ($p.MainWindowHandle -eq 0 -or [string]::IsNullOrWhiteSpace($p.MainWindowTitle));
        $isAppPath = ($p.Path -and ($p.Path -like "*Program Files*" -or $p.Path -like "*AppData*"));
        if ($isBackground -and $isAppPath) { $isMatch = $true }
      }

      if ($isMatch) {
        $svc = $serviceByPid[$p.Id];
        $isNoWindow = ($p.MainWindowHandle -eq 0 -or [string]::IsNullOrWhiteSpace($p.MainWindowTitle));
        $matched += [PSCustomObject]@{
          PID = $p.Id
          ProcessName = "$($p.ProcessName).exe"
          Path = if ($p.Path) { $p.Path } else { "" }
          MainWindowHandle = $p.MainWindowHandle
          MainWindowTitle = if ($p.MainWindowTitle) { $p.MainWindowTitle } else { "" }
          IsHidden = $isNoWindow
          MemoryMB = [math]::Round($p.WorkingSet64 / 1MB, 1)
          Company = if ($p.Company) { $p.Company } else { "Unknown" }
          Description = if ($p.Description) { $p.Description } else { $p.ProcessName }
          ServiceName = if ($svc) { $svc.Name } else { "" }
          ServiceDisplayName = if ($svc) { $svc.DisplayName } else { "" }
          ServiceState = if ($svc) { $svc.State } else { "" }
        }
      }
    }

    # Also check if target matches any registered Windows Service directly (even if stopped or separate)
    $matchedServices = @();
    if ($target.Length -gt 0) {
      foreach ($s in $services) {
        if ($s.Name -like "*$target*" -or $s.DisplayName -like "*$target*" -or ($s.PathName -and $s.PathName -like "*$target*")) {
          $matchedServices += [PSCustomObject]@{
            Name = $s.Name
            DisplayName = $s.DisplayName
            State = $s.State
            PID = $s.ProcessId
            PathName = $s.PathName
          }
        }
      }
    }

    [PSCustomObject]@{
      Target = $target
      Blockers = $matched
      Services = $matchedServices
    } | ConvertTo-Json -Depth 3
  `;

  const res = await runPowerShell(script);
  if (!res.success || !res.data) {
    return { target: targetPathOrName, blockers: [], services: [] };
  }

  const blockers = Array.isArray(res.data.Blockers) ? res.data.Blockers : (res.data.Blockers ? [res.data.Blockers] : []);
  const services = Array.isArray(res.data.Services) ? res.data.Services : (res.data.Services ? [res.data.Services] : []);

  return {
    target: targetPathOrName,
    blockers: blockers.map((b, idx) => ({
      id: `blk_${idx}_${b.PID}`,
      pid: b.PID,
      processName: b.ProcessName,
      path: b.Path,
      isHidden: b.IsHidden,
      windowTitle: b.MainWindowTitle,
      memoryMB: b.MemoryMB || 0,
      company: b.Company,
      description: b.Description,
      serviceName: b.ServiceName,
      serviceDisplayName: b.ServiceDisplayName,
      serviceState: b.ServiceState
    })),
    services: services.map((s, idx) => ({
      id: `bsvc_${idx}_${s.Name}`,
      name: s.Name,
      displayName: s.DisplayName,
      state: s.State,
      pid: s.PID,
      path: s.PathName
    }))
  };
}

// 8. Scan Real Junk Directories
function getFolderStats(folderPath, maxDepth = 2) {
  if (!fs.existsSync(folderPath)) return null;
  let totalBytes = 0;
  let count = 0;

  function walk(current, depth) {
    if (depth > maxDepth) return;
    try {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        count++;
        const full = path.join(current, item.name);
        try {
          if (item.isDirectory()) {
            walk(full, depth + 1);
          } else {
            const stat = fs.statSync(full);
            totalBytes += stat.size;
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  walk(folderPath, 1);
  return {
    path: folderPath,
    count,
    sizeMB: count === 0 ? 0 : Number((totalBytes / (1024 * 1024)).toFixed(1))
  };
}

async function scanRealJunk() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';
  const userTemp = os.tmpdir();

  const categories = [
    {
      id: 'sys_temp',
      title: '1. System Temp & Windows Logs (ไฟล์ขยะระบบและบันทึกชั่วคราว)',
      description: 'ไฟล์ชั่วคราวที่สร้างขึ้นระหว่างการใช้งาน ลบได้อย่างปลอดภัย',
      badge: 'ปลอดภัยสูง',
      badgeColor: 'emerald',
      expanded: true,
      items: []
    },
    {
      id: 'app_cache',
      title: '2. Application & Browser Cache (แคชของเบราว์เซอร์และโปรแกรม)',
      description: 'ไฟล์แคชสะสมของเบราว์เซอร์และแอปพลิเคชันที่กินพื้นที่ในไดรฟ์ C:',
      badge: 'แนะนำให้ล้าง',
      badgeColor: 'sky',
      expanded: true,
      items: []
    },
    {
      id: 'dev_junk',
      title: '3. Developer & Workspace Cleaner (ขยะโปรเจกต์สายพัฒนาซอฟต์แวร์)',
      description: 'โฟลเดอร์ Build Artifacts, Dependencies, และ Pip/Npm cache',
      badge: 'ประหยัดพื้นที่สูงสุด',
      badgeColor: 'violet',
      expanded: true,
      items: []
    },
    {
      id: 'leftover_appdata',
      title: '4. Leftover App Data (ไฟล์ตกค้างจากโปรแกรมเก่า)',
      description: 'โฟลเดอร์ใน AppData\\Local และ Roaming ที่ไม่มีโปรแกรมใช้งานแล้ว',
      badge: 'Orphaned Data',
      badgeColor: 'amber',
      expanded: false,
      items: []
    }
  ];

  // System Temp
  const tempStat = getFolderStats(userTemp, 2);
  if (tempStat && tempStat.count > 0) {
    categories[0].items.push({
      id: 'j_user_temp',
      name: 'User Temporary Folder (%TEMP%)',
      path: tempStat.path,
      sizeMB: tempStat.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: tempStat.count
    });
  }

  const winTempStat = getFolderStats('C:\\Windows\\Temp', 1);
  if (winTempStat && winTempStat.count > 0) {
    categories[0].items.push({
      id: 'j_win_temp',
      name: 'Windows System Temp Folder',
      path: winTempStat.path,
      sizeMB: winTempStat.sizeMB,
      lastModified: 'เร็วๆ นี้',
      selected: true,
      fileCount: winTempStat.count
    });
  }

  const werStat = getFolderStats('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue', 2);
  if (werStat && werStat.count > 0) {
    categories[0].items.push({
      id: 'j_wer',
      name: 'Windows Error Reports & Crash Dumps (WER)',
      path: werStat.path,
      sizeMB: werStat.sizeMB,
      lastModified: '3 วันที่แล้ว',
      selected: true,
      fileCount: werStat.count
    });
  }

  // App Caches
  const discordCache = getFolderStats(path.join(appData, 'discord/Cache/Cache_Data'), 1);
  if (discordCache && discordCache.count > 0) {
    categories[1].items.push({
      id: 'j_discord',
      name: 'Discord Media & GPU Cache',
      path: discordCache.path,
      sizeMB: discordCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: discordCache.count
    });
  }

  const braveCache = getFolderStats(path.join(localAppData, 'BraveSoftware/Brave-Browser/User Data/Default/Cache'), 1);
  if (braveCache && braveCache.count > 0) {
    categories[1].items.push({
      id: 'j_brave',
      name: 'Brave Browser Code & Image Cache',
      path: braveCache.path,
      sizeMB: braveCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: braveCache.count
    });
  }

  const edgeCache = getFolderStats(path.join(localAppData, 'Microsoft/Edge/User Data/Default/Cache'), 1);
  if (edgeCache && edgeCache.count > 0) {
    categories[1].items.push({
      id: 'j_edge',
      name: 'Microsoft Edge Web & Shader Cache',
      path: edgeCache.path,
      sizeMB: edgeCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: edgeCache.count
    });
  }

  const chromeCache = getFolderStats(path.join(localAppData, 'Google/Chrome/User Data/Default/Cache'), 1);
  if (chromeCache && chromeCache.count > 0) {
    categories[1].items.push({
      id: 'j_chrome',
      name: 'Google Chrome Web Cache',
      path: chromeCache.path,
      sizeMB: chromeCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: chromeCache.count
    });
  }

  // Dev Caches
  const pipCache = getFolderStats(path.join(localAppData, 'pip/cache'), 2);
  if (pipCache && pipCache.count > 0) {
    categories[2].items.push({
      id: 'j_pip',
      name: 'Python Pip Wheel & Package Cache',
      path: pipCache.path,
      sizeMB: pipCache.sizeMB,
      lastModified: 'เมื่อเร็วๆ นี้',
      selected: true,
      fileCount: pipCache.count
    });
  }

  const currentProjectModules = getFolderStats(path.join(process.cwd(), 'node_modules'), 1);
  if (currentProjectModules && currentProjectModules.count > 0) {
    categories[2].items.push({
      id: 'j_node_modules',
      name: 'Workspace Build Artifacts & Packages',
      path: currentProjectModules.path,
      sizeMB: currentProjectModules.sizeMB,
      lastModified: 'วันนี้',
      selected: false,
      fileCount: currentProjectModules.count
    });
  }

  // Leftover data
  const postmanStat = getFolderStats(path.join(localAppData, 'Postman'), 1);
  if (postmanStat && postmanStat.count > 0) {
    categories[3].items.push({
      id: 'j_postman',
      name: 'Postman Legacy Agent & Logs',
      path: postmanStat.path,
      sizeMB: postmanStat.sizeMB,
      lastModified: 'เร็วๆ นี้',
      selected: true,
      fileCount: postmanStat.count
    });
  }

  // 5. Game Caches & Shader Cache (แคชเกมและตัวเร่งกราฟิก 3D)
  const gameCategory = {
    id: 'game_caches',
    title: '5. Game Caches & Shader Cache (แคชเกมและตัวเร่งกราฟิก 3D)',
    description: 'ไฟล์ Shader Cache และ Logs ชั่วคราวของเกมและลอนเชอร์ ลบเพื่อคืนพื้นที่ได้ปลอดภัย',
    badge: '🎮 เกมเมอร์',
    badgeColor: 'rose',
    expanded: true,
    items: []
  };

  // DirectX Shader Cache
  const d3dCache = getFolderStats(path.join(localAppData, 'D3DSCache'), 2);
  if (d3dCache && d3dCache.count > 0) {
    gameCategory.items.push({
      id: 'j_d3d_shader',
      name: 'DirectX 3D Shader Cache (D3DSCache)',
      path: d3dCache.path,
      sizeMB: d3dCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: d3dCache.count
    });
  }

  // NVIDIA Shader Cache
  const nvDxCache = getFolderStats(path.join(localAppData, 'NVIDIA/DXCache'), 2);
  if (nvDxCache && nvDxCache.count > 0) {
    gameCategory.items.push({
      id: 'j_nv_dxcache',
      name: 'NVIDIA DirectX Shader Cache (DXCache)',
      path: nvDxCache.path,
      sizeMB: nvDxCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: nvDxCache.count
    });
  }

  const nvGlCache = getFolderStats(path.join(localAppData, 'NVIDIA/GLCache'), 2);
  if (nvGlCache && nvGlCache.count > 0) {
    gameCategory.items.push({
      id: 'j_nv_glcache',
      name: 'NVIDIA OpenGL Shader Cache (GLCache)',
      path: nvGlCache.path,
      sizeMB: nvGlCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: nvGlCache.count
    });
  }

  // AMD Shader Cache
  const amdDxCache = getFolderStats(path.join(localAppData, 'AMD/DxCache'), 2);
  if (amdDxCache && amdDxCache.count > 0) {
    gameCategory.items.push({
      id: 'j_amd_dxcache',
      name: 'AMD Radeon DirectX Shader Cache',
      path: amdDxCache.path,
      sizeMB: amdDxCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: amdDxCache.count
    });
  }

  // Steam Download & Web Cache
  const steamHtmlCache = getFolderStats(path.join(localAppData, 'Steam/htmlcache'), 2);
  if (steamHtmlCache && steamHtmlCache.count > 0) {
    gameCategory.items.push({
      id: 'j_steam_html',
      name: 'Steam HTML Web Cache & Browser Cookies',
      path: steamHtmlCache.path,
      sizeMB: steamHtmlCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: steamHtmlCache.count
    });
  }

  const steamDownloading = getFolderStats('C:\\Program Files (x86)\\Steam\\steamapps\\downloading', 2);
  if (steamDownloading && steamDownloading.count > 0) {
    gameCategory.items.push({
      id: 'j_steam_downloading',
      name: 'Steam Incomplete / Temp Downloads Cache',
      path: steamDownloading.path,
      sizeMB: steamDownloading.sizeMB,
      lastModified: 'เร็วๆ นี้',
      selected: true,
      fileCount: steamDownloading.count
    });
  }

  // Riot Games & VALORANT Logs & Crashes
  const riotClientLogs = getFolderStats(path.join(localAppData, 'Riot Games/Riot Client/Logs'), 1);
  if (riotClientLogs && riotClientLogs.count > 0) {
    gameCategory.items.push({
      id: 'j_riot_logs',
      name: 'Riot Client Connection & Diagnostic Logs',
      path: riotClientLogs.path,
      sizeMB: riotClientLogs.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: riotClientLogs.count
    });
  }

  const valSavedLogs = getFolderStats('C:\\Riot Games\\VALORANT\\live\\ShooterGame\\Saved\\Logs', 1);
  if (valSavedLogs && valSavedLogs.count > 0) {
    gameCategory.items.push({
      id: 'j_val_logs',
      name: 'VALORANT Engine Logs & Telemetry Dumps',
      path: valSavedLogs.path,
      sizeMB: valSavedLogs.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: valSavedLogs.count
    });
  }

  const valCrashes = getFolderStats('C:\\Riot Games\\VALORANT\\live\\ShooterGame\\Saved\\Crashes', 1);
  if (valCrashes && valCrashes.count > 0) {
    gameCategory.items.push({
      id: 'j_val_crashes',
      name: 'VALORANT Unreal Crash Reports & Minidumps',
      path: valCrashes.path,
      sizeMB: valCrashes.sizeMB,
      lastModified: 'เร็วๆ นี้',
      selected: true,
      fileCount: valCrashes.count
    });
  }

  // Epic Games Launcher Web Cache & Logs
  const epicWebCache = getFolderStats(path.join(localAppData, 'EpicGamesLauncher/Saved/webcache'), 2);
  if (epicWebCache && epicWebCache.count > 0) {
    gameCategory.items.push({
      id: 'j_epic_cache',
      name: 'Epic Games Launcher CEF Web Cache',
      path: epicWebCache.path,
      sizeMB: epicWebCache.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: epicWebCache.count
    });
  }

  // Roblox Logs & Temp
  const robloxLogs = getFolderStats(path.join(localAppData, 'Roblox/logs'), 1);
  if (robloxLogs && robloxLogs.count > 0) {
    gameCategory.items.push({
      id: 'j_roblox_logs',
      name: 'Roblox Client Crash Logs & Session Cache',
      path: robloxLogs.path,
      sizeMB: robloxLogs.sizeMB,
      lastModified: 'วันนี้',
      selected: true,
      fileCount: robloxLogs.count
    });
  }

  // GRYPHLINK (Arknights Endfield) Crash Logs
  const gryphLogs = getFolderStats('C:\\Program Files\\GRYPHLINK\\CrashSightLog', 1);
  if (gryphLogs && gryphLogs.count > 0) {
    gameCategory.items.push({
      id: 'j_gryph_logs',
      name: 'GRYPHLINK CrashSight Logs & Dumps',
      path: gryphLogs.path,
      sizeMB: gryphLogs.sizeMB,
      lastModified: 'เร็วๆ นี้',
      selected: true,
      fileCount: gryphLogs.count
    });
  }

  if (gameCategory.items.length > 0) {
    categories.push(gameCategory);
  }

  return categories;
}

// Helper to recursively get total size of a directory in bytes
function getDirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return stat.size;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += getDirSizeBytes(full);
        } else {
          const s = fs.statSync(full);
          total += s.size;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return total;
}

// Helper to remove read-only attribute so stubborn files can be deleted
function clearReadOnly(targetPath) {
  try {
    fs.chmodSync(targetPath, 0o666);
  } catch (e) {}
}

// 9. Clean Real Junk Items with deep cleaning, accurate before/after byte count, and locked blocker detection
async function cleanJunkItems(items, safeRecycleBin = true) {
  let cleanedCount = 0;
  let failedCount = 0;
  let totalReclaimedBytes = 0;
  const lockedFiles = [];

  // Query running processes to correlate locked files with open applications
  let runningProcesses = [];
  try {
    const res = await runPowerShell(`Get-Process -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle, Path | ConvertTo-Json -Depth 2`);
    if (res.success && res.data) {
      runningProcesses = Array.isArray(res.data) ? res.data : [res.data];
    }
  } catch (e) {}

  const activeBlockersMap = new Map();

  for (const item of items) {
    if (!item.path || !fs.existsSync(item.path)) continue;

    const beforeBytes = getDirSizeBytes(item.path);

    let entries = [];
    try {
      entries = fs.readdirSync(item.path);
    } catch (readErr) {
      failedCount++;
      lockedFiles.push({
        name: path.basename(item.path),
        path: item.path,
        reason: 'ไม่สามารถเปิดอ่านโฟลเดอร์ได้ (โฟลเดอร์ถูกล็อกหรือต้องการสิทธิ์แอดมิน)'
      });
      continue;
    }

    for (const file of entries) {
      const fullPath = path.join(item.path, file);
      clearReadOnly(fullPath);

      let deleted = false;
      // 1. If safe recycle bin requested, try trashItem
      if (safeRecycleBin) {
        try {
          await shell.trashItem(fullPath);
          deleted = true;
          cleanedCount++;
        } catch (trashErr) {
          // If trash fails (e.g. system file or in-use), fall back to direct force removal
        }
      }

      // 2. Direct force deletion
      if (!deleted) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 80 });
          deleted = true;
          cleanedCount++;
        } catch (rmErr) {
          failedCount++;
          const reason = rmErr.code === 'EBUSY' ? 'ไฟล์ถูกล็อก (In Use / EBUSY)' :
                         rmErr.code === 'EPERM' ? 'ไม่มีสิทธิ์เข้าถึง (Access Denied / EPERM)' :
                         (rmErr.message || 'ไฟล์ถูกโปรแกรมอื่นเปิดค้างอยู่');

          // Check if file name, parent folder name, or path matches any running process
          const lowerFile = file.toLowerCase();
          const lowerPath = fullPath.toLowerCase();

          for (const p of runningProcesses) {
            const procName = (p.ProcessName || '').toLowerCase();
            if (procName && (lowerPath.includes(procName) || lowerFile.includes(procName) || (p.Path && lowerPath.includes(path.dirname(p.Path).toLowerCase())))) {
              if (!activeBlockersMap.has(p.Id)) {
                activeBlockersMap.set(p.Id, {
                  pid: p.Id,
                  processName: `${p.ProcessName}.exe`,
                  windowTitle: p.MainWindowTitle || '',
                  path: p.Path || ''
                });
              }
            }
          }

          if (lockedFiles.length < 25) {
            lockedFiles.push({
              name: file,
              path: fullPath,
              reason
            });
          }
        }
      }
    }

    // Measure actual bytes freed from this item
    const afterBytes = getDirSizeBytes(item.path);
    const reclaimedForThisItem = Math.max(0, beforeBytes - afterBytes);
    totalReclaimedBytes += reclaimedForThisItem;
  }

  // If there were failed files and we haven't found specific blockers, check known common user apps
  if (failedCount > 0 && activeBlockersMap.size === 0) {
    const commonAppNames = ['chrome', 'msedge', 'brave', 'discord', 'spotify', 'steam', 'node', 'code', 'slack', 'vgc', 'riotclientservices'];
    for (const p of runningProcesses) {
      const procName = (p.ProcessName || '').toLowerCase();
      if (commonAppNames.includes(procName)) {
        if (!activeBlockersMap.has(p.Id)) {
          activeBlockersMap.set(p.Id, {
            pid: p.Id,
            processName: `${p.ProcessName}.exe`,
            windowTitle: p.MainWindowTitle || 'โปรแกรมที่เปิดทำงานอยู่',
            path: p.Path || ''
          });
        }
      }
    }
  }

  const reclaimedMB = Number((totalReclaimedBytes / (1024 * 1024)).toFixed(1));
  const runningBlockers = Array.from(activeBlockersMap.values()).slice(0, 10);

  return {
    success: true,
    cleanedCount,
    failedCount,
    reclaimedMB,
    lockedFiles,
    runningBlockers,
    summary: failedCount === 0
      ? `ลบไฟล์ขยะเสร็จสมบูรณ์ สะอาด 100% (${cleanedCount} รายการ, คืนพื้นที่ ${reclaimedMB} MB)`
      : `ล้างได้ ${cleanedCount} รายการ (คืนพื้นที่ ${reclaimedMB} MB) แต่มี ${failedCount} รายการที่ลบไม่ได้เนื่องจากโปรแกรมกำลังเปิดใช้งานอยู่`
  };
}

// 9.5 Detect Game Roots & Libraries (เข้าถึงโฟลเดอร์เกมทั้งหมดในเครื่อง)
function getDetectedGameRoots() {
  const roots = [];
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  // 1. Steam paths (common and extra libraries from libraryfolders.vdf)
  const standardSteamCommon = path.join(programFilesX86, 'Steam', 'steamapps', 'common');
  if (fs.existsSync(standardSteamCommon)) roots.push({ path: standardSteamCommon, launcher: 'Steam' });

  const vdfPath = path.join(programFilesX86, 'Steam', 'steamapps', 'libraryfolders.vdf');
  if (fs.existsSync(vdfPath)) {
    try {
      const vdfContent = fs.readFileSync(vdfPath, 'utf8');
      const lines = vdfContent.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/"path"\s+"([^"]+)"/);
        if (m && m[1]) {
          const cleanPath = m[1].replace(/\\\\/g, '\\');
          const extraCommon = path.join(cleanPath, 'steamapps', 'common');
          if (fs.existsSync(extraCommon) && !roots.some(r => r.path.toLowerCase() === extraCommon.toLowerCase())) {
            roots.push({ path: extraCommon, launcher: 'Steam' });
          }
        }
      }
    } catch (e) {}
  }

  // 2. Riot Games (VALORANT, League of Legends, Riot Client)
  const riotPaths = ['C:\\Riot Games', 'D:\\Riot Games', 'E:\\Riot Games'];
  for (const rp of riotPaths) {
    if (fs.existsSync(rp) && !roots.some(r => r.path.toLowerCase() === rp.toLowerCase())) {
      roots.push({ path: rp, launcher: 'Riot Games' });
    }
  }

  // 3. Epic Games
  const epicPaths = [
    path.join(programFiles, 'Epic Games'),
    path.join(programFilesX86, 'Epic Games'),
    'C:\\Epic Games',
    'D:\\Epic Games'
  ];
  for (const ep of epicPaths) {
    if (fs.existsSync(ep) && !roots.some(r => r.path.toLowerCase() === ep.toLowerCase())) {
      roots.push({ path: ep, launcher: 'Epic Games' });
    }
  }

  // 4. GRYPHLINK / Arknights Endfield
  const gryphPaths = [
    path.join(programFiles, 'GRYPHLINK', 'games'),
    path.join(programFilesX86, 'GRYPHLINK', 'games')
  ];
  for (const gp of gryphPaths) {
    if (fs.existsSync(gp) && !roots.some(r => r.path.toLowerCase() === gp.toLowerCase())) {
      roots.push({ path: gp, launcher: 'Gryphline' });
    }
  }

  // 5. Roblox
  const robloxPath = path.join(localAppData, 'Roblox');
  if (fs.existsSync(robloxPath)) {
    roots.push({ path: robloxPath, launcher: 'Roblox' });
  }

  // 6. Generic Game Folders across drives (C:\Games, D:\Games, C:\XboxGames, etc.)
  for (const drv of ['C:', 'D:', 'E:', 'F:']) {
    for (const sub of ['Games', 'XboxGames', 'GOG Games', 'SteamLibrary\\steamapps\\common']) {
      const p = path.join(drv, sub);
      if (fs.existsSync(p) && !roots.some(r => r.path.toLowerCase() === p.toLowerCase())) {
        roots.push({ path: p, launcher: 'Other Games' });
      }
    }
  }

  return roots;
}

// 9.6 Scan Game Libraries & Individual Games Storage Footprint
async function scanGameLibraries() {
  const roots = getDetectedGameRoots();
  const games = [];
  const topGameFiles = [];

  for (const root of roots) {
    if (!fs.existsSync(root.path)) continue;

    if (root.launcher === 'Roblox') {
      let totalBytes = 0;
      let count = 0;
      let largest = { name: '', path: '', sizeMB: 0 };
      function walkRoblox(cur, depth = 0) {
        if (depth > 4) return;
        try {
          const entries = fs.readdirSync(cur, { withFileTypes: true });
          for (const ent of entries) {
            const p = path.join(cur, ent.name);
            if (ent.isDirectory()) walkRoblox(p, depth + 1);
            else if (ent.isFile()) {
              const st = fs.statSync(p);
              totalBytes += st.size;
              count++;
              const sMB = Number((st.size / 1048576).toFixed(1));
              if (sMB > largest.sizeMB) largest = { name: ent.name, path: p, sizeMB: sMB };
              if (sMB >= 50) {
                topGameFiles.push({
                  name: ent.name,
                  path: p,
                  sizeMB: sMB,
                  game: 'Roblox Player',
                  drive: p.substring(0, 2).toUpperCase()
                });
              }
            }
          }
        } catch (e) {}
      }
      walkRoblox(root.path);
      if (totalBytes > 0) {
        games.push({
          id: 'game_roblox',
          name: 'Roblox Player',
          launcher: 'Roblox',
          installPath: root.path,
          sizeMB: Number((totalBytes / 1048576).toFixed(1)),
          sizeGB: Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
          fileCount: count,
          drive: root.path.substring(0, 2).toUpperCase(),
          largestFile: largest
        });
      }
      continue;
    }

    try {
      const items = fs.readdirSync(root.path, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory()) continue;
        const gameFolder = path.join(root.path, item.name);

        let totalBytes = 0;
        let count = 0;
        let largest = { name: '', path: '', sizeMB: 0 };

        function walk(cur, depth = 0) {
          if (depth > 5) return;
          try {
            const entries = fs.readdirSync(cur, { withFileTypes: true });
            for (const ent of entries) {
              const p = path.join(cur, ent.name);
              if (ent.isDirectory()) {
                walk(p, depth + 1);
              } else if (ent.isFile()) {
                const st = fs.statSync(p);
                totalBytes += st.size;
                count++;
                const sMB = Number((st.size / 1048576).toFixed(1));
                if (sMB > largest.sizeMB) largest = { name: ent.name, path: p, sizeMB: sMB };
                if (sMB >= 80) {
                  topGameFiles.push({
                    name: ent.name,
                    path: p,
                    sizeMB: sMB,
                    game: item.name,
                    drive: p.substring(0, 2).toUpperCase()
                  });
                }
              }
            }
          } catch (e) {}
        }

        walk(gameFolder);

        if (totalBytes > 10 * 1048576) {
          games.push({
            id: `game_${games.length}_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: item.name,
            launcher: root.launcher,
            installPath: gameFolder,
            sizeMB: Number((totalBytes / 1048576).toFixed(1)),
            sizeGB: Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
            fileCount: count,
            drive: gameFolder.substring(0, 2).toUpperCase(),
            largestFile: largest
          });
        }
      }
    } catch (e) {}
  }

  games.sort((a, b) => b.sizeMB - a.sizeMB);
  topGameFiles.sort((a, b) => b.sizeMB - a.sizeMB);

  const totalSizeMB = games.reduce((acc, g) => acc + g.sizeMB, 0);
  const totalSizeGB = Number((totalSizeMB / 1024).toFixed(2));

  return {
    games,
    totalGamesSizeGB: totalSizeGB,
    totalGamesSizeMB: Number(totalSizeMB.toFixed(1)),
    gameCount: games.length,
    topGameFiles: topGameFiles.slice(0, 60)
  };
}

// 10. Scan Real Large Files & Dynamic Real Directory Treemap (พร้อมรองรับไฟล์เกมขนาดใหญ่)
async function scanLargeFiles(driveLetter = 'C:', minSizeMB = 25, depth = 4) {
  // 1. Get detected games and top game files
  let gameScanResult = null;
  try {
    gameScanResult = await scanGameLibraries();
  } catch (e) {}

  const detectedRoots = getDetectedGameRoots().map(r => r.path);
  const gameSearchPathsStr = detectedRoots.map(p => `"${p.replace(/\\/g, '\\\\')}"`).join(', ');

  const script = `
    $searchPaths = @(
      "$($env:USERPROFILE)\\Downloads",
      "$($env:USERPROFILE)\\Videos",
      "$($env:USERPROFILE)\\Documents",
      "$($env:USERPROFILE)\\Desktop",
      "$($env:LOCALAPPDATA)",
      "C:\\Program Files",
      "C:\\Program Files (x86)",
      "C:\\ProgramData",
      "C:\\Riot Games",
      ${gameSearchPathsStr || '""'}
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    # If specific drive letter requested and not C:, add its root
    $drv = "${driveLetter}".Trim();
    if ($drv -and $drv -ne "ALL" -and $drv -ne "C:" -and (Test-Path "$($drv)\\")) {
      $searchPaths = @("$($drv)\\")
    }

    $files = Get-ChildItem -Path $searchPaths -File -Recurse -Depth ${depth} -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -gt ${minSizeMB}MB } |
      Sort-Object Length -Descending |
      Select-Object -First 60 Name, FullName, Length, LastWriteTime

    # Compute top directory breakdown for dynamic Treemap
    $dirMap = @{}
    foreach ($f in $files) {
      $parent = Split-Path -Parent $f.FullName
      if (-not $dirMap.ContainsKey($parent)) {
        $dirMap[$parent] = @{ Path = $parent; Bytes = [int64]0; Count = 0 }
      }
      $dirMap[$parent].Bytes += $f.Length
      $dirMap[$parent].Count += 1
    }

    $breakdowns = @()
    foreach ($k in $dirMap.Keys) {
      $breakdowns += [PSCustomObject]@{
        Path = $dirMap[$k].Path
        SizeMB = [math]::Round($dirMap[$k].Bytes / 1MB, 1)
        Count = $dirMap[$k].Count
      }
    }
    $sortedDirs = $breakdowns | Sort-Object SizeMB -Descending | Select-Object -First 10

    # Find potential duplicate files by matching identical file size (> 1MB)
    $dupGroups = $files | Group-Object Length | Where-Object { $_.Count -gt 1 -and [int64]$_.Name -gt 1048576 } | Select-Object -First 6

    $formattedDups = @()
    foreach ($dg in $dupGroups) {
      $first = $dg.Group[0]
      $copies = @()
      foreach ($item in $dg.Group) {
        $copies += [PSCustomObject]@{
          Path = $item.FullName
          Date = $item.LastWriteTime.ToString("yyyy-MM-dd")
        }
      }
      $formattedDups += [PSCustomObject]@{
        Name = $first.Name
        SizeEachMB = [math]::Round($first.Length / 1MB, 1)
        Copies = $copies
      }
    }

    [PSCustomObject]@{
      Files = ($files | ForEach-Object {
        [PSCustomObject]@{
          Name = $_.Name
          Path = $_.FullName
          SizeMB = [math]::Round($_.Length / 1MB, 1)
          LastModified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
        }
      })
      Directories = $sortedDirs
      Duplicates = $formattedDups
    } | ConvertTo-Json -Depth 4
  `;

  const res = await runPowerShell(script);
  let rawFiles = [];
  let rawDirs = [];
  let rawDups = [];

  if (res.success && res.data) {
    rawFiles = Array.isArray(res.data.Files) ? res.data.Files : (res.data.Files ? [res.data.Files] : []);
    rawDirs = Array.isArray(res.data.Directories) ? res.data.Directories : (res.data.Directories ? [res.data.Directories] : []);
    rawDups = Array.isArray(res.data.Duplicates) ? res.data.Duplicates : (res.data.Duplicates ? [res.data.Duplicates] : []);
  }

  // Merge top game files if available
  const seenPaths = new Set(rawFiles.map(f => (f.Path || '').toLowerCase()));
  if (gameScanResult && gameScanResult.topGameFiles) {
    for (const gf of gameScanResult.topGameFiles) {
      if (!seenPaths.has(gf.path.toLowerCase())) {
        seenPaths.add(gf.path.toLowerCase());
        rawFiles.push({
          Name: gf.name,
          Path: gf.path,
          SizeMB: gf.sizeMB,
          LastModified: 'เมื่อเร็วๆ นี้ (ไฟล์เกม)',
          isGameFile: true
        });
      }
    }
  }

  // Also ensure game folders are represented in directories breakdown if large
  if (gameScanResult && gameScanResult.games) {
    for (const g of gameScanResult.games) {
      if (g.sizeMB >= 500 && !rawDirs.some(d => (d.Path || '').toLowerCase() === g.installPath.toLowerCase())) {
        rawDirs.push({
          Path: g.installPath,
          SizeMB: g.sizeMB,
          Count: g.fileCount
        });
      }
    }
  }

  // Sort rawDirs by SizeMB descending
  rawDirs.sort((a, b) => (b.SizeMB || 0) - (a.SizeMB || 0));

  const GAME_EXTENSIONS = new Set([
    '.pak', '.ucas', '.utoc', '.starpak', '.vpk', '.bundle', '.assets', '.unity3d',
    '.res', '.wad', '.rpf', '.bik', '.bk2', '.forge', '.bsp', '.ba2', '.bsa',
    '.dat', '.obb', '.cas', '.cpk', '.wem', '.bnk', '.umap', '.uasset', '.scs',
    '.big', '.npk', '.sarc', '.pck', '.arc', '.bdt', '.bhd', '.xpak', '.chk'
  ]);

  const colorPalette = [
    'from-rose-600/90 to-rose-800/90 border-rose-400/40',
    'from-indigo-600/90 to-purple-800/90 border-indigo-400/40',
    'from-amber-600/90 to-orange-800/90 border-amber-400/40',
    'from-emerald-600/90 to-teal-800/90 border-emerald-400/40',
    'from-sky-600/90 to-blue-800/90 border-sky-400/40',
    'from-fuchsia-600/90 to-pink-800/90 border-fuchsia-400/40',
    'from-slate-600/90 to-slate-800/90 border-slate-400/40',
    'from-cyan-600/90 to-blue-900/90 border-cyan-400/40'
  ];

  const totalDirMB = rawDirs.reduce((acc, d) => acc + (d.SizeMB || 0), 0) || 1;

  const directoryBreakdown = rawDirs.slice(0, 10).map((d, idx) => {
    const sizeGB = Number((d.SizeMB / 1024).toFixed(2));
    const percent = Math.max(1, Math.round((d.SizeMB / totalDirMB) * 100));
    const drive = d.Path.substring(0, 2).toUpperCase();
    const folderName = path.basename(d.Path) || d.Path;

    let badge = 'Directory';
    const lowPath = (d.Path || '').toLowerCase();
    if (lowPath.includes('steamapps') || lowPath.includes('riot games') || lowPath.includes('epic games') || lowPath.includes('gryphlink') || lowPath.includes('roblox') || lowPath.includes('\\games')) {
      badge = '🎮 Game Library / Game Files';
    } else if (d.Path.includes('Program Files')) badge = 'Applications';
    else if (d.Path.includes('Videos')) badge = 'Media / Video';
    else if (d.Path.includes('Downloads')) badge = 'Downloads';
    else if (d.Path.includes('AppData')) badge = 'AppData';
    else if (d.Path.includes('Package Cache')) badge = 'Installers';

    return {
      id: `tm_${idx}`,
      label: `${folderName} (${d.Path})`,
      path: d.Path,
      drive,
      sizeGB: sizeGB >= 0.1 ? sizeGB : Number((d.SizeMB / 1024).toFixed(2)),
      sizeMB: d.SizeMB,
      percent,
      color: colorPalette[idx % colorPalette.length],
      badge,
      filesCount: `${d.Count} ไฟล์ใหญ่`
    };
  });

  // Sort files by size descending
  rawFiles.sort((a, b) => (b.SizeMB || 0) - (a.SizeMB || 0));

  const files = rawFiles.map((f, idx) => {
    const ext = path.extname(f.Name).toLowerCase();
    const lowPath = (f.Path || '').toLowerCase();

    let category = 'Other Document';
    if (GAME_EXTENSIONS.has(ext) || lowPath.includes('steamapps') || lowPath.includes('riot games') || lowPath.includes('epic games') || lowPath.includes('gryphlink') || lowPath.includes('endfield') || lowPath.includes('roblox') || lowPath.includes('\\games')) {
      category = '🎮 Game / Game Asset';
    } else if (['.mp4', '.mkv', '.avi', '.mov', '.wav', '.mp3'].includes(ext)) {
      category = 'Media / Video';
    } else if (['.iso', '.zip', '.tar', '.gz', '.7z', '.rar', '.cab'].includes(ext)) {
      category = 'Archive / ISO';
    } else if (['.exe', '.msi', '.apk', '.dll', '.nvph'].includes(ext)) {
      category = 'Installer / Binary';
    } else if (['.parquet', '.csv', '.json', '.sql', '.db'].includes(ext)) {
      category = 'Database / AI Data';
    } else if (['.ts', '.tsx', '.rs', '.py', '.js', '.asar'].includes(ext)) {
      category = 'Dev Artifact / Code';
    }

    return {
      id: `f_real_${idx}`,
      name: f.Name,
      path: f.Path,
      drive: f.Path.substring(0, 2).toUpperCase(),
      category,
      sizeMB: f.SizeMB,
      lastModified: f.LastModified,
      daysInactive: 1,
      type: 'file',
      isGameFile: category.includes('Game')
    };
  });

  const duplicates = rawDups.map((dup, idx) => ({
    id: `dup_${idx}`,
    name: dup.Name,
    hash: `size-match:${dup.SizeEachMB}MB`,
    sizeEachMB: dup.SizeEachMB,
    copies: dup.Copies.map((c) => ({
      path: c.Path,
      date: c.Date
    }))
  }));

  return { files, directoryBreakdown, duplicates, gameLibraries: gameScanResult };
}

// 11. Get Real Startup Apps
async function getStartupApps() {
  const script = `
    $apps = @()
    $regPaths = @(
      "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    )
    foreach ($rp in $regPaths) {
      if (Test-Path $rp) {
        $props = Get-ItemProperty -Path $rp
        $props.PSObject.Properties | Where-Object { $_.Name -notin @('PSPath','PSParentPath','PSChildName','PSDrive','PSProvider') } | ForEach-Object {
          $apps += [PSCustomObject]@{
            Name = $_.Name
            Path = [string]$_.Value
            Publisher = "Registry ($($rp.Substring(0,4)))"
            Enabled = $true
          }
        }
      }
    }
    $apps | ConvertTo-Json
  `;
  const res = await runPowerShell(script);
  if (!res.success || !res.data) return [];
  const list = Array.isArray(res.data) ? res.data : [res.data];

  return list.map((item, idx) => ({
    id: `startup_${idx}`,
    name: item.Name,
    publisher: item.Publisher,
    path: item.Path,
    impact: idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Medium' : 'Low',
    enabled: item.Enabled
  }));
}

// 12. Open Windows Add / Remove Programs
function openWindowsAddRemove() {
  exec('explorer.exe ms-settings:appsfeatures', (err) => {
    if (err) {
      exec('control.exe appwiz.cpl');
    }
  });
}

// 13. Open Installation Folder
function openInstallFolder() {
  const appPath = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath) || process.cwd();
  shell.openPath(appPath);
}

// 13.5 Perform Clean In-App Uninstallation (without requiring system reboot)
function uninstallSelf() {
  const electron = require('electron');
  const app = electron.app;
  const appPath = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath) || process.cwd();
  
  const runnerScriptPath = path.join(os.tmpdir(), 'syspulse_clean_uninstall.bat');
  const scriptContent = `@echo off
setlocal enabledelayedexpansion
title Uninstalling System Storage & Port Inspector...

:: Wait for caller Electron process to exit gracefully
timeout /t 2 /nobreak >nul

:: Terminate any remaining app instances so no files are in use
taskkill /F /IM "sysinfo.exe" /T >nul 2>&1
taskkill /F /IM "SysInfo.exe" /T >nul 2>&1
taskkill /F /IM "System Storage & Port Inspector.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: 1. Try NSIS uninstaller if installed via NSIS
if exist "${appPath}\\Uninstall SysInfo.exe" (
    start "" /wait "${appPath}\\Uninstall SysInfo.exe" /S
    goto CLEANUP
)
if exist "${appPath}\\Uninstall System Storage & Port Inspector.exe" (
    start "" /wait "${appPath}\\Uninstall System Storage & Port Inspector.exe" /S
    goto CLEANUP
)

:: 2. Find MSI ProductCode from Registry
set PRODUCT_CODE=
for /f "usebackq tokens=*" %%A in (\`powershell -NoProfile -Command "try { $p = Get-ItemProperty 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq 'SysInfo' -or $_.DisplayName -eq 'System Storage & Port Inspector' } | Select-Object -First 1; if ($p.PSChildName) { $p.PSChildName } elseif ($p.UninstallString -match '\{[A-Fa-f0-9-]+\}') { $matches[0] } } catch {}"\`) do (
    set PRODUCT_CODE=%%A
)

if not "%PRODUCT_CODE%"=="" (
    start "" /wait msiexec.exe /x %PRODUCT_CODE% /qb REBOOT=ReallySuppress
    goto CLEANUP
)

:: 3. Fallback: Search with UpgradeCode
for /f "usebackq tokens=*" %%B in (\`powershell -NoProfile -Command "try { $u = '{B6A87432-84F1-4F2A-949B-E412581699AB}'; Get-CimInstance Win32_Property -Filter \\"Property = 'UpgradeCode' and Value = '$u'\\" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProductCode -First 1 } catch {}"\`) do (
    set PRODUCT_CODE=%%B
)

if not "%PRODUCT_CODE%"=="" (
    start "" /wait msiexec.exe /x %PRODUCT_CODE% /qb REBOOT=ReallySuppress
    goto CLEANUP
)

:: 4. If neither, remove files and shortcuts cleanly
del /f /q "%PUBLIC%\\Desktop\\SysInfo.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\\Desktop\\SysInfo.lnk" >nul 2>&1
del /f /q "%PUBLIC%\\Desktop\\System Storage & Port Inspector.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\\Desktop\\System Storage & Port Inspector.lnk" >nul 2>&1
rd /s /q "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SysInfo" >nul 2>&1
rd /s /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\SysInfo" >nul 2>&1
rd /s /q "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\System Storage & Port Inspector" >nul 2>&1
rd /s /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\System Storage & Port Inspector" >nul 2>&1

:CLEANUP
exit
`;

  try {
    fs.writeFileSync(runnerScriptPath, scriptContent, 'utf8');

    // Launch detached uninstaller process elevated
    const { spawn } = require('child_process');
    spawn('powershell.exe', [
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-Command',
      `Start-Process -FilePath "cmd.exe" -ArgumentList "/c \`"${runnerScriptPath}\`"" -Verb RunAs`
    ], {
      detached: true,
      stdio: 'ignore'
    }).unref();

    setTimeout(() => {
      app.quit();
    }, 600);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 14. Get All Background Processes (with grouping & window status)
async function getAllBackgroundProcesses() {
  const script = `
    $procs = Get-Process -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowHandle, MainWindowTitle, Path, WorkingSet64, Company, Description;

    $services = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Select-Object Name, DisplayName, ProcessId, State;
    $serviceMap = @{};
    foreach ($s in $services) {
      if ($s.ProcessId -and $s.ProcessId -gt 0) {
        if (-not $serviceMap.ContainsKey($s.ProcessId)) { $serviceMap[$s.ProcessId] = @() }
        $serviceMap[$s.ProcessId] += $s.DisplayName
      }
    }

    $results = foreach ($p in $procs) {
      $isNoWindow = ($p.MainWindowHandle -eq 0 -or [string]::IsNullOrWhiteSpace($p.MainWindowTitle));
      if (-not $isNoWindow) { continue } # Only background processes!

      $svcNames = if ($serviceMap.ContainsKey($p.Id)) { ($serviceMap[$p.Id] -join ', ') } else { '' };

      $isUserApp = ($p.Path -and ($p.Path -like "*AppData*" -or $p.Path -like "*Program Files*") -and ($p.Company -notlike "*Microsoft*"));
      $isWindowsApp = ($p.Path -and ($p.Path -like "*AppData*" -or $p.Path -like "*Program Files*") -and ($p.Company -like "*Microsoft*"));
      $isSvc = ($svcNames.Length -gt 0 -or $p.ProcessName -ieq 'svchost');
      $isSys = ($p.Path -and $p.Path -like "*System32*") -or ($p.ProcessName -in @('System','Registry','smss','csrss','wininit','services','lsass','winlogon'));

      $category = if ($isUserApp) { 'user_app' }
                  elseif ($isSvc) { 'service' }
                  elseif ($isWindowsApp) { 'windows_app' }
                  elseif ($isSys) { 'system' }
                  else { 'other' };

      [PSCustomObject]@{
        PID = $p.Id
        ProcessName = "$($p.ProcessName).exe"
        Path = if ($p.Path) { $p.Path } else { "" }
        MainWindowHandle = $p.MainWindowHandle
        MainWindowTitle = if ($p.MainWindowTitle) { $p.MainWindowTitle } else { "" }
        MemoryMB = [math]::Round($p.WorkingSet64 / 1MB, 1)
        Company = if ($p.Company) { $p.Company } else { "Unknown" }
        Description = if ($p.Description) { $p.Description } else { $p.ProcessName }
        ServiceName = $svcNames
        Category = $category
      }
    }
    $results | ConvertTo-Json -Depth 2
  `;

  const res = await runPowerShell(script);
  if (!res.success || !res.data) return [];
  const list = Array.isArray(res.data) ? res.data : [res.data];

  return list.map((item, idx) => ({
    id: `bg_${idx}_${item.PID}`,
    pid: item.PID,
    processName: item.ProcessName,
    path: item.Path,
    memoryMB: item.MemoryMB || 0,
    company: item.Company || 'Unknown',
    description: item.Description || item.ProcessName,
    serviceName: item.ServiceName || '',
    category: item.Category || 'other',
    categoryLabel: item.Category === 'user_app' ? 'แอปผู้ใช้เบื้องหลัง (User App)' :
                   item.Category === 'service' ? 'เซอร์วิสของ Windows (Service)' :
                   item.Category === 'windows_app' ? 'แอปเสริมของ Windows' :
                   item.Category === 'system' ? 'โปรเซสแกนหลักระบบ (System Core)' : 'โปรเซสเบื้องหลังทั่วไป'
  }));
}

// 15. Detect Program Conflicts & Collisions (พอร์ตชนกัน, โปรเซสค้างซ้ำซ้อน, ตัวบล็อก, แย่งแรม)
async function detectProgramConflicts() {
  const script = `
    $tcp = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess;
    $udp = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess;
    $allPorts = @($tcp) + @($udp);

    $procs = Get-Process -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowHandle, MainWindowTitle, Path, WorkingSet64, Company, Description;
    $procMap = @{};
    foreach ($p in $procs) { $procMap[[int]$p.Id] = $p }

    # 1. Port Collisions (Multiple different PIDs on same port)
    $portGroups = $allPorts | Group-Object LocalPort | Where-Object {
      $pids = ($_.Group.OwningProcess | Select-Object -Unique);
      $pids.Count -gt 1
    };

    $portCollisions = @();
    foreach ($pg in $portGroups) {
      $uniquePids = ($pg.Group.OwningProcess | Select-Object -Unique);
      $involved = @();
      foreach ($pidNum in $uniquePids) {
        $pr = $procMap[[int]$pidNum];
        $involved += [PSCustomObject]@{
          PID = [int]$pidNum
          ProcessName = if ($pr -and $pr.ProcessName) { "$($pr.ProcessName).exe" } else { "PID: $pidNum" }
          Path = if ($pr -and $pr.Path) { $pr.Path } else { "" }
          MemoryMB = if ($pr -and $pr.WorkingSet64) { [math]::Round($pr.WorkingSet64 / 1MB, 1) } else { 0 }
        }
      }
      $portCollisions += [PSCustomObject]@{
        Port = $pg.Name
        Count = $uniquePids.Count
        Processes = $involved
      }
    }

    # 2. Multi-Instance Rogue Apps (Excluding known browser multi-process engines & host workers)
    $ignoredNames = @('svchost','conhost','runtimebroker','dllhost','SearchHost','chrome','msedge','brave','firefox','electron','Code','WmiPrvSE','backgroundTaskHost','WUDFHost','powershell','cmd','msedgewebview2','sihost','dwm');
    $dups = $procs | Where-Object { $_.ProcessName -notin $ignoredNames } | Group-Object ProcessName | Where-Object { $_.Count -ge 3 };
    $dupApps = @();
    foreach ($d in $dups) {
      $items = @();
      foreach ($pr in $d.Group) {
        $items += [PSCustomObject]@{
          PID = $pr.Id
          ProcessName = "$($pr.ProcessName).exe"
          Path = if ($pr.Path) { $pr.Path } else { "" }
          MemoryMB = [math]::Round($pr.WorkingSet64 / 1MB, 1)
        }
      }
      $dupApps += [PSCustomObject]@{
        ProcessName = $d.Name
        Count = $d.Count
        TotalMemoryMB = [math]::Round(($d.Group | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB, 1)
        Processes = $items
      }
    }

    # 3. Known Blockers & Anti-Cheats (vgc, EasyAntiCheat, etc.)
    $blockerKeywords = @('vgc', 'easyanticheat', 'beservice', 'riotclientservices', 'epiconlineservices');
    $foundBlockers = @();
    foreach ($p in $procs) {
      $pName = $p.ProcessName.ToLower();
      foreach ($bk in $blockerKeywords) {
        if ($pName -like "*$bk*") {
          $foundBlockers += [PSCustomObject]@{
            PID = $p.Id
            ProcessName = "$($p.ProcessName).exe"
            Path = if ($p.Path) { $p.Path } else { "" }
            MemoryMB = [math]::Round($p.WorkingSet64 / 1MB, 1)
            Description = if ($p.Description) { $p.Description } else { $p.ProcessName }
          }
          break
        }
      }
    }

    # 4. Heavy Background Memory Hogs (> 800 MB in background without window)
    $heavyBg = @();
    foreach ($p in $procs) {
      $isNoWin = ($p.MainWindowHandle -eq 0 -or [string]::IsNullOrWhiteSpace($p.MainWindowTitle));
      $memMB = [math]::Round($p.WorkingSet64 / 1MB, 1);
      if ($isNoWin -and $memMB -gt 800 -and $p.ProcessName -notin @('Memory Compression','System')) {
        $heavyBg += [PSCustomObject]@{
          PID = $p.Id
          ProcessName = "$($p.ProcessName).exe"
          Path = if ($p.Path) { $p.Path } else { "" }
          MemoryMB = $memMB
          Description = if ($p.Description) { $p.Description } else { $p.ProcessName }
        }
      }
    }

    [PSCustomObject]@{
      PortCollisions = $portCollisions
      DuplicateApps = $dupApps
      Blockers = $foundBlockers
      HeavyHogs = $heavyBg
    } | ConvertTo-Json -Depth 5
  `;

  const res = await runPowerShell(script);
  if (!res.success || !res.data) return [];

  const conflicts = [];

  // Parse Port Collisions
  const portCollisions = Array.isArray(res.data.PortCollisions) ? res.data.PortCollisions : (res.data.PortCollisions ? [res.data.PortCollisions] : []);
  for (const pc of portCollisions) {
    const procs = Array.isArray(pc.Processes) ? pc.Processes : (pc.Processes ? [pc.Processes] : []);
    const procNames = procs.map(p => p.ProcessName).join(' vs ');
    conflicts.push({
      id: `conf_port_${pc.Port}`,
      type: 'port_collision',
      severity: 'critical',
      title: `พอร์ต ${pc.Port} เกิดการแย่งใช้งานชนกัน (Port Collision)`,
      description: `มีโปรเซส ${procs.length} ตัว (${procNames}) พยายามเปิดดักฟังหรือแย่งใช้งานพอร์ต ${pc.Port} พร้อมกัน ทำให้โปรแกรมอื่นเชื่อมต่อไม่ได้หรือเกิดข้อผิดพลาด`,
      suggestedAction: `ปิดโปรเซสตัวใดตัวหนึ่งที่ไม่ได้ใช้งาน เพื่อคืนสิทธิ์ให้พอร์ต ${pc.Port}`,
      conflictingPrograms: procs.map(p => ({
        pid: p.PID,
        processName: p.ProcessName,
        path: p.Path,
        memoryMB: p.MemoryMB,
        role: `กำลังใช้งานพอร์ต ${pc.Port}`
      })),
      canAutoResolve: true
    });
  }

  // Parse Duplicate Apps
  const dupApps = Array.isArray(res.data.DuplicateApps) ? res.data.DuplicateApps : (res.data.DuplicateApps ? [res.data.DuplicateApps] : []);
  for (const da of dupApps) {
    const procs = Array.isArray(da.Processes) ? da.Processes : (da.Processes ? [da.Processes] : []);
    conflicts.push({
      id: `conf_dup_${da.ProcessName}`,
      type: 'multi_instance',
      severity: 'warning',
      title: `ตรวจพบ ${da.ProcessName} รันค้างซ้ำซ้อน (${da.Count} ตัว)`,
      description: `พบโปรเซส ${da.ProcessName} เปิดทำงานค้างซ้ำซ้อนกัน ${da.Count} โปรเซส รวมกินแรม ${da.TotalMemoryMB} MB มักเกิดจากการปิดโปรแกรมไม่สมบูรณ์ ทำให้แย่งล็อกไฟล์และฐานข้อมูล`,
      suggestedAction: `ปิดโปรเซส ${da.ProcessName} ทั้งหมดที่ค้างอยู่ แล้วเริ่มเปิดโปรแกรมใหม่อีกครั้ง`,
      conflictingPrograms: procs.map(p => ({
        pid: p.PID,
        processName: p.ProcessName,
        path: p.Path,
        memoryMB: p.MemoryMB,
        role: `อินสแตนซ์ที่รันค้างอยู่ (กินแรม ${p.MemoryMB} MB)`
      })),
      canAutoResolve: true
    });
  }

  // Parse Blockers
  const blockers = Array.isArray(res.data.Blockers) ? res.data.Blockers : (res.data.Blockers ? [res.data.Blockers] : []);
  for (const blk of blockers) {
    conflicts.push({
      id: `conf_blk_${blk.PID}`,
      type: 'uninstall_blocker',
      severity: 'warning',
      title: `โปรเซส Anti-Cheat / Background Driver ล็อกระบบ (${blk.ProcessName})`,
      description: `โปรเซส ${blk.ProcessName} (PID ${blk.PID}) กำลังทำงานอยู่เบื้องหลังในระดับเคอร์เนล มักเป็นสาเหตุที่ทำให้ถอนการติดตั้งเกมไม่ได้ ลบไฟล์ไม่สำเร็จ หรือขัดกับโปรแกรมจำลอง`,
      suggestedAction: `บังคับปิดโปรเซส ${blk.ProcessName} ก่อนทำการถอนการติดตั้งหรืออัปเดต`,
      conflictingPrograms: [{
        pid: blk.PID,
        processName: blk.ProcessName,
        path: blk.Path,
        memoryMB: blk.MemoryMB,
        role: blk.Description || 'System Driver / Hook Blocker'
      }],
      canAutoResolve: true
    });
  }

  // Parse Heavy Background Hogs
  const heavyHogs = Array.isArray(res.data.HeavyHogs) ? res.data.HeavyHogs : (res.data.HeavyHogs ? [res.data.HeavyHogs] : []);
  for (const hog of heavyHogs) {
    conflicts.push({
      id: `conf_hog_${hog.PID}`,
      type: 'resource_contention',
      severity: 'info',
      title: `โปรเซสเบื้องหลังกินหน่วยความจำแรมสูงผิดปกติ (${hog.ProcessName})`,
      description: `โปรเซส ${hog.ProcessName} (PID: ${hog.PID}) ทำงานอยู่เบื้องหลังโดยไม่มีหน้าต่าง แต่กินแรมสูงถึง ${hog.MemoryMB} MB อาจทำให้โปรแกรมอื่นทำงานช้าหรือสะดุด`,
      suggestedAction: `ตรวจสอบความจำเป็น หากไม่ได้ใช้งานสามารถปิดเพื่อคืนแรม ${hog.MemoryMB} MB ให้ระบบ`,
      conflictingPrograms: [{
        pid: hog.PID,
        processName: hog.ProcessName,
        path: hog.Path,
        memoryMB: hog.MemoryMB,
        role: `กินแรมสูง ${hog.MemoryMB} MB ในพื้นหลัง`
      }],
      canAutoResolve: true
    });
  }

  return conflicts;
}

// 16. Resolve Conflict (Kill offending PIDs)
async function resolveConflict(conflictId, pids = []) {
  if (!Array.isArray(pids) || pids.length === 0) {
    return { success: false, error: 'No PIDs provided' };
  }

  let killedCount = 0;
  for (const pid of pids) {
    if (pid && !isNaN(pid)) {
      try {
        await killProcess(pid);
        killedCount++;
      } catch (e) {}
    }
  }

  return { success: true, killedCount };
}

// ============================================================================
// 15. SYNC, MOVE & DELETE SPECIFIC FILES (REAL-TIME STATUS FOR DELETED/MOVED FILES)
// ============================================================================

// Candidate locations to check when a file disappears from its expected path
function getMovedCandidatePaths(originalPath, fileName) {
  const userProfile = process.env.USERPROFILE || '';
  const candidates = [];

  if (userProfile && fileName) {
    candidates.push(path.join(userProfile, 'Desktop', fileName));
    candidates.push(path.join(userProfile, 'Downloads', fileName));
    candidates.push(path.join(userProfile, 'Documents', fileName));
    candidates.push(path.join(userProfile, 'Videos', fileName));
    candidates.push(path.join(userProfile, 'Music', fileName));
    candidates.push(path.join(userProfile, 'Pictures', fileName));
  }

  // Parent and grandparent directories
  if (originalPath && fileName) {
    const parent = path.dirname(originalPath);
    candidates.push(path.join(parent, fileName));
    const grandparent = path.dirname(parent);
    if (grandparent && grandparent !== parent) {
      candidates.push(path.join(grandparent, fileName));
    }
  }

  // Common other drive letters
  const otherDrives = ['D:\\', 'E:\\', 'F:\\'];
  for (const drv of otherDrives) {
    if (fs.existsSync(drv) && fileName) {
      candidates.push(path.join(drv, fileName));
      candidates.push(path.join(drv, 'Downloads', fileName));
    }
  }

  // Deduplicate and filter out originalPath
  return Array.from(new Set(candidates)).filter(
    (p) => p.toLowerCase() !== (originalPath || '').toLowerCase()
  );
}

// Check and sync status for files list (detect if deleted, moved, or active)
async function syncFilesStatus(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      success: true,
      files: [],
      activeCount: 0,
      movedCount: 0,
      deletedCount: 0,
      reclaimedMB: 0,
      hasChanges: false
    };
  }

  let activeCount = 0;
  let movedCount = 0;
  let deletedCount = 0;
  let reclaimedMB = 0;

  const updatedFiles = [];

  for (const item of files) {
    if (!item.path) {
      deletedCount++;
      continue;
    }

    // 1. Check if file still exists at current path
    if (fs.existsSync(item.path)) {
      try {
        const st = fs.statSync(item.path);
        const actualSizeMB = Number((st.size / (1024 * 1024)).toFixed(1));
        activeCount++;
        updatedFiles.push({
          ...item,
          status: 'active',
          exists: true,
          sizeMB: actualSizeMB > 0 ? actualSizeMB : item.sizeMB,
          lastModified: new Date(st.mtime).toISOString().replace('T', ' ').substring(0, 16)
        });
      } catch (e) {
        activeCount++;
        updatedFiles.push({ ...item, status: 'active', exists: true });
      }
      continue;
    }

    // 2. File is missing from its original path! Check if it was moved
    const fileName = item.name || path.basename(item.path);
    const candidates = getMovedCandidatePaths(item.path, fileName);
    let foundMovedPath = null;
    let foundMtime = null;
    let foundSizeMB = item.sizeMB;

    for (const cand of candidates) {
      try {
        if (fs.existsSync(cand)) {
          const st = fs.statSync(cand);
          const candSizeMB = Number((st.size / (1024 * 1024)).toFixed(1));
          // Check size match (within 1MB or same if > 0)
          if (Math.abs(candSizeMB - item.sizeMB) <= 1 || (item.sizeMB === 0 && candSizeMB === 0)) {
            foundMovedPath = cand;
            foundMtime = new Date(st.mtime).toISOString().replace('T', ' ').substring(0, 16);
            foundSizeMB = candSizeMB;
            break;
          }
        }
      } catch (candErr) {}
    }

    if (foundMovedPath) {
      // File was MOVED!
      movedCount++;
      updatedFiles.push({
        ...item,
        status: 'moved',
        exists: true,
        previousPath: item.path,
        path: foundMovedPath,
        drive: foundMovedPath.substring(0, 2).toUpperCase(),
        sizeMB: foundSizeMB,
        lastModified: foundMtime || item.lastModified,
        isRecentlyMoved: true
      });
    } else {
      // File was DELETED!
      deletedCount++;
      reclaimedMB += item.sizeMB || 0;
      updatedFiles.push({
        ...item,
        status: 'deleted',
        exists: false
      });
    }
  }

  const hasChanges = movedCount > 0 || deletedCount > 0;
  return {
    success: true,
    files: updatedFiles,
    activeCount,
    movedCount,
    deletedCount,
    reclaimedMB: Number(reclaimedMB.toFixed(1)),
    hasChanges,
    summary: hasChanges
      ? `ตรวจพบไฟล์ถูกลบ ${deletedCount} รายการ และถูกเคลื่อนย้ายตำแหน่ง ${movedCount} รายการ`
      : 'ไฟล์ทุกรายการในระบบยังคงอยู่ที่เดิมและมีขนาดถูกต้อง'
  };
}

// Sync duplicate groups (drop deleted copies, update moved copies, remove groups with < 2 copies)
async function syncDuplicateGroups(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return {
      success: true,
      updatedGroups: [],
      removedGroupsCount: 0,
      removedCopiesCount: 0,
      hasChanges: false
    };
  }

  let removedGroupsCount = 0;
  let removedCopiesCount = 0;
  let hasChanges = false;

  const updatedGroups = [];

  for (const group of groups) {
    const validCopies = [];

    for (const copy of group.copies || []) {
      if (fs.existsSync(copy.path)) {
        validCopies.push(copy);
      } else {
        // Check if copy was moved
        const fileName = path.basename(copy.path);
        const candidates = getMovedCandidatePaths(copy.path, fileName);
        let movedPath = null;

        for (const cand of candidates) {
          try {
            if (fs.existsSync(cand)) {
              const st = fs.statSync(cand);
              const candSizeMB = Number((st.size / (1024 * 1024)).toFixed(1));
              if (Math.abs(candSizeMB - group.sizeEachMB) <= 1) {
                movedPath = cand;
                break;
              }
            }
          } catch (e) {}
        }

        if (movedPath) {
          hasChanges = true;
          validCopies.push({
            ...copy,
            path: movedPath,
            moved: true
          });
        } else {
          // Copy was deleted
          hasChanges = true;
          removedCopiesCount++;
        }
      }
    }

    // A duplicate group must have at least 2 copies to remain valid
    if (validCopies.length >= 2) {
      updatedGroups.push({
        ...group,
        copies: validCopies
      });
    } else {
      // 0 or 1 copy left, so it is no longer duplicate!
      hasChanges = true;
      removedGroupsCount++;
    }
  }

  return {
    success: true,
    updatedGroups,
    removedGroupsCount,
    removedCopiesCount,
    hasChanges
  };
}

// Delete a specific file (Safe Delete to Recycle Bin or Permanent Delete) with blocker detection
async function deleteFileItem(targetPath, safeRecycleBin = true) {
  if (!targetPath) {
    return { success: false, error: 'ไม่ระบุตำแหน่งไฟล์' };
  }

  if (!fs.existsSync(targetPath)) {
    return { success: true, alreadyGone: true, message: 'ไฟล์นี้ถูกลบไปแล้ว' };
  }

  clearReadOnly(targetPath);

  // 1. If Safe Delete requested, send to Recycle Bin
  if (safeRecycleBin) {
    try {
      await shell.trashItem(targetPath);
      return { success: true, method: 'recycle', message: 'ย้ายไฟล์ลงถังขยะ Recycle Bin เรียบร้อย' };
    } catch (trashErr) {
      // Fall through to try permanent removal if trash fails
    }
  }

  // 2. Direct removal
  try {
    const stat = fs.lstatSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return { success: true, method: 'permanent', message: 'ลบไฟล์ถาวรเรียบร้อย' };
  } catch (rmErr) {
    // Find running processes that might lock the file
    let blockers = [];
    try {
      const res = await runPowerShell(
        `Get-Process -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle, Path | ConvertTo-Json -Depth 2`
      );
      if (res.success && res.data) {
        const procList = Array.isArray(res.data) ? res.data : [res.data];
        const lowerName = path.basename(targetPath).toLowerCase();
        const lowerPath = targetPath.toLowerCase();

        for (const p of procList) {
          const pName = (p.ProcessName || '').toLowerCase();
          if (
            pName &&
            (lowerPath.includes(pName) ||
              lowerName.includes(pName) ||
              (p.Path && lowerPath.includes(path.dirname(p.Path).toLowerCase())))
          ) {
            blockers.push({
              pid: p.Id,
              processName: `${p.ProcessName}.exe`,
              windowTitle: p.MainWindowTitle || '',
              path: p.Path || ''
            });
          }
        }
      }
    } catch (e) {}

    return {
      success: false,
      error:
        rmErr.code === 'EBUSY'
          ? 'ไฟล์ถูกโปรแกรมอื่นล็อกใช้งานอยู่ (EBUSY)'
          : rmErr.message || 'ไม่สามารถลบไฟล์ได้',
      code: rmErr.code,
      blockers: blockers.slice(0, 5)
    };
  }
}

// Move a specific file to a destination directory
async function moveFileItem(sourcePath, destDirPath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { success: false, error: 'ไม่พบไฟล์ต้นทางที่ต้องการย้าย' };
  }

  if (!destDirPath) {
    return { success: false, error: 'ไม่ระบุโฟลเดอร์ปลายทาง' };
  }

  try {
    if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true });
    }

    const fileName = path.basename(sourcePath);
    let targetPath = path.join(destDirPath, fileName);

    // If file with same name already exists in target folder, give unique name
    if (fs.existsSync(targetPath)) {
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      targetPath = path.join(destDirPath, `${baseName}_moved_${Date.now()}${ext}`);
    }

    try {
      fs.renameSync(sourcePath, targetPath);
    } catch (renameErr) {
      if (renameErr.code === 'EXDEV') {
        // Cross-device link: copy then unlink
        fs.copyFileSync(sourcePath, targetPath);
        fs.unlinkSync(sourcePath);
      } else {
        throw renameErr;
      }
    }

    return {
      success: true,
      newPath: targetPath,
      newDrive: targetPath.substring(0, 2).toUpperCase(),
      fileName: path.basename(targetPath)
    };
  } catch (err) {
    return {
      success: false,
      error:
        err.code === 'EBUSY'
          ? 'ไฟล์ถูกล็อก ไม่สามารถย้ายได้'
          : err.message || 'เกิดข้อผิดพลาดในการย้ายไฟล์'
    };
  }
}

// Inspect specific files (metadata, lock status, existence, in-use processes)
async function inspectFiles(filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return [];
  }

  let runningProcs = [];
  try {
    const res = await runPowerShell(
      `Get-Process -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle, Path | ConvertTo-Json -Depth 2`
    );
    if (res.success && res.data) {
      runningProcs = Array.isArray(res.data) ? res.data : [res.data];
    }
  } catch (e) {}

  const results = [];
  for (const fPath of filePaths) {
    if (!fPath || typeof fPath !== 'string') continue;

    const baseName = path.basename(fPath);
    const ext = path.extname(fPath).toLowerCase();
    const drive = fPath.substring(0, 2).toUpperCase();

    if (!fs.existsSync(fPath)) {
      results.push({
        id: `inspect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        path: fPath,
        name: baseName,
        extension: ext,
        drive,
        exists: false,
        sizeMB: 0,
        sizeBytes: 0,
        formattedSize: '0 B',
        category: 'ไม่พบไฟล์',
        lastModified: '-',
        createdDate: '-',
        isLocked: false,
        lockedBy: [],
        status: 'deleted',
        statusText: 'ไม่พบไฟล์ (อาจถูกลบหรือย้ายแล้ว)'
      });
      continue;
    }

    try {
      const st = fs.statSync(fPath);
      const isDir = st.isDirectory();
      const sizeBytes = st.size;
      const sizeMB = Number((sizeBytes / (1024 * 1024)).toFixed(2));
      const formattedSize = isDir
        ? 'โฟลเดอร์'
        : sizeBytes < 1024
        ? `${sizeBytes} B`
        : sizeBytes < 1024 * 1024
        ? `${(sizeBytes / 1024).toFixed(1)} KB`
        : sizeBytes < 1024 * 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

      let category = 'ไฟล์ทั่วไป';
      if (['.exe', '.msi', '.dll', '.sys', '.bat', '.cmd', '.ps1'].includes(ext)) {
        category = 'โปรแกรม/ระบบ (Executable)';
      } else if (['.zip', '.rar', '.7z', '.tar', '.gz', '.iso', '.vhd'].includes(ext)) {
        category = 'ไฟล์บีบอัด/อิมเมจ (Archive)';
      } else if (['.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac', '.wav', '.jpg', '.png', '.gif'].includes(ext)) {
        category = 'สื่อมีเดีย (Media)';
      } else if (['.log', '.tmp', '.bak', '.old', '.dmp'].includes(ext)) {
        category = 'ไฟล์บันทึก/แคช (Log/Temp)';
      } else if (['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.csv'].includes(ext)) {
        category = 'เอกสาร (Document)';
      } else if (isDir) {
        category = 'โฟลเดอร์ไดเรกทอรี';
      }

      let isLocked = false;
      const lockedBy = [];

      if (!isDir) {
        try {
          const fd = fs.openSync(fPath, 'r+');
          fs.closeSync(fd);
        } catch (openErr) {
          if (openErr.code === 'EBUSY' || openErr.code === 'EPERM') {
            isLocked = true;
          }
        }
      }

      const lowerPath = fPath.toLowerCase();
      const lowerBase = baseName.toLowerCase();
      for (const p of runningProcs) {
        const pName = (p.ProcessName || '').toLowerCase();
        const pPath = (p.Path || '').toLowerCase();
        if (
          (pPath && pPath === lowerPath) ||
          (pName && `${pName}.exe` === lowerBase) ||
          (pPath && isDir && pPath.startsWith(lowerPath))
        ) {
          lockedBy.push({
            pid: p.Id,
            processName: `${p.ProcessName}.exe`,
            windowTitle: p.MainWindowTitle || '',
            path: p.Path || ''
          });
          isLocked = true;
        }
      }

      results.push({
        id: `inspect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        path: fPath,
        name: baseName,
        extension: ext,
        drive,
        exists: true,
        isDirectory: isDir,
        sizeMB,
        sizeBytes,
        formattedSize,
        category,
        lastModified: st.mtime.toLocaleString('th-TH'),
        createdDate: st.birthtime.toLocaleString('th-TH'),
        isLocked,
        lockedBy: lockedBy.slice(0, 5),
        status: isLocked ? 'locked' : 'normal',
        statusText: isLocked
          ? `ไฟล์ถูกล็อก/ใช้งานอยู่ (${lockedBy.length > 0 ? lockedBy[0].processName : 'In Use'})`
          : 'ปกติ สมบูรณ์ พร้อมจัดการ'
      });
    } catch (statErr) {
      results.push({
        id: `inspect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        path: fPath,
        name: baseName,
        extension: ext,
        drive,
        exists: true,
        sizeMB: 0,
        sizeBytes: 0,
        formattedSize: 'ไม่ระบุ',
        category: 'จำกัดสิทธิ์เข้าถึง',
        lastModified: '-',
        createdDate: '-',
        isLocked: true,
        lockedBy: [],
        status: 'error',
        statusText: `เกิดข้อผิดพลาด: ${statErr.message}`
      });
    }
  }

  return results;
}

// ==============================================================================
// FILE ORGANIZER ENGINE (v0.10.3)
// Rule Engine, Dry-run Preview, Conflict Handling, Safe Cross-Drive Move & Undo Journal
// ==============================================================================

function getOrganizerStorageDir() {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Preferences') : path.join(os.homedir(), '.local/share'));
  const targetDir = path.join(appData, 'SysInfo', 'organizer');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

const DEFAULT_PRESET_RULES = [
  {
    id: 'preset_by_type',
    name: 'จัดตามประเภทไฟล์ (By File Type)',
    description: 'จัดหมวดหมู่แยกรูปภาพ, เอกสาร, วิดีโอ, สื่อ, ซิป, โปรแกรม และโค้ดลงโฟลเดอร์ย่อย',
    isPreset: true,
    isEnabled: true,
    priority: 10,
    targetTemplate: '{type}',
    conflictStrategy: 'rename',
    conditions: [
      { ruleType: 'category', category: 'All' }
    ]
  },
  {
    id: 'preset_by_date',
    name: 'จัดตามปีและเดือน (By Date: YYYY/MM)',
    description: 'จัดระเบียบไฟล์ตามช่วงเวลาที่สร้างหรือแก้ไขล่าสุดลงโฟลเดอร์ตามปีและเดือน (เช่น 2026/10)',
    isPreset: true,
    isEnabled: true,
    priority: 20,
    targetTemplate: '{year}/{month}',
    conflictStrategy: 'rename',
    conditions: [
      { ruleType: 'category', category: 'All' }
    ]
  },
  {
    id: 'preset_downloads',
    name: 'จัดระเบียบโฟลเดอร์ Downloads',
    description: 'ล้างโฟลเดอร์ดาวน์โหลด โดยแยกเอกสาร, โปรแกรมติดตั้ง, ซิป และสื่อมีเดียตามประเภทและปี',
    isPreset: true,
    isEnabled: true,
    priority: 30,
    targetTemplate: '{type}/{year}',
    conflictStrategy: 'rename',
    conditions: [
      { ruleType: 'category', category: 'All' }
    ]
  },
  {
    id: 'preset_dev_game',
    name: 'จัดระเบียบ Dev & Game Assets',
    description: 'แยกไฟล์แอสเซทเกม (.pak, .ucas, .bundle), ซอสโค้ด (.ts, .rs, .py), บันทึก log และไฟล์บิลด์',
    isPreset: true,
    isEnabled: true,
    priority: 40,
    targetTemplate: 'Assets/{type}',
    conflictStrategy: 'rename',
    conditions: [
      { ruleType: 'category', category: 'All' }
    ]
  }
];

function getFileCategory(ext) {
  const e = (ext || '').toLowerCase().replace(/^\./, '');
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'psd', 'raw'].includes(e)) return 'Images';
  if (['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'md', 'rtf', 'csv'].includes(e)) return 'Documents';
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'].includes(e)) return 'Videos';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(e)) return 'Audio';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'vhd'].includes(e)) return 'Archives';
  if (['exe', 'msi', 'bat', 'cmd', 'ps1', 'apk'].includes(e)) return 'Executables';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'cpp', 'c', 'h', 'java', 'html', 'css', 'json', 'xml', 'yaml', 'yml'].includes(e)) return 'Code';
  if (['pak', 'ucas', 'utoc', 'starpak', 'vpk', 'bundle', 'assets', 'unity3d', 'res', 'wad', 'bik', 'dat'].includes(e)) return 'GameAssets';
  return 'Others';
}

function calculateFileSha256(filePath) {
  try {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(65536);
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
    fs.closeSync(fd);
    return hash.digest('hex');
  } catch (err) {
    return '';
  }
}

function formatSize(sizeMB) {
  if (sizeMB >= 1024) {
    return `${(sizeMB / 1024).toFixed(2)} GB`;
  }
  return `${sizeMB.toFixed(2)} MB`;
}

function checkSafetyBoundary(targetPath) {
  const norm = path.normalize(targetPath).toLowerCase();
  const protectedRoots = [
    'c:\\windows',
    'c:\\program files',
    'c:\\program files (x86)',
    'c:\\recovery',
    'c:\\$recycle.bin',
    'c:\\system volume information'
  ];
  for (const root of protectedRoots) {
    if (norm === root || norm.startsWith(root + '\\')) {
      return { safe: false, reason: `ตำแหน่งระบบของ Windows ได้รับการปกป้อง (${targetPath}) ห้ามจัดระเบียบไฟล์เข้า/ออกจากระบบนี้` };
    }
  }

  // Check project markers
  const markers = ['.git', 'package.json', 'cargo.toml', 'go.mod'];
  try {
    for (const marker of markers) {
      if (fs.existsSync(path.join(targetPath, marker))) {
        return { safe: false, reason: `ตรวจพบโครงสร้างโปรเจกต์นักพัฒนา (${marker}) ในโฟลเดอร์นี้ ไม่อนุญาตให้แยกไฟล์โปรเจกต์ออกจากกันเพื่อป้องกันความเสียหาย` };
      }
    }
  } catch (e) {}

  return { safe: true };
}

function expandDestinationTemplate(baseTargetDir, filePath, template, counter, category, stat) {
  const baseName = path.basename(filePath);
  const ext = path.extname(filePath).replace(/^\./, '');
  const stem = path.basename(filePath, path.extname(filePath));
  const mtime = stat ? new Date(stat.mtime) : new Date();

  const year = String(mtime.getFullYear());
  const month = String(mtime.getMonth() + 1).padStart(2, '0');
  const day = String(mtime.getDate()).padStart(2, '0');
  const sizeMB = stat ? (stat.size / (1024 * 1024)).toFixed(1) + 'MB' : '0MB';

  let subDir = (template || '{type}')
    .replace(/\{type\}/gi, category)
    .replace(/\{ext\}/gi, ext || 'unknown')
    .replace(/\{year\}/gi, year)
    .replace(/\{month\}/gi, month)
    .replace(/\{day\}/gi, day)
    .replace(/\{name\}/gi, stem)
    .replace(/\{size\}/gi, sizeMB)
    .replace(/\{counter\}/gi, String(counter).padStart(2, '0'));

  subDir = subDir.replace(/[\/\\:]+/g, '\\').replace(/^\\+|\\+$/g, '');
  const targetDir = path.join(baseTargetDir, subDir);
  return path.join(targetDir, baseName);
}

// Rules CRUD
async function organizerListRules() {
  const rulesPath = path.join(getOrganizerStorageDir(), 'rules.json');
  try {
    if (fs.existsSync(rulesPath)) {
      const customRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8') || '[]');
      const ruleMap = new Map();
      DEFAULT_PRESET_RULES.forEach(r => ruleMap.set(r.id, r));
      customRules.forEach(r => ruleMap.set(r.id, r));
      return Array.from(ruleMap.values()).sort((a, b) => (a.priority || 100) - (b.priority || 100));
    }
  } catch (err) {}
  return DEFAULT_PRESET_RULES;
}

async function organizerSaveRule(rule) {
  if (!rule || !rule.id) {
    return { success: false, error: 'ข้อมูลกฎไม่ถูกต้อง' };
  }
  const rulesPath = path.join(getOrganizerStorageDir(), 'rules.json');
  try {
    const current = await organizerListRules();
    const index = current.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      current[index] = { ...current[index], ...rule, updatedAt: new Date().toISOString() };
    } else {
      current.push({ ...rule, isPreset: false, createdAt: new Date().toISOString() });
    }
    fs.writeFileSync(rulesPath, JSON.stringify(current, null, 2), 'utf8');
    return { success: true, rule };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function organizerDeleteRule(ruleId) {
  const rulesPath = path.join(getOrganizerStorageDir(), 'rules.json');
  try {
    const current = await organizerListRules();
    const filtered = current.filter(r => r.id !== ruleId && !r.isPreset);
    fs.writeFileSync(rulesPath, JSON.stringify(filtered, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Preview Engine
async function organizerPreview(params) {
  const { sourceDir, targetBaseDir, ruleId, customTemplate, conflictStrategy = 'rename', recursive = false } = params || {};

  if (!sourceDir || !fs.existsSync(sourceDir)) {
    return { success: false, error: 'ไม่พบโฟลเดอร์ต้นทางที่ระบุ' };
  }

  const boundaryCheck = checkSafetyBoundary(sourceDir);
  if (!boundaryCheck.safe) {
    return { success: false, error: boundaryCheck.reason };
  }

  const effectiveTarget = targetBaseDir || sourceDir;
  const rules = await organizerListRules();
  const selectedRule = rules.find(r => r.id === ruleId) || rules[0] || DEFAULT_PRESET_RULES[0];
  const template = customTemplate || selectedRule.targetTemplate || '{type}';

  const planItems = [];
  let totalBytes = 0;
  let conflictsCount = 0;
  let identicalDuplicatesCount = 0;
  let counter = 1;

  function scanFolder(dir, depth = 0) {
    if (depth > (recursive ? 3 : 0)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (recursive && !['node_modules', '.git', '$recycle.bin'].includes(entry.name.toLowerCase())) {
            scanFolder(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            const ext = path.extname(entry.name);
            const category = getFileCategory(ext);

            const plannedTarget = expandDestinationTemplate(effectiveTarget, fullPath, template, counter, category, stat);
            counter++;

            let conflictType = 'none';
            let suggestedAction = conflictStrategy;

            if (fs.existsSync(plannedTarget)) {
              conflictsCount++;
              try {
                const targetStat = fs.statSync(plannedTarget);
                if (targetStat.size === stat.size) {
                  const srcHash = calculateFileSha256(fullPath);
                  const destHash = calculateFileSha256(plannedTarget);
                  if (srcHash && destHash && srcHash === destHash) {
                    conflictType = 'identical_duplicate';
                    identicalDuplicatesCount++;
                    suggestedAction = 'recycle_duplicate';
                  } else {
                    conflictType = 'name_collision';
                    suggestedAction = 'rename';
                  }
                } else {
                  conflictType = 'name_collision';
                  suggestedAction = 'rename';
                }
              } catch (e) {
                conflictType = 'name_collision';
              }
            }

            const sizeBytes = stat.size;
            totalBytes += sizeBytes;
            const srcDrive = path.parse(fullPath).root.toUpperCase();
            const destDrive = path.parse(plannedTarget).root.toUpperCase();
            const isCrossDrive = srcDrive !== destDrive;

            planItems.push({
              id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              sourcePath: fullPath,
              targetPath: plannedTarget,
              fileName: entry.name,
              extension: ext,
              category,
              sizeBytes,
              formattedSize: formatSize(sizeBytes / (1024 * 1024)),
              modifiedAt: stat.mtime.toISOString(),
              mtimeMs: stat.mtimeMs,
              matchedRuleName: selectedRule.name,
              conflictType,
              suggestedAction,
              isCrossDrive,
              isSelected: true
            });
          } catch (fileErr) {}
        }
      }
    } catch (dirErr) {}
  }

  scanFolder(sourceDir, 0);

  return {
    success: true,
    sourceDirectory: sourceDir,
    targetBaseDirectory: effectiveTarget,
    totalFiles: planItems.length,
    totalBytes,
    conflictsCount,
    identicalDuplicatesCount,
    planItems
  };
}

// Safe Cross-Drive File Move with Verification
function executeSafeMove(src, dest, conflictAction, srcStat) {
  let finalDest = dest;
  const destDir = path.dirname(dest);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Handle conflicts
  if (fs.existsSync(finalDest)) {
    if (conflictAction === 'skip') {
      return { skipped: true, reason: 'File already exists and skip was requested' };
    } else if (conflictAction === 'recycle_duplicate') {
      try {
        shell.trashItem(src);
        return { recycledDuplicate: true };
      } catch (e) {
        return { skipped: true, reason: 'Failed sending duplicate to Recycle Bin' };
      }
    } else if (conflictAction === 'rename' || !conflictAction) {
      const ext = path.extname(dest);
      const stem = path.basename(dest, ext);
      let idx = 1;
      while (fs.existsSync(path.join(destDir, `${stem} (${idx})${ext}`))) {
        idx++;
      }
      finalDest = path.join(destDir, `${stem} (${idx})${ext}`);
    }
  }

  const isCross = path.parse(src).root.toLowerCase() !== path.parse(finalDest).root.toLowerCase();
  const stat = srcStat || fs.statSync(src);

  if (!isCross) {
    try {
      fs.renameSync(src, finalDest);
      return { success: true, finalDest, isCrossDrive: false };
    } catch (renameErr) {
      if (renameErr.code !== 'EXDEV') {
        throw renameErr;
      }
    }
  }

  // Cross-drive: Copy -> Verify Size & Hash -> Preserve Timestamp -> Delete source
  const tempDest = `${finalDest}.tmp_${Date.now()}`;
  fs.copyFileSync(src, tempDest);

  const copiedStat = fs.statSync(tempDest);
  if (copiedStat.size !== stat.size) {
    try { fs.unlinkSync(tempDest); } catch (e) {}
    throw new Error('Cross-drive verification failed: File size mismatch');
  }

  const srcHash = calculateFileSha256(src);
  const copiedHash = calculateFileSha256(tempDest);
  if (srcHash && copiedHash && srcHash !== copiedHash) {
    try { fs.unlinkSync(tempDest); } catch (e) {}
    throw new Error('Cross-drive verification failed: File SHA-256 hash mismatch');
  }

  fs.renameSync(tempDest, finalDest);
  try {
    fs.utimesSync(finalDest, stat.atime, stat.mtime);
  } catch (e) {}
  fs.unlinkSync(src);

  return { success: true, finalDest, isCrossDrive: true, hash: srcHash };
}

// Batch Apply & Undo Journal
async function organizerApply(params) {
  const { batchId, ruleId, ruleName, sourceDir, targetBaseDir, items = [] } = params || {};
  const currentBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const journalPath = path.join(getOrganizerStorageDir(), 'journal.json');

  const moveRecords = [];
  let movedCount = 0;
  let failedCount = 0;
  let recycledCount = 0;
  let totalMovedBytes = 0;
  const errors = [];

  for (const item of items) {
    if (!item.isSelected) continue;
    const src = item.sourcePath;
    const target = item.targetPath;

    if (!fs.existsSync(src)) {
      failedCount++;
      errors.push(`File missing at source: ${src}`);
      continue;
    }

    try {
      const stat = fs.statSync(src);
      const res = executeSafeMove(src, target, item.suggestedAction || 'rename', stat);

      if (res.skipped) {
        continue;
      } else if (res.recycledDuplicate) {
        recycledCount++;
        continue;
      }

      movedCount++;
      totalMovedBytes += item.sizeBytes || stat.size;
      moveRecords.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sourcePath: src,
        destinationPath: res.finalDest,
        fileSize: item.sizeBytes || stat.size,
        sourceMtimeMs: stat.mtimeMs,
        sourceHash: res.hash || '',
        isCrossDrive: res.isCrossDrive || false,
        movedAt: new Date().toISOString(),
        status: 'moved'
      });
    } catch (err) {
      failedCount++;
      errors.push(`Failed moving ${path.basename(src)}: ${err.message}`);
    }
  }

  const batchRecord = {
    batchId: currentBatchId,
    ruleId: ruleId || 'custom',
    ruleName: ruleName || 'จัดระเบียบไฟล์',
    sourceDirectory: sourceDir,
    targetBaseDirectory: targetBaseDir || sourceDir,
    totalFiles: movedCount,
    totalBytes: totalMovedBytes,
    recycledDuplicates: recycledCount,
    failedFiles: failedCount,
    createdAt: new Date().toISOString(),
    formattedDate: new Date().toLocaleString('th-TH'),
    isUndone: false,
    undoneAt: null,
    records: moveRecords
  };

  try {
    let history = [];
    if (fs.existsSync(journalPath)) {
      history = JSON.parse(fs.readFileSync(journalPath, 'utf8') || '[]');
    }
    history.unshift(batchRecord);
    fs.writeFileSync(journalPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (jErr) {}

  return {
    success: true,
    batch: batchRecord,
    movedCount,
    recycledCount,
    failedCount,
    errors
  };
}

// Undo Engine
async function organizerUndo(batchId) {
  if (!batchId) {
    return { success: false, error: 'ไม่ระบุรหัส Batch ที่ต้องการย้อนกลับ' };
  }

  const journalPath = path.join(getOrganizerStorageDir(), 'journal.json');
  if (!fs.existsSync(journalPath)) {
    return { success: false, error: 'ไม่พบบันทึกประวัติ Journal ของการจัดระเบียบไฟล์' };
  }

  try {
    const history = JSON.parse(fs.readFileSync(journalPath, 'utf8') || '[]');
    const batch = history.find(b => b.batchId === batchId);
    if (!batch) {
      return { success: false, error: `ไม่พบประวัติ Batch: ${batchId}` };
    }
    if (batch.isUndone) {
      return { success: false, error: 'ชุดไฟล์นี้ถูกย้อนกลับ (Undo) ไปเรียบร้อยแล้ว' };
    }

    let restoredCount = 0;
    let failedCount = 0;
    const errors = [];
    const restoredFiles = [];

    // Revert records in reverse order
    const records = [...(batch.records || [])].reverse();
    for (const rec of records) {
      const dest = rec.destinationPath;
      const origSrc = rec.sourcePath;

      if (!fs.existsSync(dest)) {
        failedCount++;
        errors.push(`ไฟล์ปลายทางหายไป ไม่สามารถย้อนกลับได้: ${dest}`);
        continue;
      }

      try {
        const destStat = fs.statSync(dest);
        const res = executeSafeMove(dest, origSrc, 'overwrite', destStat);
        if (rec.sourceMtimeMs) {
          try {
            const origDate = new Date(rec.sourceMtimeMs);
            fs.utimesSync(origSrc, origDate, origDate);
          } catch (utErr) {}
        }
        rec.status = 'restored';
        restoredCount++;
        restoredFiles.push(origSrc);
      } catch (err) {
        failedCount++;
        errors.push(`ย้อนกลับไฟล์ ${path.basename(dest)} ล้มเหลว: ${err.message}`);
      }
    }

    batch.isUndone = true;
    batch.undoneAt = new Date().toISOString();
    fs.writeFileSync(journalPath, JSON.stringify(history, null, 2), 'utf8');

    return {
      success: true,
      batchId,
      restoredCount,
      failedCount,
      restoredFiles,
      errors
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// History & Journal
async function organizerGetHistory() {
  const journalPath = path.join(getOrganizerStorageDir(), 'journal.json');
  try {
    if (fs.existsSync(journalPath)) {
      return JSON.parse(fs.readFileSync(journalPath, 'utf8') || '[]');
    }
  } catch (e) {}
  return [];
}

// Clean Empty Folders
async function organizerCleanEmptyFolders(sourceDir) {
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    return { success: false, error: 'ไม่พบโฟลเดอร์ที่ระบุ' };
  }

  const boundaryCheck = checkSafetyBoundary(sourceDir);
  if (!boundaryCheck.safe) {
    return { success: false, error: boundaryCheck.reason };
  }

  const emptyFolders = [];
  const deletedFolders = [];

  function findAndRemoveEmptyDirs(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(dir, entry.name);
          findAndRemoveEmptyDirs(subDir);
        }
      }

      const remaining = fs.readdirSync(dir);
      if (remaining.length === 0 && dir.toLowerCase() !== sourceDir.toLowerCase()) {
        emptyFolders.push(dir);
        try {
          fs.rmdirSync(dir);
          deletedFolders.push(dir);
        } catch (rmErr) {}
      }
    } catch (e) {}
  }

  findAndRemoveEmptyDirs(sourceDir);

  return {
    success: true,
    sourceDir,
    totalCleaned: deletedFolders.length,
    deletedFolders
  };
}

// Watch Folder Check (Recommendation Mode)
async function organizerCheckWatchFolder(watchPath) {
  const target = watchPath || path.join(os.homedir(), 'Downloads');
  if (!fs.existsSync(target)) {
    return { hasRecommendation: false };
  }

  try {
    const entries = fs.readdirSync(target, { withFileTypes: true });
    const files = entries.filter(e => e.isFile());
    if (files.length >= 8) {
      return {
        hasRecommendation: true,
        folderPath: target,
        fileCount: files.length,
        suggestedRuleName: 'จัดระเบียบโฟลเดอร์ Downloads',
        message: `พบไฟล์สะสมในโฟลเดอร์ ${path.basename(target)} จำนวน ${files.length} ไฟล์ คุณสามารถจัดระเบียบให้เข้าที่ได้ด้วย 1 คลิก`
      };
    }
  } catch (e) {}

  return { hasRecommendation: false };
}

module.exports = {
  getSystemDrives,
  getSystemTelemetry,
  getActivePorts,
  getWindowsServices,
  stopService,
  startService,
  killProcess,
  scanUninstallBlockers,
  scanRealJunk,
  cleanJunkItems,
  scanLargeFiles,
  getStartupApps,
  openWindowsAddRemove,
  openInstallFolder,
  uninstallSelf,
  getAllBackgroundProcesses,
  detectProgramConflicts,
  resolveConflict,
  syncFilesStatus,
  syncDuplicateGroups,
  deleteFileItem,
  moveFileItem,
  inspectFiles,
  getDetectedGameRoots,
  scanGameLibraries,
  organizerListRules,
  organizerSaveRule,
  organizerDeleteRule,
  organizerPreview,
  organizerApply,
  organizerUndo,
  organizerGetHistory,
  organizerCleanEmptyFolders,
  organizerCheckWatchFolder
};
