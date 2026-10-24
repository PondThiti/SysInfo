import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  HardDrive,
  Trash2,
  Network,
  Search,
  RefreshCw,
  FolderOpen,
  Copy,
  Check,
  AlertTriangle,
  Cpu,
  MemoryStick,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Zap,
  FileText,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
  X,
  Minus,
  Square,
  Settings,
  SlidersHorizontal,
  ArrowUpDown,
  Power,
  StopCircle,
  PlayCircle,
  Unlock,
  Play,
  Sun,
  Moon,
  Type
} from 'lucide-react';

// Format size helper (MB to MB/GB)
function formatSize(sizeMB: number): string {
  if (sizeMB >= 1024) {
    return `${(sizeMB / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(sizeMB).toLocaleString()} MB`;
}

interface ToastInfo {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface IpcLog {
  id: string;
  time: string;
  cmd: string;
  detail: string;
  durationMs: number;
}

export default function App() {
  // Navigation tabs: 'dashboard' | 'storage' | 'cleaner' | 'ports' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'storage' | 'cleaner' | 'ports' | 'settings'>('dashboard');
  const [storageSubTab, setStorageSubTab] = useState<'heavy' | 'duplicates'>('heavy');
  const [portSubTab, setPortSubTab] = useState<'ports' | 'services' | 'blockers' | 'startup'>('ports');

  // Real data states (NO mock data!)
  const [systemDrives, setSystemDrives] = useState<any[]>([]);
  const [largeFiles, setLargeFiles] = useState<any[]>([]);
  const [directoryBreakdown, setDirectoryBreakdown] = useState<any[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [junkCategories, setJunkCategories] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [windowsServices, setWindowsServices] = useState<any[]>([]);
  const [startupApps, setStartupApps] = useState<any[]>([]);

  // Uninstall Blocker & Hidden Tasks state
  const [blockerSearch, setBlockerSearch] = useState('');
  const [blockerResults, setBlockerResults] = useState<{ target: string; blockers: any[]; services: any[] }>({
    target: '',
    blockers: [],
    services: []
  });
  const [isScanningBlockers, setIsScanningBlockers] = useState(false);

  // Live System Telemetry
  const [cpuUsage, setCpuUsage] = useState(12);
  const [ramUsageGB, setRamUsageGB] = useState(8.2);
  const [totalRamGB, setTotalRamGB] = useState(16);

  // Storage Filters & UI controls
  const [selectedDrive, setSelectedDrive] = useState('ALL');
  const [selectedTreemapBlock, setSelectedTreemapBlock] = useState<any>(null);
  const [storageSearch, setStorageSearch] = useState('');
  const [storageSortAsc, setStorageSortAsc] = useState(false);
  const [isScanningStorage, setIsScanningStorage] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);

  // Ports & Services filters
  const [portSearch, setPortSearch] = useState('');
  const [portFilter, setPortFilter] = useState<'all' | 'dev' | 'services' | 'tcp' | 'udp'>('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'running' | 'ports' | 'stopped'>('all');

  // Cleaner state
  const [safeRecycleBin, setSafeRecycleBin] = useState(true);
  const [isCleaningJunk, setIsCleaningJunk] = useState(false);
  const [totalCleanedSessionMB, setTotalCleanedSessionMB] = useState(0);

  // Settings
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('syspulse_theme') as 'dark' | 'light') || 'dark';
  });
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large' | 'xl'>(() => {
    return (localStorage.getItem('syspulse_font_size') as 'small' | 'normal' | 'large' | 'xl') || 'normal';
  });
  const [telemetryInterval, setTelemetryInterval] = useState(2500);
  const [minHeavyFileSizeMB, setMinHeavyFileSizeMB] = useState(25);
  const [scanDepth, setScanDepth] = useState(4);
  const [autoResolveServices, setAutoResolveServices] = useState(true);

  // Sync Theme & Font Size with HTML document root & LocalStorage
  useEffect(() => {
    localStorage.setItem('syspulse_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('syspulse_font_size', fontSize);
    document.documentElement.classList.remove(
      'font-size-small',
      'font-size-normal',
      'font-size-large',
      'font-size-xl'
    );
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  // IPC Console & Toast Notifications
  const [showIpcConsole, setShowIpcConsole] = useState(false);
  const [ipcLogs, setIpcLogs] = useState<IpcLog[]>([]);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mainViewportRef = useRef<HTMLDivElement>(null);

  const showToast = (title: string, description: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const logIpc = (cmd: string, detail: string, durationMs = 0) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setIpcLogs((prev) => [
      { id: `ipc_${Date.now()}_${Math.random()}`, time: timeStr, cmd, detail, durationMs },
      ...prev.slice(0, 39)
    ]);
  };

  // 1. Initial Native Queries
  useEffect(() => {
    // A. Drives
    (window as any).electronAPI?.getSystemDrives?.().then((drives: any[]) => {
      if (drives && Array.isArray(drives)) {
        setSystemDrives(drives);
        logIpc('get_system_drives', `ตรวจพบ ${drives.length} ไดรฟ์จริงในเครื่องของผู้ใช้`);
      }
    }).catch(() => {});

    // B. Telemetry
    const fetchTelemetry = () => {
      (window as any).electronAPI?.getSystemTelemetry?.().then((t: any) => {
        if (t) {
          setCpuUsage(t.cpuPercent);
          setRamUsageGB(t.usedMemGB);
          setTotalRamGB(t.totalMemGB);
        }
      }).catch(() => {});
    };
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, telemetryInterval);

    // C. Active Ports
    (window as any).electronAPI?.scanActivePorts?.().then((realPorts: any[]) => {
      if (realPorts && Array.isArray(realPorts)) {
        setPorts(realPorts);
        logIpc('scan_active_ports', `สแกนพบ ${realPorts.length} พอร์ตที่เปิดอยู่จริง`);
      }
    }).catch(() => {});

    // D. Windows Services
    (window as any).electronAPI?.getWindowsServices?.().then((services: any[]) => {
      if (services && Array.isArray(services)) {
        setWindowsServices(services);
        logIpc('get_windows_services', `ดึงข้อมูล ${services.length} Windows Services พร้อมพอร์ตที่ผูกอยู่`);
      }
    }).catch(() => {});

    // E. Junk Files
    (window as any).electronAPI?.scanRealJunk?.().then((junk: any[]) => {
      if (junk && Array.isArray(junk)) {
        setJunkCategories(junk);
        logIpc('scan_real_junk', 'สแกนพบไฟล์ขยะและแคชจริงในเครื่อง');
      }
    }).catch(() => {});

    // F. Large Files & Real Directory Treemap
    handleTriggerStorageScan('ALL', minHeavyFileSizeMB, scanDepth);

    // G. Startup Apps
    (window as any).electronAPI?.getStartupApps?.().then((apps: any[]) => {
      if (apps && Array.isArray(apps)) {
        setStartupApps(apps);
        logIpc('get_startup_apps', `พบ ${apps.length} โปรแกรม Startup ใน Registry`);
      }
    }).catch(() => {});

    // H. Initial Scan of Background Blockers
    handleScanBlockers('');

    return () => clearInterval(timer);
  }, [telemetryInterval]);

  // Trigger Storage Scan
  const handleTriggerStorageScan = async (drive = selectedDrive, minMB = minHeavyFileSizeMB, depth = scanDepth) => {
    setIsScanningStorage(true);
    setScanProgress(20);
    const start = performance.now();
    logIpc('scan_large_files', `เริ่มสแกนค้นหาไฟล์ขนาดใหญ่และสัดส่วนโฟลเดอร์จริงบนไดรฟ์ ${drive}...`);

    try {
      const res = await (window as any).electronAPI?.scanLargeFiles?.(drive, minMB, depth);
      setScanProgress(100);
      if (res) {
        setLargeFiles(res.files || []);
        setDirectoryBreakdown(res.directoryBreakdown || []);
        setDuplicateGroups(res.duplicates || []);
        const duration = Math.round(performance.now() - start);
        logIpc('scan_large_files', `สแกนสำเร็จ: พบ ${res.files?.length || 0} ไฟล์ใหญ่ และ ${res.directoryBreakdown?.length || 0} โฟลเดอร์จริง`, duration);
        showToast('สแกนไดรฟ์สำเร็จ', `พบ ${res.files?.length || 0} ไฟล์ขนาดใหญ่บนระบบ`, 'success');
      }
    } catch (err: any) {
      showToast('การสแกนเกิดข้อผิดพลาด', err?.message || 'ไม่สามารถสแกนไดรฟ์ได้', 'error');
    } finally {
      setIsScanningStorage(false);
    }
  };

  // Scan Uninstall Blockers & Background Tasks
  const handleScanBlockers = async (target = blockerSearch) => {
    setIsScanningBlockers(true);
    const start = performance.now();
    logIpc('scan_uninstall_blockers', `สแกนหาโปรเซส/เซอร์วิสที่บล็อกการถอนการติดตั้งเป้าหมาย: "${target || 'งานเบื้องหลังทั้งหมด'}"`);

    try {
      const res = await (window as any).electronAPI?.scanUninstallBlockers?.(target);
      if (res) {
        setBlockerResults(res);
        const duration = Math.round(performance.now() - start);
        logIpc('scan_uninstall_blockers', `พบ ${res.blockers?.length || 0} โปรเซส และ ${res.services?.length || 0} เซอร์วิส`, duration);
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถสแกนโปรเซสได้', 'error');
    } finally {
      setIsScanningBlockers(false);
    }
  };

  // Terminate All Blockers & Stop Services for target
  const handleTerminateAllBlockers = async () => {
    const { blockers, services } = blockerResults;
    if (blockers.length === 0 && services.length === 0) return;

    let killedCount = 0;
    let stoppedCount = 0;

    // 1. Stop services
    for (const s of services) {
      if (s.state === 'Running') {
        const res = await (window as any).electronAPI?.stopService?.(s.name);
        if (res?.success) stoppedCount++;
      }
    }

    // 2. Kill processes
    for (const b of blockers) {
      const res = await (window as any).electronAPI?.killProcess?.(b.pid);
      if (res?.success) killedCount++;
    }

    showToast(
      'ปลดล็อกสำเร็จ',
      `ปิดไปแล้ว ${killedCount} โปรเซส และหยุด ${stoppedCount} เซอร์วิส ทำให้สามารถถอนการติดตั้งหรือลบโฟลเดอร์ได้ทันที`,
      'success'
    );

    // Refresh blockers list and ports
    handleScanBlockers(blockerSearch);
    (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
    (window as any).electronAPI?.getWindowsServices?.().then((s: any) => s && setWindowsServices(s));
  };

  // Stop / Start single Windows Service
  const handleToggleService = async (serviceName: string, currentlyRunning: boolean) => {
    if (currentlyRunning) {
      const res = await (window as any).electronAPI?.stopService?.(serviceName);
      if (res?.success) {
        showToast('หยุด Service สำเร็จ', `บริการ ${serviceName} ถูกหยุดแล้ว`, 'success');
      } else {
        showToast('ไม่สามารถหยุด Service ได้', res?.error || 'ต้องการสิทธิ์ Administrator', 'error');
      }
    } else {
      const res = await (window as any).electronAPI?.startService?.(serviceName);
      if (res?.success) {
        showToast('เริ่ม Service สำเร็จ', `บริการ ${serviceName} กำลังทำงาน`, 'success');
      } else {
        showToast('ไม่สามารถเริ่ม Service ได้', res?.error || 'เกิดข้อผิดพลาด', 'error');
      }
    }
    // Refresh services and ports
    (window as any).electronAPI?.getWindowsServices?.().then((s: any) => s && setWindowsServices(s));
    (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
  };

  // Kill single Process
  const handleKillProcess = async (pid: number, processName: string) => {
    const res = await (window as any).electronAPI?.killProcess?.(pid);
    if (res?.success) {
      showToast('ปิด Process สำเร็จ', `ยุติการทำงานของ ${processName} (PID ${pid}) เรียบร้อยแล้ว`, 'success');
      setPorts((prev) => prev.filter((p) => p.pid !== pid));
      setBlockerResults((prev) => ({
        ...prev,
        blockers: prev.blockers.filter((b) => b.pid !== pid)
      }));
    } else {
      showToast('เกิดข้อผิดพลาด', res?.error || 'ไม่สามารถปิดโปรเซสนี้ได้', 'error');
    }
  };

  // Open in explorer
  const handleOpenFolder = (targetPath: string) => {
    (window as any).electronAPI?.openInExplorer?.(targetPath);
  };

  // Copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    (window as any).electronAPI?.clipboardWrite?.(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Toggle junk item selection
  const handleToggleJunkItem = (catId: string, itemId: string) => {
    setJunkCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map((item: any) =>
            item.id === itemId ? { ...item, selected: !item.selected } : item
          )
        };
      })
    );
  };

  // Clean junk items
  const handleCleanJunk = async () => {
    const selectedItems: any[] = [];
    junkCategories.forEach((cat) => {
      cat.items.forEach((item: any) => {
        if (item.selected) selectedItems.push(item);
      });
    });

    if (selectedItems.length === 0) {
      showToast('ไม่มีรายการที่เลือก', 'กรุณาเลือกไฟล์ขยะที่ต้องการทำความสะอาด', 'warning');
      return;
    }

    setIsCleaningJunk(true);
    try {
      const res = await (window as any).electronAPI?.cleanJunkItems?.(selectedItems, safeRecycleBin);
      if (res?.success) {
        setTotalCleanedSessionMB((prev) => prev + res.reclaimedMB);
        showToast(
          'ทำความสะอาดสำเร็จ',
          `ล้างไฟล์ไปแล้ว ${res.cleanedCount} รายการ ได้พื้นที่คืน ${formatSize(res.reclaimedMB)}`,
          'success'
        );
        // Refresh junk list
        const updatedJunk = await (window as any).electronAPI?.scanRealJunk?.();
        if (updatedJunk) setJunkCategories(updatedJunk);
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการลบ', err?.message || 'ไม่สามารถลบไฟล์บางรายการได้', 'error');
    } finally {
      setIsCleaningJunk(false);
    }
  };

  // Computed Drive Options: Only real mounted drives!
  const driveOptions = useMemo(() => {
    return ['ALL', ...systemDrives.map((d) => d.letter)];
  }, [systemDrives]);

  // Computed Storage Filter
  const filteredLargeFiles = useMemo(() => {
    return largeFiles
      .filter((f) => {
        if (selectedDrive !== 'ALL' && f.drive !== selectedDrive) return false;
        if (selectedTreemapBlock && !f.path.toLowerCase().startsWith(selectedTreemapBlock.path.toLowerCase())) {
          return false;
        }
        if (storageSearch.trim()) {
          const q = storageSearch.toLowerCase();
          return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (storageSortAsc ? a.sizeMB - b.sizeMB : b.sizeMB - a.sizeMB));
  }, [largeFiles, selectedDrive, selectedTreemapBlock, storageSearch, storageSortAsc]);

  // Computed Active Ports Filter
  const filteredPorts = useMemo(() => {
    return ports.filter((p) => {
      if (portFilter === 'dev' && !p.isDevPort) return false;
      if (portFilter === 'services' && !p.serviceName) return false;
      if (portFilter === 'tcp' && p.protocol !== 'TCP') return false;
      if (portFilter === 'udp' && p.protocol !== 'UDP') return false;

      if (portSearch.trim()) {
        const q = portSearch.toLowerCase();
        return (
          p.port.toString().includes(q) ||
          p.processName.toLowerCase().includes(q) ||
          p.serviceName.toLowerCase().includes(q) ||
          p.serviceDisplayName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.pid.toString().includes(q)
        );
      }
      return true;
    });
  }, [ports, portFilter, portSearch]);

  // Computed Windows Services Filter
  const filteredServices = useMemo(() => {
    return windowsServices.filter((s) => {
      if (serviceFilter === 'running' && s.state !== 'Running') return false;
      if (serviceFilter === 'stopped' && s.state !== 'Stopped') return false;
      if (serviceFilter === 'ports' && (!s.ports || s.ports.length === 0)) return false;

      if (serviceSearch.trim()) {
        const q = serviceSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.ports && s.ports.some((prt: string) => prt.toLowerCase().includes(q))) ||
          s.pid.toString().includes(q)
        );
      }
      return true;
    });
  }, [windowsServices, serviceFilter, serviceSearch]);

  // Total junk metrics
  const { totalAvailableJunkMB, totalSelectedJunkMB, selectedJunkCount } = useMemo(() => {
    let available = 0;
    let selected = 0;
    let count = 0;
    junkCategories.forEach((cat) => {
      cat.items?.forEach((item: any) => {
        available += item.sizeMB || 0;
        if (item.selected) {
          selected += item.sizeMB || 0;
          count++;
        }
      });
    });
    return {
      totalAvailableJunkMB: available,
      totalSelectedJunkMB: selected,
      selectedJunkCount: count
    };
  }, [junkCategories]);

  return (
    <div className={`h-screen w-screen ${theme === 'light' ? 'theme-light bg-slate-50 text-slate-900' : 'theme-dark bg-slate-950 text-slate-100'} flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-hidden select-none`}>
      {/* =====================================================================
          CUSTOM FIXED TOP HEADER
      ===================================================================== */}
      <header className="h-11 shrink-0 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between select-none z-40 backdrop-blur titlebar-drag-region">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm text-white">SysPulse</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
              v0.0.2 • System Storage & Port Inspector
            </span>
          </div>
          <span className="hidden md:inline-block text-xs text-slate-500 pl-2 border-l border-slate-800">
            Storage Analyzer, Smart Junk Cleaner & Process/Port Inspector
          </span>
        </div>

        {/* Right Titlebar Controls */}
        <div className="flex items-center gap-2.5 no-drag">
          {totalCleanedSessionMB > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ได้พื้นที่คืน: {formatSize(totalCleanedSessionMB)}</span>
            </div>
          )}

          {/* Quick Theme Switch Toggle */}
          <button
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition ${
              theme === 'light'
                ? 'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'
                : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title={theme === 'dark' ? 'สลับเป็นธีมสีขาว (Switch to Light Theme)' : 'สลับเป็นธีมมืด (Switch to Dark Theme)'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">ธีมสีขาว</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">ธีมมืด</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowIpcConsole(!showIpcConsole)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition ${
              showIpcConsole
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="ดูคำสั่งเชื่อมต่อ IPC Backend Console"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>IPC Console ({ipcLogs.length})</span>
          </button>

          {/* Native Window Controls */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              onClick={() => (window as any).electronAPI?.minimize?.()}
              className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
              title="ย่อหน้าต่าง (Minimize)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => (window as any).electronAPI?.maximize?.()}
              className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
              title="ขยาย/คืนขนาดหน้าต่าง (Maximize)"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => (window as any).electronAPI?.close?.()}
              className="w-7 h-7 rounded hover:bg-rose-600/80 flex items-center justify-center text-slate-400 hover:text-white transition"
              title="ปิดโปรแกรม (Close)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN BODY: FIXED LEFT SIDEBAR + INDEPENDENT SCROLLABLE RIGHT VIEWPORT
      ===================================================================== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* FIXED LEFT SIDEBAR (LOCKED IN PLACE) */}
        <aside className="w-64 shrink-0 bg-slate-900/60 border-r border-slate-800/90 p-3 flex flex-col justify-between overflow-y-auto select-none z-30">
          <div className="space-y-1.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              เมนูจัดการระบบ (Main Menu)
            </div>

            {/* Menu 1: Dashboard */}
            <button
              onClick={() => {
                setActiveTab('dashboard');
                mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>ภาพรวมระบบ</div>
                  <div className={`text-[11px] ${activeTab === 'dashboard' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Dashboard
                  </div>
                </div>
              </div>
            </button>

            {/* Menu 2: Storage Analyzer */}
            <button
              onClick={() => {
                setActiveTab('storage');
                mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'storage'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>วิเคราะห์พื้นที่จัดเก็บ</div>
                  <div className={`text-[11px] ${activeTab === 'storage' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Storage Analyzer
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'storage' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {largeFiles.length}
              </span>
            </button>

            {/* Menu 3: Junk Cleaner */}
            <button
              onClick={() => {
                setActiveTab('cleaner');
                mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'cleaner'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>ล้างไฟล์ขยะและแคช</div>
                  <div className={`text-[11px] ${activeTab === 'cleaner' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Smart Cleaner
                  </div>
                </div>
              </div>
              {totalAvailableJunkMB > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {formatSize(totalAvailableJunkMB)}
                </span>
              )}
            </button>

            {/* Menu 4: Ports & Services */}
            <button
              onClick={() => {
                setActiveTab('ports');
                mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'ports'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Network className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>พอร์ต & เซอร์วิส & ตัวปลดล็อก</div>
                  <div className={`text-[11px] ${activeTab === 'ports' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Ports, Services & Blockers
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'ports' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {ports.length}
              </span>
            </button>

            {/* Menu 5: Settings */}
            <button
              onClick={() => {
                setActiveTab('settings');
                mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>การตั้งค่า & ถอนการติดตั้ง</div>
                  <div className={`text-[11px] ${activeTab === 'settings' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Settings & Uninstall
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Live Resource Monitor Box in Sidebar */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-sky-400" /> CPU Load
              </span>
              <span className="font-mono text-white">{cpuUsage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  cpuUsage >= 80 ? 'bg-rose-500' : cpuUsage >= 50 ? 'bg-amber-500' : 'bg-sky-400'
                }`}
                style={{ width: `${cpuUsage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <MemoryStick className="w-3.5 h-3.5 text-indigo-400" /> RAM Used
              </span>
              <span className="font-mono text-white">
                {ramUsageGB} / {totalRamGB} GB
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${Math.round((ramUsageGB / (totalRamGB || 1)) * 100)}%` }}
              />
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>ไดรฟ์ที่ตรวจพบ: {systemDrives.length}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry
              </span>
            </div>
          </div>
        </aside>

        {/* =====================================================================
            INDEPENDENT SCROLLABLE VIEWPORT FOR TABS (LOCKED LAYOUT)
        ===================================================================== */}
        <main ref={mainViewportRef} className="flex-1 p-4 md:p-6 overflow-y-auto h-full space-y-6">
          {/* Toast Notification Floating Banner */}
          {toasts.length > 0 && (
            <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border text-xs flex items-center gap-3 backdrop-blur-md transition-all ${
                    t.type === 'success'
                      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                      : t.type === 'error'
                      ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                      : t.type === 'warning'
                      ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900/90 border-slate-700 text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-bold">{t.title}</div>
                    <div className="opacity-90">{t.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =================================================================
              TAB 1: DASHBOARD (ภาพรวมระบบ)
          ================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    ภาพรวมสถานะระบบคอมพิวเตอร์ (System Overview)
                  </h1>
                  <p className="text-sm text-slate-400">
                    เข้าถึงฮาร์ดแวร์จริง ไดรฟ์จริง และตรวจสอบพอร์ต/เซอร์วิสที่กำลังทำงานในเครื่อง
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      handleTriggerStorageScan();
                      (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
                      (window as any).electronAPI?.getWindowsServices?.().then((s: any) => s && setWindowsServices(s));
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningStorage ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>รีเฟรชข้อมูล</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('cleaner')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>เริ่มล้างไฟล์ขยะ</span>
                  </button>
                </div>
              </div>

              {/* 3 Overview Quick Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Junk Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">ไฟล์ขยะและแคชที่พร้อมล้าง</span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {formatSize(totalAvailableJunkMB)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Trash2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">เลือกอยู่: {formatSize(totalSelectedJunkMB)} ({selectedJunkCount} รายการ)</span>
                    <button
                      onClick={() => setActiveTab('cleaner')}
                      className="text-amber-400 hover:text-amber-300 font-medium"
                    >
                      จัดการ →
                    </button>
                  </div>
                </div>

                {/* Active Ports Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">พอร์ตที่เปิดใช้งานจริง (Active Ports)</span>
                      <div className="text-2xl font-bold text-white mt-1">{ports.length} พอร์ต</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Network className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      มี Service ผูกอยู่: {ports.filter((p) => p.serviceName).length} รายการ
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('ports');
                        setPortSubTab('ports');
                      }}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      ดูพอร์ต →
                    </button>
                  </div>
                </div>

                {/* Uninstall Blocker Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">เซอร์วิสระบบ Windows ทั้งหมด</span>
                      <div className="text-2xl font-bold text-white mt-1">{windowsServices.length} Services</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      กำลังรัน: {windowsServices.filter((s) => s.state === 'Running').length} บริการ
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('ports');
                        setPortSubTab('services');
                      }}
                      className="text-violet-400 hover:text-violet-300 font-medium"
                    >
                      เช็ค Service & Port →
                    </button>
                  </div>
                </div>
              </div>

              {/* Real Drives Overview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <span>ไดรฟ์จริงที่ตรวจพบในเครื่องคอมพิวเตอร์ ({systemDrives.length} ไดรฟ์)</span>
                  </h3>
                  <span className="text-xs text-slate-400">อ่านข้อมูลพื้นที่จริงจาก Windows Storage API</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {systemDrives.map((drive) => {
                    const usedColor =
                      drive.usedPercent >= 90
                        ? 'from-rose-500 to-rose-600'
                        : drive.usedPercent >= 75
                        ? 'from-amber-500 to-orange-500'
                        : 'from-sky-500 to-indigo-500';
                    return (
                      <div key={drive.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white">{drive.name}</h4>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                  {drive.fileSystem}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">ความจุทั้งหมด: {drive.totalGB} GB</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-bold ${
                                drive.usedPercent >= 90
                                  ? 'text-rose-400'
                                  : drive.usedPercent >= 75
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              ว่าง {drive.freeGB} GB
                            </div>
                            <div className="text-xs text-slate-400">
                              ใช้ไป {drive.usedGB} GB ({drive.usedPercent}%)
                            </div>
                          </div>
                        </div>

                        {/* Usage Progress Bar */}
                        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${usedColor} transition-all duration-500`}
                            style={{ width: `${drive.usedPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                drive.usedPercent >= 90
                                  ? 'bg-rose-500'
                                  : drive.usedPercent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            สถานะ: {drive.status === 'critical' ? 'พื้นที่ใกล้เต็ม' : drive.status === 'warning' ? 'ใช้งานค่อนข้างมาก' : 'ปกติ'}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedDrive(drive.letter);
                              setActiveTab('storage');
                              handleTriggerStorageScan(drive.letter);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                          >
                            วิเคราะห์ไดรฟ์นี้ →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Preview: Top Large Files & Real Directory Breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Large Files Preview */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>ไฟล์ขนาดใหญ่ที่พบบนเครื่องจริง</span>
                      </h3>
                      <p className="text-xs text-slate-400">ค้นพบไฟล์ระดับร้อย MB และ GB</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('storage')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      ดูทั้งหมด ({largeFiles.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {largeFiles.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        {isScanningStorage ? 'กำลังสแกนไฟล์บนไดรฟ์จริง...' : 'ยังไม่มีข้อมูลไฟล์ใหญ่ กดปุ่มรีเฟรชเพื่อสแกน'}
                      </div>
                    ) : (
                      largeFiles.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-100 truncate">{item.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                                {item.category}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate mt-0.5">{item.path}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-amber-400 font-mono">
                              {formatSize(item.sizeMB)}
                            </span>
                            <button
                              onClick={() => handleOpenFolder(item.path)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="เปิดโฟลเดอร์ใน Explorer"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Directory Treemap Breakdown Preview */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-emerald-400" />
                        <span>โฟลเดอร์ที่กินพื้นที่มากที่สุดจริงบนเครื่อง</span>
                      </h3>
                      <p className="text-xs text-slate-400">คำนวณสัดส่วนจากไฟล์ใหญ่จริง</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('storage')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      ดูผัง Treemap เต็ม →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {directoryBreakdown.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        {isScanningStorage ? 'กำลังคำนวณขนาดโฟลเดอร์...' : 'ยังไม่มีข้อมูลโฟลเดอร์'}
                      </div>
                    ) : (
                      directoryBreakdown.slice(0, 4).map((d) => (
                        <div
                          key={d.id}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-100 truncate">{d.label}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                                {d.badge}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.percent}%` }} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-emerald-400 font-mono">{d.sizeGB} GB</span>
                            <div className="text-[11px] text-slate-400">{d.percent}%</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: STORAGE ANALYZER (วิเคราะห์พื้นที่จริงทั้งเครื่อง)
          ================================================================= */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              {/* Header & Real Drive Filter Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    วิเคราะห์พื้นที่จัดเก็บไฟล์จริง (Storage & Deep File Analyzer)
                  </h1>
                  <p className="text-sm text-slate-400">
                    เข้าถึงไฟล์จริงทั้งเครื่อง คำนวณสัดส่วนโฟลเดอร์ และตรวจหาไฟล์ที่มีขนาดซ้ำซ้อน
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {driveOptions.map((drv) => (
                    <button
                      key={drv}
                      onClick={() => {
                        setSelectedDrive(drv);
                        setSelectedTreemapBlock(null);
                        handleTriggerStorageScan(drv);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        selectedDrive === drv
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {drv === 'ALL' ? 'ทุกไดรฟ์จริง (All Drives)' : `ไดรฟ์ ${drv}`}
                    </button>
                  ))}

                  <button
                    onClick={() => handleTriggerStorageScan()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningStorage ? 'animate-spin' : ''}`} />
                    <span>สแกนไฟล์ทั้งเครื่องใหม่</span>
                  </button>
                </div>
              </div>

              {/* Scanning Progress Bar */}
              {isScanningStorage && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-200">
                    <span className="font-semibold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      กำลังสแกนค้นหาไฟล์ขนาดใหญ่จริงในโฟลเดอร์ระบบและผู้ใช้...
                    </span>
                    <span className="font-mono">{scanProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Real Treemap Section */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>แผนผังสัดส่วนพื้นที่โฟลเดอร์จริง (Dynamic Visual Treemap)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      คลิกที่บล็อกเพื่อกรองดูเฉพาะไฟล์ที่อยู่ภายในโฟลเดอร์นั้น
                    </p>
                  </div>
                  {selectedTreemapBlock && (
                    <button
                      onClick={() => setSelectedTreemapBlock(null)}
                      className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างตัวกรอง ({selectedTreemapBlock.label})
                    </button>
                  )}
                </div>

                {directoryBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
                    {isScanningStorage ? 'กำลังสแกนและคำนวณโฟลเดอร์...' : 'ไม่พบโฟลเดอร์ขนาดใหญ่ หรือยังไม่ได้สแกน'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 min-h-[160px]">
                    {directoryBreakdown.map((block, idx) => {
                      const colSpan =
                        idx === 0
                          ? 'md:col-span-5'
                          : idx === 1
                          ? 'md:col-span-4'
                          : idx === 2
                          ? 'md:col-span-3'
                          : idx === 3
                          ? 'md:col-span-4'
                          : 'md:col-span-4';
                      const isSelected = selectedTreemapBlock?.id === block.id;
                      return (
                        <div
                          key={block.id}
                          onClick={() => setSelectedTreemapBlock(isSelected ? null : block)}
                          className={`${colSpan} p-3.5 rounded-xl bg-gradient-to-br ${
                            block.color
                          } border cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.01] ${
                            isSelected ? 'ring-2 ring-white shadow-xl' : 'opacity-90 hover:opacity-100'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/30 text-white">
                                {block.badge}
                              </span>
                              <span className="text-xs font-mono font-bold text-white/90">{block.percent}%</span>
                            </div>
                            <div className="font-bold text-sm text-white mt-2 break-all">{block.label}</div>
                          </div>

                          <div className="mt-4 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-white/90">
                            <span className="font-mono font-bold text-base">{block.sizeGB} GB</span>
                            <span className="text-[11px] text-white/75">{block.filesCount}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sub-tabs: Top Heavy Files vs Duplicate Files */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStorageSubTab('heavy')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      storageSubTab === 'heavy'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    ไฟล์ขนาดใหญ่สุด (Top Heavy Files: {filteredLargeFiles.length})
                  </button>
                  <button
                    onClick={() => setStorageSubTab('duplicates')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      storageSubTab === 'duplicates'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>ค้นหาไฟล์ขนาดซ้ำซ้อน (Duplicate Matches)</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                      {duplicateGroups.length}
                    </span>
                  </button>
                </div>

                {storageSubTab === 'heavy' && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={storageSearch}
                        onChange={(e) => setStorageSearch(e.target.value)}
                        placeholder="ค้นหาชื่อไฟล์ หรือ นามสกุล..."
                        className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
                      />
                    </div>
                    <button
                      onClick={() => setStorageSortAsc(!storageSortAsc)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                      title={storageSortAsc ? 'เรียงขนาด น้อย -> มาก' : 'เรียงขนาด มาก -> น้อย'}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-tab 1: Heavy Files Table */}
              {storageSubTab === 'heavy' && (
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">ชื่อไฟล์</th>
                          <th className="py-3 px-4">หมวดหมู่</th>
                          <th className="py-3 px-4">ไดรฟ์</th>
                          <th className="py-3 px-4 text-right">ขนาดไฟล์</th>
                          <th className="py-3 px-4">แก้ไขล่าสุด</th>
                          <th className="py-3 px-4 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {filteredLargeFiles.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              {isScanningStorage ? 'กำลังสแกนไฟล์บนไดรฟ์...' : 'ไม่พบไฟล์ตามเงื่อนไขที่เลือก'}
                            </td>
                          </tr>
                        ) : (
                          filteredLargeFiles.map((file) => (
                            <tr key={file.id} className="hover:bg-slate-800/30 transition">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-100 max-w-sm truncate" title={file.name}>
                                  {file.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate max-w-md" title={file.path}>
                                  {file.path}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                                  {file.category}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-indigo-400">{file.drive}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                                {formatSize(file.sizeMB)}
                              </td>
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{file.lastModified}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenFolder(file.path)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    title="เปิดโฟลเดอร์ใน Windows Explorer"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleCopy(file.path, file.id)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    title="คัดลอกตำแหน่งไฟล์"
                                  >
                                    {copiedId === file.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Duplicates */}
              {storageSubTab === 'duplicates' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
                    <div>
                      ตรวจจับไฟล์ที่มีขนาด byte เท่ากันทุกประการบนเครื่อง เพื่อช่วยให้ลบสำเนาที่ไม่จำเป็นออก
                    </div>
                    <span className="font-bold">{duplicateGroups.length} กลุ่มที่พบ</span>
                  </div>

                  {duplicateGroups.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="text-sm font-semibold text-white">ไม่พบไฟล์ขนาดซ้ำซ้อนในไดเรกทอรีที่สแกน</div>
                      <p className="text-xs text-slate-400">
                        ไฟล์บนไดรฟ์ที่สแกนมีความเป็นระเบียบเรียบร้อย ไม่มีไฟล์ขยะซ้ำขนาดใหญ่
                      </p>
                    </div>
                  ) : (
                    duplicateGroups.map((group) => (
                      <div key={group.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{group.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                              {formatSize(group.sizeEachMB)} / ไฟล์
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">{group.copies?.length} สำเนา</span>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          {group.copies?.map((copy: any, cIdx: number) => (
                            <div
                              key={cIdx}
                              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="font-mono text-slate-300 truncate flex-1">{copy.path}</div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-slate-500 font-mono">{copy.date}</span>
                                <button
                                  onClick={() => handleOpenFolder(copy.path)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  title="เปิดใน Explorer"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 3: JUNK CLEANER (ล้างไฟล์ขยะและแคช)
          ================================================================= */}
          {activeTab === 'cleaner' && (
            <div className="space-y-6">
              {/* Cleaner Top Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-indigo-400" />
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      ทำความสะอาดไฟล์ขยะและแคชระบบ (Smart Junk Cleaner)
                    </h1>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    สแกนโฟลเดอร์ชั่วคราว %TEMP%, แคชเบราว์เซอร์ (Chrome, Brave, Edge), Discord Cache และไฟล์ที่ตกค้างในเครื่องจริง
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
                  {/* Safe Delete Toggle */}
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safeRecycleBin}
                      onChange={(e) => setSafeRecycleBin(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Safe Delete (ย้ายลงถังขยะ Recycle Bin ก่อนลบถาวร)</span>
                  </label>

                  <button
                    onClick={handleCleanJunk}
                    disabled={isCleaningJunk || selectedJunkCount === 0}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
                  >
                    <Trash2 className={`w-4 h-4 ${isCleaningJunk ? 'animate-spin' : ''}`} />
                    <span>
                      {isCleaningJunk
                        ? 'กำลังทำความสะอาด...'
                        : `ล้างรายการที่เลือก (${formatSize(totalSelectedJunkMB)})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Junk Categories List */}
              <div className="space-y-4">
                {junkCategories.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                    กำลังสแกนหาโฟลเดอร์ไฟล์ขยะในเครื่อง...
                  </div>
                ) : (
                  junkCategories.map((cat) => (
                    <div key={cat.id} className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                      <div className="p-4 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white">{cat.title}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                              {cat.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {cat.items?.length || 0} รายการ
                        </span>
                      </div>

                      <div className="divide-y divide-slate-800/50">
                        {cat.items?.length === 0 ? (
                          <div className="p-4 text-xs text-slate-500">ไม่พบไฟล์ขยะในหมวดหมู่นี้ สะอาดเรียบร้อย</div>
                        ) : (
                          cat.items?.map((item: any) => (
                            <div
                              key={item.id}
                              className="p-3.5 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition"
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={!!item.selected}
                                  onChange={() => handleToggleJunkItem(cat.id, item.id)}
                                  className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                                />
                                <div>
                                  <div className="font-semibold text-xs text-slate-200">{item.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-lg mt-0.5">
                                    {item.path}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono font-bold text-xs text-amber-400">
                                  {formatSize(item.sizeMB)}
                                </span>
                                <button
                                  onClick={() => handleOpenFolder(item.path)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  title="เปิดใน Explorer"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 4: PORTS & SERVICES & UNINSTALL BLOCKERS
          ================================================================= */}
          {activeTab === 'ports' && (
            <div className="space-y-6">
              {/* Top Heading */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    พอร์ต, บริการ Windows & ตัวปลดล็อกโปรแกรม
                  </h1>
                  <p className="text-sm text-slate-400">
                    ตรวจจับ Service แต่ละอันว่าใช้พอร์ตอะไร (เช่น vgc, mosquitto) และปลดล็อกโปรแกรมที่ขวางการถอนการติดตั้ง
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
                      (window as any).electronAPI?.getWindowsServices?.().then((s: any) => s && setWindowsServices(s));
                      showToast('รีเฟรชสำเร็จ', 'อัปเดตรายชื่อพอร์ตและเซอร์วิสล่าสุดแล้ว', 'info');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>รีเฟรชพอร์ต & บริการ</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setPortSubTab('ports')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    portSubTab === 'ports'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>พอร์ตที่เปิดใช้งานจริง ({ports.length})</span>
                </button>

                <button
                  onClick={() => setPortSubTab('services')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    portSubTab === 'services'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>เช็ค Service & Port (เช่น vgc, mosquitto)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                    {windowsServices.length}
                  </span>
                </button>

                <button
                  onClick={() => setPortSubTab('blockers')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    portSubTab === 'blockers'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>โปรแกรมที่ซ่อนอยู่ / ขวางการถอนการติดตั้ง</span>
                  {blockerResults.blockers.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[11px]">
                      {blockerResults.blockers.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setPortSubTab('startup')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    portSubTab === 'startup'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>โปรแกรมเปิดพร้อม Windows ({startupApps.length})</span>
                </button>
              </div>

              {/* =============================================================
                  SUB-TAB 4.1: ACTIVE PORTS & ASSOCIATED SERVICES
              ============================================================= */}
              {portSubTab === 'ports' && (
                <div className="space-y-4">
                  {/* Search & Filter Bar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={portSearch}
                        onChange={(e) => setPortSearch(e.target.value)}
                        placeholder="ค้นหาหมายเลขพอร์ต, ชื่อโปรเซส, หรือ Service เช่น 8883, mosquitto, vgc..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                      {(['all', 'dev', 'services', 'tcp', 'udp'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPortFilter(mode)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                            portFilter === mode
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {mode === 'all'
                            ? 'ทุกพอร์ต'
                            : mode === 'dev'
                            ? 'พอร์ต Dev'
                            : mode === 'services'
                            ? 'มี Service ผูกอยู่'
                            : mode.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ports Table */}
                  <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">พอร์ต & โปรโตคอล</th>
                            <th className="py-3 px-4">โปรเซส / PID</th>
                            <th className="py-3 px-4">บริการ Windows (Service)</th>
                            <th className="py-3 px-4">ที่อยู่ (Local Address)</th>
                            <th className="py-3 px-4">พาธโปรแกรม</th>
                            <th className="py-3 px-4 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {filteredPorts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                ไม่พบพอร์ตตามเงื่อนไขที่เลือก
                              </td>
                            </tr>
                          ) : (
                            filteredPorts.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-800/30 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-indigo-400">
                                      {item.port}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                      {item.protocol}
                                    </span>
                                    {item.isDevPort && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Dev
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-200">{item.processName}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">PID: {item.pid}</div>
                                </td>
                                <td className="py-3 px-4">
                                  {item.serviceName ? (
                                    <div>
                                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold font-mono text-[11px] border border-violet-500/30">
                                        {item.serviceName}
                                      </span>
                                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                                        {item.serviceDisplayName}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-500">ไม่ใช่ Service (App ทั่วไป)</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{item.localAddress}</td>
                                <td className="py-3 px-4">
                                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs" title={item.exePath}>
                                    {item.exePath}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleCopy(item.port.toString(), item.id)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      title="คัดลอกหมายเลขพอร์ต"
                                    >
                                      {copiedId === item.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleKillProcess(item.pid, item.processName)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-[11px] transition"
                                      title="ปิดโปรเซสทันทีเพื่อคืนพอร์ต"
                                    >
                                      Kill PID
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  SUB-TAB 4.2: WINDOWS SERVICES & PORT INSPECTOR
                  (เช็คให้ได้ว่า service แต่ละอันที่ใช้ port ตอนนี้ใช้ port อะไรอยู่ เช่น vgc)
              ============================================================= */}
              {portSubTab === 'services' && (
                <div className="space-y-4">
                  {/* Service Search & Filter Header */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="ค้นหาชื่อ Service เช่น vgc, mosquitto, spooler, wuauserv, docker..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(['all', 'ports', 'running', 'stopped'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setServiceFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              serviceFilter === filter
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {filter === 'all'
                              ? 'ทั้งหมด'
                              : filter === 'ports'
                              ? 'ที่ใช้ Port เท่านั้น'
                              : filter === 'running'
                              ? 'กำลังทำงาน'
                              : 'ที่หยุดทำงาน'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Search Chips */}
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 flex-wrap">
                      <span>ค้นหาด่วน:</span>
                      {['vgc', 'mosquitto', 'Spooler', 'EventLog', 'Schedule', 'jhi_service', 'wuauserv'].map((name) => (
                        <button
                          key={name}
                          onClick={() => setServiceSearch(name)}
                          className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition"
                        >
                          {name}
                        </button>
                      ))}
                      {serviceSearch && (
                        <button
                          onClick={() => setServiceSearch('')}
                          className="text-amber-400 hover:underline text-[11px] ml-2"
                        >
                          ล้างคำค้น
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Services List Table */}
                  <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">ชื่อเซอร์วิส (Service Name)</th>
                            <th className="py-3 px-4">สถานะ (Status)</th>
                            <th className="py-3 px-4">พอร์ตที่กำลังเปิดใช้งาน (Active Ports)</th>
                            <th className="py-3 px-4">PID</th>
                            <th className="py-3 px-4">ตำแหน่งไฟล์ (.exe Path)</th>
                            <th className="py-3 px-4 text-center">จัดการ Service</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {filteredServices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                ไม่พบ Service ตามคำค้นหา "{serviceSearch}"
                              </td>
                            </tr>
                          ) : (
                            filteredServices.map((svc) => (
                              <tr key={svc.id} className="hover:bg-slate-800/30 transition">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white font-mono flex items-center gap-2">
                                    <span>{svc.name}</span>
                                    {svc.name.toLowerCase() === 'vgc' && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        Riot Vanguard
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate max-w-xs">{svc.displayName}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 ${
                                      svc.state === 'Running'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        svc.state === 'Running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                      }`}
                                    />
                                    {svc.state}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {svc.ports && svc.ports.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {svc.ports.map((p: string, pIdx: number) => (
                                        <span
                                          key={pIdx}
                                          className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[11px] border border-sky-500/30"
                                        >
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">
                                      {svc.state === 'Running' ? 'ไม่มีพอร์ตเปิดรับ (Worker)' : 'ไม่มี (Service Stopped)'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                                  {svc.pid > 0 ? svc.pid : '-'}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-mono text-slate-400 text-[11px] truncate max-w-xs" title={svc.pathName}>
                                    {svc.pathName || '-'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {svc.state === 'Running' ? (
                                      <button
                                        onClick={() => handleToggleService(svc.name, true)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition"
                                        title="หยุดการทำงานของ Service นี้"
                                      >
                                        หยุด Service
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleToggleService(svc.name, false)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition"
                                        title="เริ่มต้นการทำงานของ Service นี้"
                                      >
                                        เริ่ม Service
                                      </button>
                                    )}
                                    {svc.pathName && (
                                      <button
                                        onClick={() => handleOpenFolder(svc.pathName)}
                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                        title="เปิดโฟลเดอร์ไฟล์ของ Service"
                                      >
                                        <FolderOpen className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  SUB-TAB 4.3: UNINSTALL BLOCKERS & HIDDEN TASKS
                  (โปรแกรมที่ซ่อนอยู่ หรือ ที่ทำงานอยู่ เป็นสาเหตุที่ถอนติดตั้งไม่ได้)
              ============================================================= */}
              {portSubTab === 'blockers' && (
                <div className="space-y-5">
                  {/* Search / Target Input Section */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-amber-400" />
                        <span>ตัวตรวจสอบและปลดล็อกโปรแกรมที่ขวางการถอนการติดตั้ง</span>
                      </h3>
                      <p className="text-xs text-slate-300">
                        สแกนหาโปรเซสที่ทำงานแอบซ่อนอยู่เบื้องหลัง (ไม่มีหน้าต่าง) หรือ Service ที่ยังรันค้างอยู่จนทำให้ถอนการติดตั้งหรือลบโฟลเดอร์ไม่ได้
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={blockerSearch}
                          onChange={(e) => setBlockerSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleScanBlockers(blockerSearch)}
                          placeholder="พิมพ์ชื่อโปรแกรมที่จะถอน เช่น vgc, discord, riot, steam, brave หรือพาธโฟลเดอร์..."
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <button
                        onClick={() => handleScanBlockers(blockerSearch)}
                        disabled={isScanningBlockers}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScanningBlockers ? 'animate-spin' : ''}`} />
                        <span>สแกนหาสาเหตุที่ถอนไม่ได้</span>
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 flex-wrap">
                      <span>โปรแกรมที่พบบ่อยว่าถอนไม่ได้:</span>
                      {['vgc', 'Discord', 'Riot', 'Steam', 'Brave', 'Node'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setBlockerSearch(preset);
                            handleScanBlockers(preset);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition"
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setBlockerSearch('');
                          handleScanBlockers('');
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30"
                      >
                        สแกนงานเบื้องหลังทั้งหมดที่ไม่มีหน้าต่าง
                      </button>
                    </div>
                  </div>

                  {/* Result Header & 1-Click Terminate Button */}
                  {(blockerResults.blockers.length > 0 || blockerResults.services.length > 0) && (
                    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>
                            ตรวจพบ {blockerResults.blockers.length} โปรเซส และ {blockerResults.services.length} เซอร์วิส ที่กำลังทำงานอยู่
                          </span>
                        </div>
                        <p className="text-xs text-rose-200 mt-0.5">
                          โปรเซสเหล่านี้เป็นสาเหตุหลักที่ทำให้ Windows ไม่อนุญาตให้ถอนการติดตั้งหรือขึ้นข้อความ "File in use"
                        </p>
                      </div>

                      <button
                        onClick={handleTerminateAllBlockers}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition shrink-0"
                      >
                        บังคับปิดโปรเซส & หยุด Service ทั้งหมดทันที
                      </button>
                    </div>
                  )}

                  {/* List of Blockers */}
                  <div className="space-y-3">
                    {blockerResults.blockers.length === 0 && blockerResults.services.length === 0 ? (
                      <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                        <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                        <div className="text-sm font-semibold text-white">
                          ไม่พบโปรเซสหรือเซอร์วิสที่บล็อกการทำงานตามคำค้นหา
                        </div>
                        <p className="text-xs text-slate-400">
                          {blockerSearch
                            ? `ไม่มีโปรเซสชื่อ "${blockerSearch}" กำลังทำงานอยู่ในระบบ สามารถกดถอนการติดตั้งได้ตามปกติ`
                            : 'ไม่มีโปรแกรมเบื้องหลังที่ผิดปกติ'}
                        </p>
                      </div>
                    ) : (
                      blockerResults.blockers.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white font-mono">{b.processName}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                PID: {b.pid}
                              </span>
                              {b.isHidden ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                  ซ่อนอยู่เบื้องหลัง (Hidden / No Window)
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                                  มีหน้าต่างทำงาน
                                </span>
                              )}
                              {b.serviceName && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono font-semibold">
                                  Service: {b.serviceName}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate max-w-xl">{b.path}</div>
                            <div className="text-[11px] text-slate-500">
                              ผู้พัฒนา: {b.company} • แรมที่ใช้: {b.memoryMB} MB
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {b.path && (
                              <button
                                onClick={() => handleOpenFolder(b.path)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                                title="เปิดที่อยู่ไฟล์"
                              >
                                <FolderOpen className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleKillProcess(b.pid, b.processName)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                            >
                              ปิดโปรเซสนี้
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* =============================================================
                  SUB-TAB 4.4: STARTUP APPS MANAGER
              ============================================================= */}
              {portSubTab === 'startup' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
                    <div>โปรแกรมที่ถูกตั้งค่าใน Windows Registry ให้เปิดขึ้นมาอัตโนมัติทุกครั้งเมื่อเริ่มระบบ</div>
                    <span className="font-bold">{startupApps.length} รายการ</span>
                  </div>

                  <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                    {startupApps.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">กำลังดึงข้อมูลโปรแกรม Startup...</div>
                    ) : (
                      startupApps.map((app) => (
                        <div key={app.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-800/20">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{app.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                {app.publisher}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate max-w-lg mt-0.5">{app.path}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                app.impact === 'High'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : app.impact === 'Medium'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              ผลกระทบ {app.impact}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 5: SETTINGS & UNINSTALL INSTRUCTIONS
          ================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">การตั้งค่าระบบ (Settings & Preferences)</h1>
                <p className="text-sm text-slate-400">
                  ปรับแต่งพารามิเตอร์การทำงาน โทนสี ขนาดตัวหนังสือ และข้อมูลการจัดการถอนการติดตั้งโปรแกรม
                </p>
              </div>

              {/* Setting 0: Appearance, Theme & Font Size */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                      <Sun className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        การแสดงผลและธีม (Appearance & Typography)
                      </h3>
                      <p className="text-xs text-slate-400">
                        ปรับแต่งโทนสีหน้าจอ และขนาดตัวหนังสือให้เหมาะกับสายตาและขนาดจอแสดงผล
                      </p>
                    </div>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span>ธีมสีของแอปพลิเคชัน (Color Theme)</span>
                    <span className="text-[11px] text-slate-400">สามารถกดปุ่มสลับบนหัวโปรแกรมได้เช่นกัน</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Dark Theme Card */}
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                        theme === 'dark'
                          ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Moon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">โหมดมืด (Dark Theme)</span>
                          {theme === 'dark' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" /> ใช้งานอยู่
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          โทนสีมืด สบายตา ถนอมสายตา เหมาะสำหรับห้องแสงน้อยและการใช้งานต่อเนื่อง
                        </p>
                      </div>
                    </button>

                    {/* Light Theme Card */}
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                        theme === 'light'
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${theme === 'light' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Sun className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">โหมดสีขาว (Light Theme)</span>
                          {theme === 'light' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold border border-amber-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" /> ใช้งานอยู่
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          โทนสีขาวสว่าง ชัดเจน คมชัด มองเห็นข้อมูลได้ง่ายแม้ในที่แสงสว่างจ้า
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Font Size Configuration */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ขนาดตัวหนังสือ (Font Size)</span>
                    </div>
                    <span className="text-xs text-indigo-400 font-mono font-medium">
                      {fontSize === 'small' && 'เล็ก (Small - 14px)'}
                      {fontSize === 'normal' && 'ปกติ / ปานกลาง (Normal - 16px)'}
                      {fontSize === 'large' && 'ใหญ่ (Large - 18px)'}
                      {fontSize === 'xl' && 'ใหญ่พิเศษ (Extra Large - 20px)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'small', label: 'เล็ก (14px)', desc: 'กะทัดรัด จุข้อมูลเยอะ' },
                      { id: 'normal', label: 'ปกติ (16px)', desc: 'มาตรฐาน แนะนำ' },
                      { id: 'large', label: 'ใหญ่ (18px)', desc: 'อ่านสบาย ไม่ต้องเพ่ง' },
                      { id: 'xl', label: 'ใหญ่พิเศษ (20px)', desc: 'ตัวใหญ่ ชัดเจนสุด' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFontSize(opt.id as any)}
                        className={`px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          fontSize === opt.id
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{opt.label}</span>
                          {fontSize === opt.id && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${fontSize === opt.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Live Preview Card */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                      <span>ตัวอย่างการแสดงผลแบบสด (Live Font Preview):</span>
                      <span className="text-indigo-400 font-medium">เปลี่ยนขนาดทันทีทั่วทั้งโปรแกรม</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                      <p className="font-medium">
                        SysPulse System Inspector: ตรวจสอบพอร์ตเชื่อมต่อ 127.0.0.1:8080 (PID 4920) ใช้งาน RAM 2.45 GB
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        The quick brown fox jumps over the lazy dog. 0123456789 (พร้อมรองรับการแสดงผลทุกระดับสายตา)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Setting 1: General Preferences */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <span>การตั้งค่าทั่วไป (General Preferences)</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-800 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-slate-200">ความถี่ในการรีเฟรชข้อมูล Telemetry สด (CPU / RAM)</div>
                      <div className="text-slate-400 text-[11px]">เลือกช่วงเวลาในการอ่านค่าฮาร์ดแวร์เพื่อความลื่นไหล</div>
                    </div>
                    <select
                      value={telemetryInterval}
                      onChange={(e) => setTelemetryInterval(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                    >
                      <option value={1000}>1.0 วินาที (เร็วสูงสุด)</option>
                      <option value={2500}>2.5 วินาที (แนะนำ)</option>
                      <option value={5000}>5.0 วินาที (ประหยัดพลังงาน)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-slate-200">ตรวจสอบชื่อ Windows Service ที่ผูกกับพอร์ตอัตโนมัติ</div>
                      <div className="text-slate-400 text-[11px]">จับคู่ PID พอร์ตเข้ากับ Service ของระบบ Windows ทันที</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoResolveServices}
                        onChange={(e) => setAutoResolveServices(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Setting 2: Storage & Scanner Options */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>การสแกนพื้นที่และไฟล์ขนาดใหญ่ (Storage Scanner Preferences)</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-800 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-slate-200">เกณฑ์ขนาดไฟล์ขั้นต่ำสำหรับไฟล์ขนาดใหญ่</div>
                      <div className="text-slate-400 text-[11px]">คัดกรองเฉพาะไฟล์ที่มีขนาดเกินเกณฑ์ที่กำหนดขึ้นมาแสดง</div>
                    </div>
                    <select
                      value={minHeavyFileSizeMB}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMinHeavyFileSizeMB(val);
                        handleTriggerStorageScan(selectedDrive, val, scanDepth);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                    >
                      <option value={25}>25 MB ขึ้นไป (ละเอียด)</option>
                      <option value={50}>50 MB ขึ้นไป (มาตรฐาน)</option>
                      <option value={100}>100 MB ขึ้นไป</option>
                      <option value={500}>500 MB ขึ้นไป (เฉพาะไฟล์ยักษ์)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-slate-200">ระดับความลึกในการสแกนโฟลเดอร์ (Scan Depth)</div>
                      <div className="text-slate-400 text-[11px]">จำนวนชั้นโฟลเดอร์ย่อยในการค้นหาไฟล์</div>
                    </div>
                    <select
                      value={scanDepth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setScanDepth(val);
                        handleTriggerStorageScan(selectedDrive, minHeavyFileSizeMB, val);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                    >
                      <option value={3}>3 ชั้น (เร็วมาก)</option>
                      <option value={4}>4 ชั้น (สมดุลและครอบคลุม)</option>
                      <option value={5}>5 ชั้น (ลึกสูงสุด)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-slate-200">Safe Delete Mode</div>
                      <div className="text-slate-400 text-[11px]">ส่งไฟล์ขยะลง Recycle Bin เสมอ เพื่อให้กู้คืนได้</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={safeRecycleBin}
                        onChange={(e) => setSafeRecycleBin(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Setting 3: Proper Windows Uninstall Instructions */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-500/30 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">
                    คำแนะนำในการถอนการติดตั้งโปรแกรม (Uninstallation Guide)
                  </h3>
                </div>

                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    ตามมาตรฐานความปลอดภัยและความเรียบร้อยของระบบปฏิบัติการ Windows โปรแกรม <b>System Storage & Port Inspector</b> จะไม่มีปุ่มสั่งถอนการติดตั้งภายในตัวแอปพลิเคชันโดยตรง เพื่อป้องกันการลบตัวเองขณะที่ตัวโปรแกรมกำลังทำงานอยู่
                  </p>
                  <p>
                    คุณสามารถถอนการติดตั้งโปรแกรมนี้ได้อย่างหมดจด 100% ผ่านช่องทางมาตรฐานของ Windows ได้ตลอดเวลา:
                  </p>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-[11px]">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-rose-400">วิธีที่ 1 (แนะนำ):</span>
                      <span>
                        เปิด <b>Windows Settings &gt; Apps &gt; Installed apps</b> (หรือกดปุ่ม Windows พิมพ์ "Add or remove programs") ค้นหา "System Storage & Port Inspector" แล้วกดปุ่ม <b>Uninstall</b>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-rose-400">วิธีที่ 2:</span>
                      <span>
                        เปิดโฟลเดอร์ที่ติดตั้งโปรแกรม แล้วดับเบิ้ลคลิกไฟล์ <b>uninstall.bat</b> หรือกดช็อตคัต <b>Uninstall System Storage & Port Inspector</b> ใน Start Menu
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => (window as any).electronAPI?.openWindowsAddRemove?.()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดหน้า Add or Remove Programs ใน Windows ทันที</span>
                  </button>

                  <button
                    onClick={() => (window as any).electronAPI?.openInstallFolder?.()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>เปิดโฟลเดอร์ไฟล์ติดตั้งของโปรแกรม</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          BOTTOM DOCK: LIVE IPC TERMINAL CONSOLE
      ===================================================================== */}
      {showIpcConsole && (
        <div className="h-56 bg-slate-950/95 border-t border-slate-800 p-3 font-mono text-[11px] flex flex-col z-40 select-text">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-slate-400 select-none">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">Native IPC & Windows System Backend Logs</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {ipcLogs.length} events
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIpcLogs([])}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                Clear
              </button>
              <button
                onClick={() => setShowIpcConsole(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 text-slate-300">
            {ipcLogs.length === 0 ? (
              <div className="text-slate-600 italic">ยังไม่มีบันทึกการเรียกใช้ IPC...</div>
            ) : (
              ipcLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/50 p-0.5 rounded">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className="text-indigo-400 font-bold shrink-0">{log.cmd}</span>
                  <span className="text-slate-300 flex-1 break-all">{log.detail}</span>
                  {log.durationMs > 0 && (
                    <span className="text-amber-400 text-[10px] shrink-0 font-bold">
                      +{log.durationMs}ms
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
