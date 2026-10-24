import React, { useState, useEffect, useMemo, useRef } from 'react';
import FileOrganizerView from './components/FileOrganizerView';
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
  Type,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flame,
  FolderInput,
  FileSearch,
  CheckSquare,
  Gamepad2
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
  // Navigation tabs: 'dashboard' | 'storage' | 'organizer' | 'cleaner' | 'ports' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'storage' | 'organizer' | 'cleaner' | 'ports' | 'settings'>('dashboard');
  const [organizerDirectSourceDir, setOrganizerDirectSourceDir] = useState<string>('');
  const [storageSubTab, setStorageSubTab] = useState<'heavy' | 'duplicates' | 'games'>('heavy');
  const [portSubTab, setPortSubTab] = useState<'ports' | 'services' | 'background' | 'conflicts' | 'blockers' | 'startup'>('ports');
  const [gameLibrariesData, setGameLibrariesData] = useState<any>(null);
  const [isScanningGames, setIsScanningGames] = useState<boolean>(false);
  const [selectedStorageCategory, setSelectedStorageCategory] = useState<string>('all');

  // Real data states (NO mock data!)
  const [systemDrives, setSystemDrives] = useState<any[]>([]);
  const [largeFiles, setLargeFiles] = useState<any[]>([]);
  const [directoryBreakdown, setDirectoryBreakdown] = useState<any[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [junkCategories, setJunkCategories] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [windowsServices, setWindowsServices] = useState<any[]>([]);
  const [startupApps, setStartupApps] = useState<any[]>([]);

  // Background processes state (ย่อดรอปดาวน์)
  const [backgroundProcs, setBackgroundProcs] = useState<any[]>([]);
  const [isScanningBackground, setIsScanningBackground] = useState(false);
  const [backgroundCategoryFilter, setBackgroundCategoryFilter] = useState<string>('all');
  const [backgroundSearch, setBackgroundSearch] = useState('');
  const [backgroundSortBy, setBackgroundSortBy] = useState<'ram' | 'name' | 'pid'>('ram');
  const [expandedBgGroups, setExpandedBgGroups] = useState<{ [key: string]: boolean }>({
    user_app: false,
    service: false,
    windows_app: false,
    system: false,
    other: false
  });

  // Custom inspected files (เลือกไฟล์ที่จะตรวจสอบ)
  const [customInspectedFiles, setCustomInspectedFiles] = useState<any[]>([]);
  const [isInspectingFiles, setIsInspectingFiles] = useState(false);
  const [selectedHeavyFileIds, setSelectedHeavyFileIds] = useState<Set<string>>(new Set());
  const [fileInspectDetailModal, setFileInspectDetailModal] = useState<any | null>(null);

  // Ports view mode & group collapse state (ให้ย่อพวกไฟล์ไว้ก่อน)
  const [portViewMode, setPortViewMode] = useState<'grouped_by_file' | 'flat'>('grouped_by_file');
  const [expandedPortFiles, setExpandedPortFiles] = useState<{ [key: string]: boolean }>({});

  // Conflicts & Collision Detector state (เช็คโปรแกรมขัดการทำงานกัน)
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isScanningConflicts, setIsScanningConflicts] = useState(false);
  const [conflictFilter, setConflictFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);

  // Junk clean results & in-use/locked warning state
  const [junkCleanResult, setJunkCleanResult] = useState<{
    cleanedCount: number;
    failedCount: number;
    reclaimedMB: number;
    lockedFiles: any[];
    runningBlockers: any[];
    summary: string;
  } | null>(null);

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

  // File Sync & Tracking State (Auto-update Deleted & Moved files)
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);
  const [fileSyncStats, setFileSyncStats] = useState<{
    lastSyncTime: string;
    deletedCount: number;
    movedCount: number;
    reclaimedMB: number;
  } | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    file: any;
    isDuplicateCopy?: boolean;
    groupId?: string;
  } | null>(null);
  const [isDeletingSpecificFile, setIsDeletingSpecificFile] = useState(false);
  const [isMovingFile, setIsMovingFile] = useState(false);

  // References to keep latest arrays accessible in event listeners
  const largeFilesRef = useRef(largeFiles);
  largeFilesRef.current = largeFiles;
  const duplicateGroupsRef = useRef(duplicateGroups);
  duplicateGroupsRef.current = duplicateGroups;

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
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const handleDirectUninstall = async () => {
    setIsUninstalling(true);
    try {
      await (window as any).electronAPI?.uninstallSelf?.();
    } catch (e) {
      console.error(e);
      setIsUninstalling(false);
    }
  };

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

    // I. Initial Scan of Background Processes & Conflicts
    handleScanBackground();
    handleScanConflicts();

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
        if (res.gameLibraries) {
          setGameLibrariesData(res.gameLibraries);
        }
        const duration = Math.round(performance.now() - start);
        logIpc('scan_large_files', `สแกนสำเร็จ: พบ ${res.files?.length || 0} ไฟล์ใหญ่ และ ${res.directoryBreakdown?.length || 0} โฟลเดอร์จริง (รวมไฟล์เกม)`, duration);
        showToast('สแกนไดรฟ์สำเร็จ', `พบ ${res.files?.length || 0} ไฟล์ขนาดใหญ่บนระบบ (รวมไฟล์เกมขนาดใหญ่)`, 'success');
      }
    } catch (err: any) {
      showToast('การสแกนเกิดข้อผิดพลาด', err?.message || 'ไม่สามารถสแกนไดรฟ์ได้', 'error');
    } finally {
      setIsScanningStorage(false);
    }
  };

  // Dedicated Game Libraries Scan Handler (เข้าถึงและวิเคราะห์ไฟล์เกมทั้งหมด)
  const handleScanGames = async () => {
    setIsScanningGames(true);
    const start = performance.now();
    logIpc('scan_game_libraries', 'เริ่มสแกนคลังเกม (Steam, Riot Games, Epic Games, Roblox, Gryphline)...');
    try {
      const res = await (window as any).electronAPI?.scanGameLibraries?.();
      if (res) {
        setGameLibrariesData(res);
        const duration = Math.round(performance.now() - start);
        logIpc('scan_game_libraries', `พบเกม ${res.gameCount} เกม (ขนาดรวม ${res.totalGamesSizeGB} GB)`, duration);
        showToast('สแกนคลังเกมสำเร็จ', `พบเกมในเครื่อง ${res.gameCount} เกม (ใช้พื้นที่รวม ${res.totalGamesSizeGB} GB)`, 'success');
        setStorageSubTab('games');
      }
    } catch (err: any) {
      showToast('สแกนเกมผิดพลาด', err?.message || 'ไม่สามารถสแกนคลังเกมได้', 'error');
    } finally {
      setIsScanningGames(false);
    }
  };

  // Helper to dynamically recompute directory breakdown Treemap from an updated files list
  const updateDirectoryBreakdownFromFiles = (files: any[]) => {
    const dirMap: { [key: string]: { path: string; sizeMB: number; count: number } } = {};
    for (const f of files) {
      if (!f.path) continue;
      const parts = f.path.split(/[\\/]/);
      parts.pop(); // remove filename
      const parent = parts.join('\\') || f.path;
      if (!dirMap[parent]) {
        dirMap[parent] = { path: parent, sizeMB: 0, count: 0 };
      }
      dirMap[parent].sizeMB += f.sizeMB || 0;
      dirMap[parent].count += 1;
    }

    const colorPalette = [
      'from-rose-600/90 to-rose-800/90 border-rose-400/40',
      'from-indigo-600/90 to-purple-800/90 border-indigo-400/40',
      'from-amber-600/90 to-orange-800/90 border-amber-400/40',
      'from-emerald-600/90 to-teal-800/90 border-emerald-400/40',
      'from-sky-600/90 to-blue-800/90 border-sky-400/40',
      'from-slate-600/90 to-slate-800/90 border-slate-400/40',
      'from-pink-600/90 to-rose-900/90 border-pink-400/40',
      'from-cyan-600/90 to-blue-900/90 border-cyan-400/40'
    ];

    const sortedDirs = Object.values(dirMap)
      .sort((a, b) => b.sizeMB - a.sizeMB)
      .slice(0, 8);

    const totalDirMB = sortedDirs.reduce((acc, d) => acc + d.sizeMB, 0) || 1;

    const breakdowns = sortedDirs.map((d, idx) => {
      const sizeGB = Number((d.sizeMB / 1024).toFixed(2));
      const percent = Math.max(1, Math.round((d.sizeMB / totalDirMB) * 100));
      const drive = d.path.substring(0, 2).toUpperCase();
      const folderName = d.path.split(/[\\/]/).pop() || d.path;

      let badge = 'Directory';
      if (d.path.includes('Program Files')) badge = 'Applications';
      else if (d.path.includes('Videos')) badge = 'Media / Video';
      else if (d.path.includes('Downloads')) badge = 'Downloads';
      else if (d.path.includes('AppData')) badge = 'AppData';
      else if (d.path.includes('Package Cache')) badge = 'Installers';

      return {
        id: `tm_${idx}`,
        label: `${folderName} (${d.path})`,
        path: d.path,
        drive,
        sizeGB: sizeGB >= 0.1 ? sizeGB : Number((d.sizeMB / 1024).toFixed(2)),
        sizeMB: d.sizeMB,
        percent,
        color: colorPalette[idx % colorPalette.length],
        badge,
        filesCount: `${d.count} ไฟล์ใหญ่`
      };
    });

    setDirectoryBreakdown(breakdowns);
  };

  // Sync and update files that have been deleted or moved
  const handleSyncFileStatus = async (userInitiated = false) => {
    const currentFiles = largeFilesRef.current;
    const currentGroups = duplicateGroupsRef.current;

    if (isSyncingFiles) return;
    if (currentFiles.length === 0 && currentGroups.length === 0) {
      if (userInitiated) {
        showToast('ไม่มีไฟล์ในรายการ', 'ยังไม่มีรายการไฟล์ที่สแกนไว้ กรุณากดสแกนไฟล์ก่อน', 'info');
      }
      return;
    }

    setIsSyncingFiles(true);
    const start = performance.now();
    try {
      // 1. Sync Large Files
      const fileRes = await (window as any).electronAPI?.syncFilesStatus?.(currentFiles);
      // 2. Sync Duplicate Groups
      const dupRes = await (window as any).electronAPI?.syncDuplicateGroups?.(currentGroups);

      let hasChanges = false;
      let deletedCount = 0;
      let movedCount = 0;
      let reclaimedMB = 0;

      if (fileRes?.success) {
        deletedCount = fileRes.deletedCount || 0;
        movedCount = fileRes.movedCount || 0;
        reclaimedMB = fileRes.reclaimedMB || 0;

        if (fileRes.hasChanges) {
          hasChanges = true;
          // Keep only active and moved files (filter out deleted ones)
          const validFiles = fileRes.files.filter((f: any) => f.status !== 'deleted');
          setLargeFiles(validFiles);
          updateDirectoryBreakdownFromFiles(validFiles);
        }
      }

      if (dupRes?.success && dupRes.hasChanges) {
        hasChanges = true;
        setDuplicateGroups(dupRes.updatedGroups || []);
      }

      // If any files were deleted or moved:
      if (hasChanges) {
        // Refresh system drives so free space is updated
        (window as any).electronAPI?.getSystemDrives?.().then((drives: any[]) => {
          if (drives && Array.isArray(drives)) setSystemDrives(drives);
        });

        const timeStr = new Date().toTimeString().split(' ')[0];
        setFileSyncStats({
          lastSyncTime: timeStr,
          deletedCount,
          movedCount,
          reclaimedMB
        });

        const msgParts = [];
        if (deletedCount > 0) msgParts.push(`ลบไปแล้ว ${deletedCount} ไฟล์ (คืนพื้นที่ ${formatSize(reclaimedMB)})`);
        if (movedCount > 0) msgParts.push(`ย้ายตำแหน่ง ${movedCount} ไฟล์`);

        logIpc('sync_files_status', `อัปเดตไฟล์: ${msgParts.join(', ')}`, Math.round(performance.now() - start));
        showToast(
          'อัปเดตไฟล์ที่ถูกลบ/ย้ายแล้ว',
          `ตรวจพบ: ${msgParts.join(' และ ')} รายการและขนาดพื้นที่ได้รับการอัปเดตเรียบร้อย`,
          'info'
        );
      } else if (userInitiated) {
        showToast(
          'ข้อมูลไฟล์เป็นปัจจุบันแล้ว',
          `ตรวจสอบแล้ว ${currentFiles.length} ไฟล์ ทุกรายการยังอยู่ที่เดิมและมีขนาดถูกต้อง`,
          'success'
        );
      }
    } catch (e: any) {
      if (userInitiated) {
        showToast('เกิดข้อผิดพลาดในการตรวจสอบไฟล์', e?.message || 'ไม่สามารถตรวจสอบไฟล์ได้', 'error');
      }
    } finally {
      setIsSyncingFiles(false);
    }
  };

  // Auto-sync files status when user returns to window (e.g. from Explorer after deleting/moving files)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (largeFilesRef.current.length > 0 || duplicateGroupsRef.current.length > 0) {
        handleSyncFileStatus(false);
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // Auto-sync files status when switching to storage or dashboard tab
  useEffect(() => {
    if (activeTab === 'storage' || activeTab === 'dashboard') {
      if (largeFilesRef.current.length > 0 || duplicateGroupsRef.current.length > 0) {
        handleSyncFileStatus(false);
      }
    }
  }, [activeTab]);

  // Delete a specific file from largeFiles or duplicateGroups
  const handleConfirmDeleteFile = async (permanent = !safeRecycleBin) => {
    if (!deleteConfirmModal) return;
    const { file } = deleteConfirmModal;
    setIsDeletingSpecificFile(true);

    try {
      const res = await (window as any).electronAPI?.deleteFileItem?.(file.path, !permanent);
      if (res?.success) {
        // Remove from largeFiles
        setLargeFiles((prev) => {
          const next = prev.filter((f) => f.path.toLowerCase() !== file.path.toLowerCase());
          updateDirectoryBreakdownFromFiles(next);
          return next;
        });

        // Remove from duplicateGroups if applicable
        setDuplicateGroups((prev) => {
          return prev
            .map((g) => ({
              ...g,
              copies: g.copies.filter((c: any) => c.path.toLowerCase() !== file.path.toLowerCase())
            }))
            .filter((g) => g.copies.length >= 2);
        });

        // Refresh system drives
        (window as any).electronAPI?.getSystemDrives?.().then((drives: any[]) => {
          if (drives && Array.isArray(drives)) setSystemDrives(drives);
        });

        showToast(
          'ลบไฟล์สำเร็จ',
          `${res.message || 'ลบไฟล์เรียบร้อยแล้ว'} (${file.name || file.path})`,
          'success'
        );
        setDeleteConfirmModal(null);
      } else {
        showToast(
          'ไม่สามารถลบไฟล์ได้',
          res?.error || 'ไฟล์อาจถูกโปรแกรมอื่นล็อกอยู่',
          'error'
        );
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการลบไฟล์', err?.message || 'ไม่สามารถลบไฟล์ได้', 'error');
    } finally {
      setIsDeletingSpecificFile(false);
    }
  };

  // Move a specific file to a chosen directory
  const handleMoveFile = async (file: any) => {
    try {
      const targetDir = await (window as any).electronAPI?.chooseFolder?.();
      if (!targetDir) return; // user cancelled

      setIsMovingFile(true);
      const res = await (window as any).electronAPI?.moveFileItem?.(file.path, targetDir);

      if (res?.success) {
        // Update largeFiles with new path and drive
        setLargeFiles((prev) => {
          const next = prev.map((f) => {
            if (f.path.toLowerCase() === file.path.toLowerCase()) {
              return {
                ...f,
                path: res.newPath,
                drive: res.newDrive,
                name: res.fileName || f.name,
                isRecentlyMoved: true
              };
            }
            return f;
          });
          updateDirectoryBreakdownFromFiles(next);
          return next;
        });

        // Update duplicate groups if affected
        setDuplicateGroups((prev) =>
          prev.map((g) => ({
            ...g,
            copies: g.copies.map((c: any) =>
              c.path.toLowerCase() === file.path.toLowerCase()
                ? { ...c, path: res.newPath, moved: true }
                : c
            )
          }))
        );

        // Refresh system drives
        (window as any).electronAPI?.getSystemDrives?.().then((drives: any[]) => {
          if (drives && Array.isArray(drives)) setSystemDrives(drives);
        });

        showToast(
          'ย้ายไฟล์สำเร็จ',
          `ย้ายไปยัง "${targetDir}" เรียบร้อยแล้ว (${file.name || res.fileName})`,
          'success'
        );
      } else {
        showToast('ไม่สามารถย้ายไฟล์ได้', res?.error || 'เกิดข้อผิดพลาดในการย้ายไฟล์', 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถย้ายไฟล์ได้', 'error');
    } finally {
      setIsMovingFile(false);
    }
  };

  // Delete all duplicate copies in a group except the first original
  const handleDeleteAllDuplicatesExceptFirst = async (group: any) => {
    if (!group.copies || group.copies.length <= 1) return;
    const copiesToDelete = group.copies.slice(1);
    let successCount = 0;

    for (const copy of copiesToDelete) {
      try {
        const res = await (window as any).electronAPI?.deleteFileItem?.(copy.path, safeRecycleBin);
        if (res?.success) successCount++;
      } catch (e) {}
    }

    if (successCount > 0) {
      const deletedPaths = new Set(copiesToDelete.map((c: any) => c.path.toLowerCase()));
      // Remove group
      setDuplicateGroups((prev) => prev.filter((g) => g.id !== group.id));
      // Remove from largeFiles
      setLargeFiles((prev) => {
        const next = prev.filter((f) => !deletedPaths.has(f.path.toLowerCase()));
        updateDirectoryBreakdownFromFiles(next);
        return next;
      });
      // Refresh system drives
      (window as any).electronAPI?.getSystemDrives?.().then((d: any) => d && setSystemDrives(d));

      showToast(
        'ล้างสำเนาซ้ำสำเร็จ',
        `ลบสำเนาไปแล้ว ${successCount} ไฟล์ และคงไฟล์ต้นฉบับไว้เรียบร้อย`,
        'success'
      );
    }
  };

  // -------------------------------------------------------------
  // Custom File Inspection & Batch Selection Handlers (เลือกไฟล์ที่จะตรวจสอบ)
  // -------------------------------------------------------------
  const handleChooseAndInspectFiles = async () => {
    try {
      setIsInspectingFiles(true);
      const chosenPaths = await (window as any).electronAPI?.chooseFiles?.();
      if (!chosenPaths || chosenPaths.length === 0) {
        setIsInspectingFiles(false);
        return;
      }
      const results = await (window as any).electronAPI?.inspectFiles?.(chosenPaths);
      if (results && results.length > 0) {
        setCustomInspectedFiles((prev) => {
          const map = new Map(prev.map((item) => [item.path.toLowerCase(), item]));
          for (const r of results) {
            map.set(r.path.toLowerCase(), r);
          }
          return Array.from(map.values());
        });
        showToast('ตรวจสอบไฟล์สำเร็จ', `ตรวจสอบข้อมูลและความสมบูรณ์ของ ${results.length} ไฟล์เรียบร้อยแล้ว`, 'success');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถเปิดหน้าต่างเลือกไฟล์ได้', 'error');
    } finally {
      setIsInspectingFiles(false);
    }
  };

  const handleInspectSingleFile = async (filePath: string) => {
    try {
      setIsInspectingFiles(true);
      const res = await (window as any).electronAPI?.inspectFiles?.([filePath]);
      if (res && res.length > 0) {
        setFileInspectDetailModal(res[0]);
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถตรวจสอบไฟล์ได้', 'error');
    } finally {
      setIsInspectingFiles(false);
    }
  };

  const handleReinspectFile = async (fileItem: any) => {
    try {
      setIsInspectingFiles(true);
      const res = await (window as any).electronAPI?.inspectFiles?.([fileItem.path]);
      if (res && res.length > 0) {
        setCustomInspectedFiles((prev) =>
          prev.map((item) => (item.path.toLowerCase() === fileItem.path.toLowerCase() ? res[0] : item))
        );
        showToast('อัปเดตไฟล์แล้ว', `สถานะไฟล์ ${fileItem.name} เป็นปัจจุบันแล้ว`, 'info');
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด', e?.message || 'ไม่สามารถตรวจสอบไฟล์ซ้ำได้', 'error');
    } finally {
      setIsInspectingFiles(false);
    }
  };

  const handleToggleSelectAllHeavy = () => {
    if (selectedHeavyFileIds.size > 0 && selectedHeavyFileIds.size === filteredLargeFiles.length) {
      setSelectedHeavyFileIds(new Set());
    } else {
      setSelectedHeavyFileIds(new Set(filteredLargeFiles.map((f) => f.id)));
    }
  };

  const handleToggleSelectHeavy = (id: string) => {
    setSelectedHeavyFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchInspectSelected = async () => {
    const selectedFiles = largeFiles.filter((f) => selectedHeavyFileIds.has(f.id));
    if (selectedFiles.length === 0) return;
    try {
      setIsInspectingFiles(true);
      const paths = selectedFiles.map((f) => f.path);
      const results = await (window as any).electronAPI?.inspectFiles?.(paths);
      if (results && results.length > 0) {
        setCustomInspectedFiles((prev) => {
          const map = new Map(prev.map((item) => [item.path.toLowerCase(), item]));
          for (const r of results) {
            map.set(r.path.toLowerCase(), r);
          }
          return Array.from(map.values());
        });
        showToast('ตรวจสอบไฟล์ที่เลือกสำเร็จ', `นำข้อมูล ${results.length} ไฟล์เข้าสู่กล่องผลการตรวจสอบพิเศษด้านบนแล้ว`, 'success');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถตรวจสอบไฟล์ได้', 'error');
    } finally {
      setIsInspectingFiles(false);
    }
  };

  const handleBatchCopyPaths = () => {
    const selectedFiles = largeFiles.filter((f) => selectedHeavyFileIds.has(f.id));
    if (selectedFiles.length === 0) return;
    const paths = selectedFiles.map((f) => f.path).join('\n');
    handleCopy(paths, 'batch_selected');
    showToast('คัดลอกตำแหน่งสำเร็จ', `คัดลอกพาธ ${selectedFiles.length} ไฟล์ลงใน Clipboard เรียบร้อย`, 'success');
  };

  const handleBatchMoveSelected = async () => {
    const selectedFiles = largeFiles.filter((f) => selectedHeavyFileIds.has(f.id));
    if (selectedFiles.length === 0) return;

    try {
      const targetDir = await (window as any).electronAPI?.chooseFolder?.();
      if (!targetDir) return;

      setIsMovingFile(true);
      let movedCount = 0;
      const movedMap = new Map<string, any>();

      for (const file of selectedFiles) {
        try {
          const res = await (window as any).electronAPI?.moveFileItem?.(file.path, targetDir);
          if (res?.success) {
            movedCount++;
            movedMap.set(file.path.toLowerCase(), res);
          }
        } catch (e) {}
      }

      if (movedCount > 0) {
        setLargeFiles((prev) => {
          const next = prev.map((f) => {
            const mv = movedMap.get(f.path.toLowerCase());
            if (mv) {
              return {
                ...f,
                path: mv.newPath,
                drive: mv.newDrive,
                name: mv.fileName || f.name,
                isRecentlyMoved: true
              };
            }
            return f;
          });
          updateDirectoryBreakdownFromFiles(next);
          return next;
        });

        (window as any).electronAPI?.getSystemDrives?.().then((d: any) => d && setSystemDrives(d));
        setSelectedHeavyFileIds(new Set());
        showToast('ย้ายกลุ่มไฟล์สำเร็จ', `ย้ายไฟล์สำเร็จ ${movedCount} จาก ${selectedFiles.length} ไฟล์ไปยัง "${targetDir}"`, 'success');
      } else {
        showToast('ไม่สามารถย้ายไฟล์ได้', 'เกิดข้อผิดพลาดหรือไฟล์ถูกล็อกอยู่', 'error');
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด', e?.message || 'ไม่สามารถย้ายไฟล์ได้', 'error');
    } finally {
      setIsMovingFile(false);
    }
  };

  const handleBatchDeleteSelected = async (permanent = !safeRecycleBin) => {
    const selectedFiles = largeFiles.filter((f) => selectedHeavyFileIds.has(f.id));
    if (selectedFiles.length === 0) return;

    setIsDeletingSpecificFile(true);
    let deletedCount = 0;
    const deletedPaths = new Set<string>();

    for (const file of selectedFiles) {
      try {
        const res = await (window as any).electronAPI?.deleteFileItem?.(file.path, !permanent);
        if (res?.success) {
          deletedCount++;
          deletedPaths.add(file.path.toLowerCase());
        }
      } catch (e) {}
    }

    if (deletedCount > 0) {
      setLargeFiles((prev) => {
        const next = prev.filter((f) => !deletedPaths.has(f.path.toLowerCase()));
        updateDirectoryBreakdownFromFiles(next);
        return next;
      });

      setDuplicateGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            copies: g.copies.filter((c: any) => !deletedPaths.has(c.path.toLowerCase()))
          }))
          .filter((g) => g.copies.length >= 2)
      );

      (window as any).electronAPI?.getSystemDrives?.().then((d: any) => d && setSystemDrives(d));
      setSelectedHeavyFileIds(new Set());
      showToast('ลบกลุ่มไฟล์สำเร็จ', `ลบไฟล์เรียบร้อยแล้ว ${deletedCount} จาก ${selectedFiles.length} รายการ`, 'success');
    } else {
      showToast('ไม่สามารถลบไฟล์ได้', 'ไฟล์อาจถูกล็อกใช้งานอยู่โดยระบบหรือโปรแกรมอื่น', 'error');
    }
    setIsDeletingSpecificFile(false);
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
      setBackgroundProcs((prev) => prev.filter((p) => p.pid !== pid));
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

  // Clean junk items with deep force cleaning & real-time auto-update across entire app
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
    setJunkCleanResult(null);
    try {
      const res = await (window as any).electronAPI?.cleanJunkItems?.(selectedItems, safeRecycleBin);
      if (res?.success) {
        setJunkCleanResult(res);
        setTotalCleanedSessionMB((prev) => prev + (res.reclaimedMB || 0));

        if (res.failedCount > 0) {
          showToast(
            'ล้างไฟล์แล้ว (มีบางไฟล์ติดล็อก)',
            `ลบสำเร็จ ${res.cleanedCount} รายการ (${formatSize(res.reclaimedMB)}) ติดล็อก ${res.failedCount} รายการ`,
            'warning'
          );
        } else {
          showToast(
            'ทำความสะอาดเสร็จสมบูรณ์',
            `ล้างไฟล์ไปแล้ว ${res.cleanedCount} รายการ ได้พื้นที่คืน ${formatSize(res.reclaimedMB)}`,
            'success'
          );
        }

        // ==========================================
        // AUTO-UPDATE DATA IN REAL TIME ACROSS APP:
        // ==========================================
        // 1. Refresh Junk Categories list immediately
        const updatedJunk = await (window as any).electronAPI?.scanRealJunk?.();
        if (updatedJunk) setJunkCategories(updatedJunk);

        // 2. Refresh System Drives immediately (so Dashboard & Storage tab show updated free space!)
        const updatedDrives = await (window as any).electronAPI?.getSystemDrives?.();
        if (updatedDrives) setSystemDrives(updatedDrives);

        // 3. Refresh System Telemetry
        const updatedTele = (window as any).electronAPI?.getSystemTelemetry?.();
        if (updatedTele) {
          setCpuUsage(updatedTele.cpuPercent);
          setRamUsageGB(updatedTele.usedMemGB);
          setTotalRamGB(updatedTele.totalMemGB);
        }

        // 4. Sync files status across app (remove any deleted files from largeFiles and duplicate lists)
        await handleSyncFileStatus(false);
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการลบ', err?.message || 'ไม่สามารถลบไฟล์บางรายการได้', 'error');
    } finally {
      setIsCleaningJunk(false);
    }
  };

  // Kill blockers and retry clean
  const handleKillBlockersAndRetryClean = async () => {
    if (!junkCleanResult || !junkCleanResult.runningBlockers?.length) return;
    setIsCleaningJunk(true);
    try {
      for (const b of junkCleanResult.runningBlockers) {
        await (window as any).electronAPI?.killProcess?.(b.pid);
      }
      showToast('ปิดโปรแกรมที่ล็อกแล้ว', 'กำลังเริ่มล้างไฟล์ใหม่อีกครั้ง...', 'info');
      await handleCleanJunk();
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด', e?.message || 'ไม่สามารถปิดโปรแกรมบางตัวได้', 'error');
      setIsCleaningJunk(false);
    }
  };

  // Scan all background processes (ย่อดรอปดาวน์)
  const handleScanBackground = async () => {
    setIsScanningBackground(true);
    const start = performance.now();
    logIpc('get_all_background_processes', 'ดึงข้อมูลโปรแกรมพื้นหลังทั้งหมดในระบบ...');
    try {
      const res = await (window as any).electronAPI?.getAllBackgroundProcesses?.();
      if (res && Array.isArray(res)) {
        setBackgroundProcs(res);
        logIpc('get_all_background_processes', `พบโปรเซสพื้นหลังทั้งหมด ${res.length} รายการ`, Math.round(performance.now() - start));
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด', e?.message || 'ไม่สามารถดึงโปรแกรมพื้นหลังได้', 'error');
    } finally {
      setIsScanningBackground(false);
    }
  };

  // Scan program conflicts (เช็คโปรแกรมขัดการทำงานกัน)
  const handleScanConflicts = async () => {
    setIsScanningConflicts(true);
    const start = performance.now();
    logIpc('detect_program_conflicts', 'สแกนหาข้อขัดแย้ง พอร์ตชนกัน และโปรเซสค้าง...');
    try {
      const res = await (window as any).electronAPI?.detectProgramConflicts?.();
      if (res && Array.isArray(res)) {
        setConflicts(res);
        logIpc('detect_program_conflicts', `พบข้อขัดแย้งในระบบ ${res.length} รายการ`, Math.round(performance.now() - start));
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด', e?.message || 'ไม่สามารถสแกนข้อขัดแย้งได้', 'error');
    } finally {
      setIsScanningConflicts(false);
    }
  };

  // Resolve conflict
  const handleResolveConflict = async (conflict: any) => {
    setResolvingConflictId(conflict.id);
    const pids = conflict.conflictingPrograms?.map((p: any) => p.pid) || [];
    try {
      const res = await (window as any).electronAPI?.resolveConflict?.(conflict.id, pids);
      if (res?.success) {
        showToast('แก้ไขข้อขัดแย้งสำเร็จ', `ปิดโปรเซสที่เกี่ยวข้อง (${res.killedCount} ตัว) เรียบร้อย`, 'success');
        handleScanConflicts();
        handleScanBackground();
        (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
      } else {
        showToast('ไม่สามารถแก้ไขได้', res?.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด', e?.message || 'ไม่สามารถปิดโปรเซสได้', 'error');
    } finally {
      setResolvingConflictId(null);
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
        if (selectedStorageCategory !== 'all') {
          const cat = f.category || '';
          if (selectedStorageCategory === 'game' && !cat.includes('Game')) return false;
          if (selectedStorageCategory === 'media' && !cat.includes('Media')) return false;
          if (selectedStorageCategory === 'archive' && !cat.includes('Archive')) return false;
          if (selectedStorageCategory === 'binary' && !cat.includes('Binary') && !cat.includes('Installer')) return false;
          if (selectedStorageCategory === 'dev' && !cat.includes('Dev') && !cat.includes('Database')) return false;
          if (selectedStorageCategory === 'other' && (cat.includes('Game') || cat.includes('Media') || cat.includes('Archive') || cat.includes('Binary') || cat.includes('Installer') || cat.includes('Dev') || cat.includes('Database'))) return false;
        }
        if (storageSearch.trim()) {
          const q = storageSearch.toLowerCase();
          return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (storageSortAsc ? a.sizeMB - b.sizeMB : b.sizeMB - a.sizeMB));
  }, [largeFiles, selectedDrive, selectedTreemapBlock, selectedStorageCategory, storageSearch, storageSortAsc]);

  // Computed selected heavy files for batch operations
  const selectedHeavyFiles = useMemo(() => {
    return largeFiles.filter((f) => selectedHeavyFileIds.has(f.id));
  }, [largeFiles, selectedHeavyFileIds]);

  const selectedHeavyTotalMB = useMemo(() => {
    return selectedHeavyFiles.reduce((acc, f) => acc + (f.sizeMB || 0), 0);
  }, [selectedHeavyFiles]);

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

  // Computed Grouped Ports by Executable File (ให้ย่อพวกไฟล์ไว้ก่อน)
  const groupedPortsByFile = useMemo(() => {
    const map = new Map<string, {
      key: string;
      processName: string;
      exePath: string;
      pid: number;
      ports: any[];
      devPortsCount: number;
      serviceName?: string;
    }>();

    for (const p of filteredPorts) {
      const fileKey = p.exePath ? p.exePath.toLowerCase() : `${p.processName.toLowerCase()}_pid_${p.pid}`;
      if (!map.has(fileKey)) {
        map.set(fileKey, {
          key: fileKey,
          processName: p.processName || 'System',
          exePath: p.exePath || '',
          pid: p.pid,
          ports: [],
          devPortsCount: 0,
          serviceName: p.serviceName || ''
        });
      }
      const group = map.get(fileKey)!;
      group.ports.push(p);
      if (p.isDevPort) group.devPortsCount++;
      if (p.serviceName && !group.serviceName) group.serviceName = p.serviceName;
    }

    return Array.from(map.values()).sort((a, b) => b.ports.length - a.ports.length);
  }, [filteredPorts]);

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

  // Computed Background Processes (filtering & sorting)
  const filteredBackgroundProcs = useMemo(() => {
    return backgroundProcs
      .filter((p) => {
        if (backgroundCategoryFilter !== 'all' && p.category !== backgroundCategoryFilter) {
          return false;
        }
        if (backgroundSearch.trim()) {
          const q = backgroundSearch.toLowerCase();
          return (
            p.processName.toLowerCase().includes(q) ||
            p.pid.toString().includes(q) ||
            (p.path && p.path.toLowerCase().includes(q)) ||
            (p.company && p.company.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.serviceName && p.serviceName.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (backgroundSortBy === 'ram') return (b.memoryMB || 0) - (a.memoryMB || 0);
        if (backgroundSortBy === 'name') return a.processName.localeCompare(b.processName);
        if (backgroundSortBy === 'pid') return a.pid - b.pid;
        return 0;
      });
  }, [backgroundProcs, backgroundCategoryFilter, backgroundSearch, backgroundSortBy]);

  // Grouped Background Processes by Category for Accordions
  const groupedBackgroundProcs = useMemo(() => {
    const groups: { [key: string]: any[] } = {
      user_app: [],
      service: [],
      windows_app: [],
      system: [],
      other: []
    };
    filteredBackgroundProcs.forEach((p) => {
      const cat = p.category in groups ? p.category : 'other';
      groups[cat].push(p);
    });
    return groups;
  }, [filteredBackgroundProcs]);

  // Computed Conflicts Filter
  const filteredConflicts = useMemo(() => {
    if (conflictFilter === 'all') return conflicts;
    return conflicts.filter((c) => c.severity === conflictFilter);
  }, [conflicts, conflictFilter]);

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
            <span className="font-bold tracking-tight text-sm text-white">SysInfo</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
              v0.1.2 • SysInfo
            </span>
          </div>
          <span className="hidden md:inline-block text-xs text-slate-500 pl-2 border-l border-slate-800">
            Storage Analyzer, Smart Junk Cleaner, Game Libraries &amp; Port Inspector
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

            {/* Menu 2.5: File Organizer */}
            <button
              onClick={() => {
                setActiveTab('organizer');
                mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'organizer'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderInput className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>จัดระเบียบไฟล์</div>
                  <div className={`text-[11px] ${activeTab === 'organizer' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    File Organizer
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                New
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

            {/* Menu 4: Ports, Services, Background & Conflicts */}
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
                  <div>พอร์ต, โปรแกรมพื้นหลัง & ข้อขัดแย้ง</div>
                  <div className={`text-[11px] ${activeTab === 'ports' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Ports, Background & Conflicts
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {conflicts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                    {conflicts.length} ขัดแย้ง
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === 'ports' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {ports.length}
                </span>
              </div>
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
                    เข้าถึงฮาร์ดแวร์จริง ไดรฟ์จริง ตรวจจับโปรแกรมพื้นหลัง และวิเคราะห์ข้อขัดแย้งในเครื่อง
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      handleTriggerStorageScan();
                      (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
                      (window as any).electronAPI?.getWindowsServices?.().then((s: any) => s && setWindowsServices(s));
                      handleScanBackground();
                      handleScanConflicts();
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningStorage || isScanningConflicts ? 'animate-spin text-indigo-400' : ''}`} />
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

              {/* Conflict Alert Banner if any conflicts exist */}
              {conflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>ตรวจพบโปรแกรมขัดการทำงานกัน {conflicts.length} รายการ</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 font-semibold">
                          ตรวจพบข้อขัดแย้ง
                        </span>
                      </div>
                      <p className="text-xs text-rose-200/80 mt-0.5">
                        พบพอร์ตชนกัน โปรเซสเปิดค้างซ้ำซ้อน หรือโปรแกรมเบื้องหลังที่แย่งทรัพยากร อาจส่งผลให้แอปอื่นทำงานผิดพลาด
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('ports');
                      setPortSubTab('conflicts');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition shrink-0 flex items-center gap-1.5"
                  >
                    <span>ตรวจสอบข้อขัดแย้ง</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* 4 Overview Quick Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <span className="text-slate-400">เลือก: {formatSize(totalSelectedJunkMB)}</span>
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
                      <span className="text-xs text-slate-400 font-medium">พอร์ตที่เปิดใช้งานจริง</span>
                      <div className="text-2xl font-bold text-white mt-1">{ports.length} พอร์ต</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Network className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Service ผูก: {ports.filter((p) => p.serviceName).length}
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

                {/* Background Programs Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">โปรแกรมพื้นหลังทั้งหมด</span>
                      <div className="text-2xl font-bold text-white mt-1">{backgroundProcs.length} โปรเซส</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      แอปผู้ใช้: {backgroundProcs.filter((p) => p.category === 'user_app').length} ตัว
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('ports');
                        setPortSubTab('background');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      ย่อดรอปดาวน์ดู →
                    </button>
                  </div>
                </div>

                {/* Conflicts & Collisions Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">ข้อขัดแย้งในระบบ</span>
                      <div className={`text-2xl font-bold mt-1 ${conflicts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {conflicts.length > 0 ? `${conflicts.length} รายการ` : 'ปกติ (0)'}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${conflicts.length > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {conflicts.length > 0 ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {conflicts.length > 0 ? 'ต้องตรวจสอบ' : 'ระบบราบรื่น'}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('ports');
                        setPortSubTab('conflicts');
                      }}
                      className="text-rose-400 hover:text-rose-300 font-medium"
                    >
                      เช็คข้อขัดแย้ง →
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
                              {item.isRecentlyMoved && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 shrink-0">
                                  ย้ายแล้ว
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate mt-0.5">{item.path}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-bold text-amber-400 font-mono mr-1">
                              {formatSize(item.sizeMB)}
                            </span>
                            <button
                              onClick={() => handleOpenFolder(item.path)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="เปิดโฟลเดอร์ใน Explorer"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveFile(item)}
                              disabled={isMovingFile}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 hover:text-sky-300 text-slate-300 transition"
                              title="ย้ายไฟล์ (Move File)"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmModal({ file: item })}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 hover:text-rose-300 text-slate-300 transition"
                              title="ลบไฟล์นี้ (Delete File)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

                  {/* Quick Sync Deleted & Moved Files Button */}
                  <button
                    onClick={() => handleSyncFileStatus(true)}
                    disabled={isSyncingFiles}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 text-xs font-semibold shadow transition"
                    title="ตรวจสอบและอัปเดตไฟล์ทั้งหมดว่าถูกลบหรือย้ายตำแหน่งแล้วหรือไม่"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncingFiles ? 'animate-spin' : ''}`} />
                    <span>{isSyncingFiles ? 'กำลังตรวจเช็คไฟล์...' : 'อัปเดตไฟล์ที่ถูกลบ/ย้าย'}</span>
                  </button>

                  {/* Choose Files to Inspect Button (ให้สามารถเลือกไฟล์ที่จะตรวจสอบได้) */}
                  <button
                    onClick={handleChooseAndInspectFiles}
                    disabled={isInspectingFiles}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-200 border border-violet-500/30 text-xs font-semibold shadow transition"
                    title="เลือกไฟล์จากเครื่องคอมพิวเตอร์เพื่อตรวจสอบขนาด ความสมบูรณ์ และการล็อกไฟล์"
                  >
                    <FileSearch className={`w-3.5 h-3.5 text-violet-400 ${isInspectingFiles ? 'animate-spin' : ''}`} />
                    <span>{isInspectingFiles ? 'กำลังตรวจสอบ...' : '📁 เลือกไฟล์เพื่อตรวจสอบ'}</span>
                  </button>

                  {/* Dedicated Game Files & Libraries Access Button (ให้เข้าถึงพวกไฟล์เกมด้วย) */}
                  <button
                    onClick={handleScanGames}
                    disabled={isScanningGames}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-200 border border-fuchsia-500/30 text-xs font-semibold shadow transition"
                    title="เข้าถึงและวิเคราะห์คลังเกมทั้งหมดในเครื่อง (Steam, Riot Games, Epic Games, Roblox, Gryphline)"
                  >
                    <Gamepad2 className={`w-3.5 h-3.5 text-fuchsia-400 ${isScanningGames ? 'animate-spin' : ''}`} />
                    <span>{isScanningGames ? 'กำลังสแกนเกม...' : '🎮 คลังไฟล์เกม (Game Files)'}</span>
                  </button>

                  <button
                    onClick={() => handleTriggerStorageScan()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningStorage ? 'animate-spin' : ''}`} />
                    <span>สแกนไฟล์ทั้งเครื่องใหม่</span>
                  </button>
                </div>
              </div>

              {/* Custom Selected Files Inspection Section (เลือกไฟล์เพื่อตรวจสอบ) */}
              {customInspectedFiles.length > 0 && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950/20 to-slate-900 border border-violet-500/40 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileSearch className="w-4 h-4 text-violet-400" />
                        <h3 className="text-sm font-bold text-white">
                          รายการไฟล์ที่เลือกตรวจสอบเฉพาะเจาะจง ({customInspectedFiles.length} รายการ)
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                          File Inspector Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        วิเคราะห์ขนาดจริง, วันที่แก้ไข, การมีอยู่, และสถานะการล็อก/ใช้งานโดยโปรเซสอื่น
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleChooseAndInspectFiles}
                        disabled={isInspectingFiles}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        <span>➕ เลือกไฟล์เพิ่ม</span>
                      </button>
                      <button
                        onClick={() => setCustomInspectedFiles([])}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                      >
                        ล้างรายการ
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {customInspectedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-violet-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white max-w-sm truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {item.category}
                            </span>
                            {item.status === 'normal' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                ✓ พร้อมใช้งาน (ปกติ)
                              </span>
                            )}
                            {item.status === 'locked' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                ⚠ ถูกล็อก/ใช้งานอยู่ ({item.lockedBy?.[0]?.processName || 'In-Use'})
                              </span>
                            )}
                            {item.status === 'deleted' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                                ✕ ไม่พบไฟล์ (ถูกลบหรือย้าย)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-xl" title={item.path}>
                            {item.path}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-3">
                            <span>แก้ไข: {item.lastModified}</span>
                            <span>•</span>
                            <span>สร้าง: {item.createdDate}</span>
                            <span>•</span>
                            <span>ไดรฟ์: {item.drive}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-amber-400 text-sm">{item.formattedSize}</div>
                            {item.sizeBytes > 0 && (
                              <div className="text-[10px] text-slate-500 font-mono">({item.sizeBytes.toLocaleString()} B)</div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setFileInspectDetailModal(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/30 hover:text-violet-300 text-slate-300 transition"
                              title="ดูข้อมูลเชิงลึกและการล็อกไฟล์"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenFolder(item.path)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="เปิดโฟลเดอร์ใน Explorer"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopy(item.path, item.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="คัดลอกตำแหน่งไฟล์"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReinspectFile(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="ตรวจสอบไฟล์นี้ซ้ำ (Re-inspect)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {item.exists && (
                              <>
                                <button
                                  onClick={() => handleMoveFile({ path: item.path, name: item.name, sizeMB: item.sizeMB })}
                                  disabled={isMovingFile}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 hover:text-sky-300 text-slate-300 transition"
                                  title="ย้ายไฟล์ (Move File)"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmModal({ file: { path: item.path, name: item.name, sizeMB: item.sizeMB } })}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 hover:text-rose-300 text-slate-300 transition"
                                  title="ลบไฟล์นี้ (Delete File)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setCustomInspectedFiles((prev) => prev.filter((x) => x.id !== item.id))}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              title="เอาออกจากรายการตรวจนี้"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time File Sync Status Banner */}
              {fileSyncStats && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ระบบตรวจสอบไฟล์ล่าสุด ({fileSyncStats.lastSyncTime}):</span>
                  {fileSyncStats.deletedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                      ไฟล์ถูกลบ {fileSyncStats.deletedCount} รายการ (คืนพื้นที่ {formatSize(fileSyncStats.reclaimedMB)})
                    </span>
                  )}
                  {fileSyncStats.movedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                      ตรวจพบไฟล์ถูกย้าย {fileSyncStats.movedCount} รายการ (อัปเดตตำแหน่งใหม่แล้ว)
                    </span>
                  )}
                  {fileSyncStats.deletedCount === 0 && fileSyncStats.movedCount === 0 && (
                    <span className="text-slate-400">ทุกไฟล์ในรายการยังอยู่ที่เดิมและมีขนาดถูกต้อง</span>
                  )}
                </div>
              )}

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
                  <button
                    onClick={() => {
                      setStorageSubTab('games');
                      if (!gameLibrariesData && !isScanningGames) {
                        handleScanGames();
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      storageSubTab === 'games'
                        ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>คลังเกมในเครื่อง (Game Libraries)</span>
                    {gameLibrariesData && (
                      <span className="px-1.5 py-0.2 rounded-full bg-fuchsia-950 text-fuchsia-300 text-[10px] font-bold border border-fuchsia-500/30">
                        {gameLibrariesData.gameCount} เกม
                      </span>
                    )}
                  </button>
                </div>

                {storageSubTab === 'heavy' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedStorageCategory}
                      onChange={(e) => setSelectedStorageCategory(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      title="กรองตามประเภทไฟล์"
                    >
                      <option value="all">📁 ทุกหมวดหมู่ ({largeFiles.length})</option>
                      <option value="game">🎮 ไฟล์เกม ({largeFiles.filter(f => f.category?.includes('Game')).length})</option>
                      <option value="media">🎥 วิดีโอ / สื่อ ({largeFiles.filter(f => f.category?.includes('Media')).length})</option>
                      <option value="archive">📦 บีบอัด / ISO ({largeFiles.filter(f => f.category?.includes('Archive')).length})</option>
                      <option value="binary">💾 ไบนารี / ติดตั้ง ({largeFiles.filter(f => f.category?.includes('Binary') || f.category?.includes('Installer')).length})</option>
                      <option value="dev">💻 โค้ด / ข้อมูล ({largeFiles.filter(f => f.category?.includes('Dev') || f.category?.includes('Database')).length})</option>
                      <option value="other">📄 เอกสารและอื่นๆ</option>
                    </select>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={storageSearch}
                        onChange={(e) => setStorageSearch(e.target.value)}
                        placeholder="ค้นหาชื่อไฟล์ หรือ นามสกุล..."
                        className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
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
                <div className="space-y-3">
                  {/* Batch Selection Action Bar (เมื่อมีการเลือกไฟล์) */}
                  {selectedHeavyFileIds.size > 0 && (
                    <div className="p-3 bg-indigo-950/90 border border-indigo-500/50 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl backdrop-blur animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold font-mono">
                          เลือกแล้ว {selectedHeavyFileIds.size} ไฟล์
                        </span>
                        <span className="text-slate-300">
                          (รวมขนาด: <b className="text-amber-400 font-mono">{formatSize(selectedHeavyTotalMB)}</b>)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={handleBatchInspectSelected}
                          disabled={isInspectingFiles}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow transition"
                          title="ส่งไฟล์ที่เลือกไปตรวจสอบความสมบูรณ์และการล็อกเชิงลึก"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                          <span>⚡ ตรวจสอบไฟล์ที่เลือก</span>
                        </button>
                        <button
                          onClick={handleBatchMoveSelected}
                          disabled={isMovingFile}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow transition"
                          title="ย้ายไฟล์ที่เลือกทั้งหมดไปยังโฟลเดอร์อื่น"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                          <span>ย้ายไฟล์ที่เลือก</span>
                        </button>
                        <button
                          onClick={() => handleBatchDeleteSelected(!safeRecycleBin)}
                          disabled={isDeletingSpecificFile}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow transition"
                          title="ลบไฟล์ที่เลือกทั้งหมด"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบไฟล์ที่เลือก</span>
                        </button>
                        <button
                          onClick={handleBatchCopyPaths}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                          title="คัดลอกตำแหน่งไฟล์ทั้งหมดที่เลือก"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกพาธ</span>
                        </button>
                        <button
                          onClick={() => setSelectedHeavyFileIds(new Set())}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>ยกเลิก</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedHeavyFileIds.size > 0 && selectedHeavyFileIds.size === filteredLargeFiles.length}
                                onChange={handleToggleSelectAllHeavy}
                                className="rounded accent-indigo-600 cursor-pointer w-3.5 h-3.5"
                                title="เลือก/ยกเลิกทั้งหมด"
                              />
                            </th>
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
                              <td colSpan={7} className="py-8 text-center text-slate-500">
                                {isScanningStorage ? 'กำลังสแกนไฟล์บนไดรฟ์...' : 'ไม่พบไฟล์ตามเงื่อนไขที่เลือก'}
                              </td>
                            </tr>
                          ) : (
                            filteredLargeFiles.map((file) => {
                              const isChecked = selectedHeavyFileIds.has(file.id);
                              return (
                                <tr
                                  key={file.id}
                                  className={`hover:bg-slate-800/30 transition ${
                                    isChecked ? 'bg-indigo-950/30' : ''
                                  }`}
                                >
                                  <td className="py-3 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleSelectHeavy(file.id)}
                                      className="rounded accent-indigo-600 cursor-pointer w-3.5 h-3.5"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-100 max-w-sm truncate" title={file.name}>
                                        {file.name}
                                      </span>
                                      {file.isRecentlyMoved && (
                                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] flex items-center gap-1 font-sans shrink-0">
                                          <ExternalLink className="w-2.5 h-2.5" /> ย้ายตำแหน่งแล้ว
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-md" title={file.path}>
                                      {file.path}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {file.category?.includes('Game') ? (
                                      <span className="px-2 py-0.5 rounded-full bg-fuchsia-950/70 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-semibold inline-flex items-center gap-1">
                                        <Gamepad2 className="w-3 h-3 text-fuchsia-400" />
                                        <span>{file.category}</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                                        {file.category}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">{file.drive}</td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                                    {formatSize(file.sizeMB)}
                                  </td>
                                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{file.lastModified}</td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleInspectSingleFile(file.path)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/30 hover:text-violet-300 text-slate-300 transition"
                                        title="ตรวจสอบไฟล์นี้เชิงลึก (Inspect File Details & Lock Status)"
                                      >
                                        <Search className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenFolder(file.path)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                        title="เปิดโฟลเดอร์ใน Windows Explorer"
                                      >
                                        <FolderOpen className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleCopy(file.path, file.id)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                        title="คัดลอกตำแหน่งไฟล์"
                                      >
                                        {copiedId === file.id ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleMoveFile(file)}
                                        disabled={isMovingFile}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 hover:text-sky-300 text-slate-300 transition"
                                        title="ย้ายไฟล์ไปยังโฟลเดอร์อื่น (Move File)"
                                      >
                                        <FolderInput className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const parent = file.path.substring(0, file.path.lastIndexOf('\\'));
                                          setOrganizerDirectSourceDir(parent);
                                          setActiveTab('organizer');
                                          mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-200 border border-indigo-500/20 transition"
                                        title="จัดระเบียบโฟลเดอร์นี้ (File Organizer)"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirmModal({ file })}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 hover:text-rose-300 text-slate-300 transition"
                                        title="ลบไฟล์นี้ (Delete File)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{group.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                              {formatSize(group.sizeEachMB)} / ไฟล์
                            </span>
                            <span className="text-xs text-slate-400">({group.copies?.length} สำเนา)</span>
                          </div>
                          <button
                            onClick={() => handleDeleteAllDuplicatesExceptFirst(group)}
                            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 flex items-center gap-1.5 font-semibold transition"
                            title="ลบสำเนาซ้ำทั้งหมดออก โดยจะคงไฟล์แรก (ต้นฉบับ) ไว้เสมอ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบสำเนาทั้งหมด (เหลือไฟล์แรกไว้)</span>
                          </button>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          {group.copies?.map((copy: any, cIdx: number) => (
                            <div
                              key={cIdx}
                              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate flex-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${cIdx === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                                  {cIdx === 0 ? 'ต้นฉบับ' : `สำเนา #${cIdx}`}
                                </span>
                                <div className="font-mono text-slate-300 truncate" title={copy.path}>
                                  {copy.path}
                                </div>
                                {copy.moved && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 shrink-0">
                                    ย้ายแล้ว
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-slate-500 font-mono text-[11px] mr-1">{copy.date}</span>
                                <button
                                  onClick={() => handleOpenFolder(copy.path)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title="เปิดใน Explorer"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCopy(copy.path, `${group.id}_${cIdx}`)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title="คัดลอกตำแหน่งไฟล์"
                                >
                                  {copiedId === `${group.id}_${cIdx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleMoveFile({ path: copy.path, name: group.name, sizeMB: group.sizeEachMB })}
                                  disabled={isMovingFile}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 hover:text-sky-300 text-slate-300 transition"
                                  title="ย้ายสำเนานี้ (Move File)"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const parent = copy.path.substring(0, copy.path.lastIndexOf('\\'));
                                    setOrganizerDirectSourceDir(parent);
                                    setActiveTab('organizer');
                                    mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-200 border border-indigo-500/20 transition"
                                  title="จัดระเบียบโฟลเดอร์นี้ (File Organizer)"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmModal({
                                    file: { path: copy.path, name: group.name, sizeMB: group.sizeEachMB },
                                    isDuplicateCopy: true,
                                    groupId: group.id
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 hover:text-rose-300 text-slate-300 transition"
                                  title="ลบสำเนานี้ (Delete Copy)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Sub-tab 3: Game Libraries (เข้าถึงพวกไฟล์เกมและคลังเกม) */}
              {storageSubTab === 'games' && (
                <div className="space-y-4">
                  {/* Summary & Overview Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-fuchsia-950/40 via-purple-950/30 to-slate-900 border border-fuchsia-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-600/30">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-white">คลังเกมในเครื่อง (Detected Game Libraries)</h2>
                          <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[11px] font-bold border border-fuchsia-500/30">
                            {gameLibrariesData?.gameCount || 0} เกม
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ตรวจจับเกมจริงจาก Steam, Riot Games (VALORANT), GRYPHLINK (Arknights Endfield), Roblox และ Epic Games
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">พื้นที่ติดตั้งเกมรวม</div>
                        <div className="text-lg font-bold font-mono text-fuchsia-400">
                          {gameLibrariesData?.totalGamesSizeGB || 0} GB
                        </div>
                      </div>
                      <button
                        onClick={handleScanGames}
                        disabled={isScanningGames}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold shadow-lg shadow-fuchsia-600/25 transition shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScanningGames ? 'animate-spin' : ''}`} />
                        <span>{isScanningGames ? 'กำลังสแกน...' : 'รีเฟรชคลังเกม'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Games Cards Grid */}
                  {!gameLibrariesData || !gameLibrariesData.games || gameLibrariesData.games.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                      <Gamepad2 className="w-10 h-10 text-fuchsia-400 mx-auto" />
                      <div className="text-sm font-semibold text-white">ยังไม่มีข้อมูลคลังเกม</div>
                      <p className="text-xs text-slate-400">กดปุ่มด้านล่างเพื่อสแกนค้นหาเกมและไฟล์ขนาดใหญ่ในเครื่องคอมพิวเตอร์ของคุณ</p>
                      <button
                        onClick={handleScanGames}
                        disabled={isScanningGames}
                        className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold shadow-md transition"
                      >
                        {isScanningGames ? 'กำลังสแกน...' : 'เริ่มสแกนคลังเกมทันที'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {gameLibrariesData.games.map((game: any) => {
                        const launcherColor =
                          game.launcher === 'Steam'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            : game.launcher === 'Riot Games'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : game.launcher === 'Gryphline'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : game.launcher === 'Roblox'
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

                        return (
                          <div
                            key={game.id}
                            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-fuchsia-500/40 transition space-y-3 shadow-lg flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-white text-sm" title={game.name}>
                                    {game.name}
                                  </h3>
                                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${launcherColor}`}>
                                    {game.launcher}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono font-bold text-base text-amber-400">
                                    {game.sizeGB} GB
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ({game.fileCount?.toLocaleString()} ไฟล์)
                                  </div>
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 truncate" title={game.installPath}>
                                📁 {game.installPath}
                              </div>

                              {game.largestFile && game.largestFile.name && (
                                <div className="text-[11px] bg-fuchsia-950/30 border border-fuchsia-500/20 p-2 rounded-lg space-y-0.5">
                                  <div className="text-[10px] text-fuchsia-300 font-semibold flex items-center justify-between">
                                    <span>ไฟล์ใหญ่สุดในเกม:</span>
                                    <span className="font-mono font-bold text-amber-300">
                                      {formatSize(game.largestFile.sizeMB)}
                                    </span>
                                  </div>
                                  <div className="text-slate-300 font-mono truncate text-[10px]" title={game.largestFile.path}>
                                    {game.largestFile.name}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Game Action Buttons */}
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
                              <button
                                onClick={() => handleOpenFolder(game.installPath)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                                title="เปิดโฟลเดอร์เกมใน Windows Explorer"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span>เปิดโฟลเดอร์</span>
                              </button>
                              <button
                                onClick={() => handleCopy(game.installPath, game.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                title="คัดลอกตำแหน่งพาธเกม"
                              >
                                {copiedId === game.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setStorageSearch(game.name);
                                  setSelectedStorageCategory('all');
                                  setStorageSubTab('heavy');
                                }}
                                className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-200 border border-fuchsia-500/30 text-xs font-semibold transition"
                                title="กรองดูเฉพาะไฟล์ใหญ่ของเกมนี้ในตาราง"
                              >
                                <Search className="w-3.5 h-3.5" />
                                <span>ดูไฟล์เกมนี้</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Top Game Files Table */}
                  {gameLibrariesData?.topGameFiles && gameLibrariesData.topGameFiles.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-fuchsia-400" />
                          <h3 className="font-bold text-white text-sm">
                            ไฟล์เกมขนาดยักษ์ที่กินพื้นที่มากที่สุด (Top Heavy Game Assets)
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          {gameLibrariesData.topGameFiles.length} รายการ
                        </span>
                      </div>

                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4">ชื่อไฟล์เกม (.pak / .starpak / .ucas)</th>
                                <th className="py-3 px-4">เกม</th>
                                <th className="py-3 px-4">ไดรฟ์</th>
                                <th className="py-3 px-4 text-right">ขนาดไฟล์</th>
                                <th className="py-3 px-4 text-center">จัดการ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-xs">
                              {gameLibrariesData.topGameFiles.slice(0, 20).map((gf: any, idx: number) => (
                                <tr key={`top_gf_${idx}`} className="hover:bg-slate-800/30 transition">
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate max-w-md" title={gf.name}>
                                      <Gamepad2 className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                                      <span className="truncate">{gf.name}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-lg" title={gf.path}>
                                      {gf.path}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/20 text-[11px] font-semibold">
                                      {gf.game}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">{gf.drive || 'C:'}</td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                                    {formatSize(gf.sizeMB)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleInspectSingleFile(gf.path)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/30 hover:text-violet-300 text-slate-300 transition"
                                        title="ตรวจสอบไฟล์นี้เชิงลึก"
                                      >
                                        <Search className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenFolder(gf.path)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                        title="เปิดใน Explorer"
                                      >
                                        <FolderOpen className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleCopy(gf.path, `gf_${idx}`)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                        title="คัดลอกตำแหน่งไฟล์"
                                      >
                                        {copiedId === `gf_${idx}` ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 2.5: FILE ORGANIZER (จัดระเบียบไฟล์อัจฉริยะ)
          ================================================================= */}
          {activeTab === 'organizer' && (
            <FileOrganizerView
              initialSourceDir={organizerDirectSourceDir}
              showToast={showToast}
              systemDrives={systemDrives}
            />
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

              {/* Junk Clean Result & Locked-File Warning Banner */}
              {junkCleanResult && (
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    junkCleanResult.failedCount > 0
                      ? 'bg-amber-950/40 border-amber-500/40'
                      : 'bg-emerald-950/40 border-emerald-500/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {junkCleanResult.failedCount > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>
                            {junkCleanResult.failedCount > 0
                              ? `ลบสำเร็จ ${junkCleanResult.cleanedCount} รายการ (ได้พื้นที่คืน ${formatSize(junkCleanResult.reclaimedMB)}) มี ${junkCleanResult.failedCount} ไฟล์ที่ไม่สามารถลบได้`
                              : `ล้างไฟล์ขยะเสร็จสมบูรณ์ 100% (${junkCleanResult.cleanedCount} รายการ, คืนพื้นที่ ${formatSize(junkCleanResult.reclaimedMB)})`}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              junkCleanResult.failedCount > 0
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {junkCleanResult.failedCount > 0 ? 'มีไฟล์ติดล็อก/ใช้งานอยู่' : 'สะอาดหมดจด'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {junkCleanResult.failedCount > 0
                            ? 'สาเหตุ: ไฟล์เหล่านี้กำลังถูกโปรแกรมหรือเซอร์วิสในเครื่องเปิดใช้งานอยู่ (File Locked / In-Use) จึงไม่สามารถลบได้จนกว่าจะปิดโปรแกรมดังกล่าว'
                            : 'ข้อมูลพื้นที่ไดรฟ์และขนาดไฟล์ขยะได้รับการอัปเดตอัตโนมัติแบบ Real-Time เรียบร้อยแล้ว'}
                        </p>
                      </div>
                    </div>

                    {junkCleanResult.failedCount > 0 && junkCleanResult.runningBlockers && junkCleanResult.runningBlockers.length > 0 && (
                      <button
                        onClick={handleKillBlockersAndRetryClean}
                        disabled={isCleaningJunk}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 shrink-0"
                      >
                        <Zap className="w-4 h-4" />
                        <span>ปิดโปรแกรมที่ล็อก ({junkCleanResult.runningBlockers.length} ตัว) แล้วล้างใหม่</span>
                      </button>
                    )}
                  </div>

                  {/* Detected Running Blocker Programs */}
                  {junkCleanResult.failedCount > 0 && junkCleanResult.runningBlockers && junkCleanResult.runningBlockers.length > 0 && (
                    <div className="pt-2 border-t border-amber-500/20">
                      <div className="text-[11px] font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>โปรแกรมที่ตรวจพบว่าเปิดทำงานอยู่และอาจล็อกไฟล์ไว้:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {junkCleanResult.runningBlockers.map((b) => (
                          <div
                            key={b.pid}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-900/40 text-amber-200 border border-amber-500/30 text-xs font-mono"
                          >
                            <span className="font-bold">{b.processName}</span>
                            <span className="text-[10px] text-amber-400">(PID {b.pid})</span>
                            <button
                              onClick={() => handleKillProcess(b.pid, b.processName)}
                              className="px-1.5 py-0.5 rounded bg-rose-600/40 hover:bg-rose-600 text-white text-[10px] transition"
                            >
                              ปิดโปรเซส
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Locked Files Expandable List */}
                  {junkCleanResult.failedCount > 0 && junkCleanResult.lockedFiles && junkCleanResult.lockedFiles.length > 0 && (
                    <details className="text-xs text-amber-300/80 cursor-pointer pt-1">
                      <summary className="hover:text-amber-200 font-medium select-none flex items-center gap-1">
                        <span>ดูรายละเอียดไฟล์ที่ติดล็อก ({junkCleanResult.lockedFiles.length} รายการแรก)</span>
                      </summary>
                      <div className="mt-2 space-y-1 pl-2 font-mono text-[11px] max-h-36 overflow-y-auto bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        {junkCleanResult.lockedFiles.map((f, idx) => (
                          <div key={idx} className="truncate text-slate-300">
                            • <span className="text-amber-200 font-bold">{f.name}</span>{' '}
                            <span className="text-rose-400/90 font-sans">({f.reason})</span>
                            <span className="text-slate-500 text-[10px] block truncate">{f.path}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

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
                    พอร์ต, โปรแกรมพื้นหลัง & ตัวตรวจจับข้อขัดแย้ง
                  </h1>
                  <p className="text-sm text-slate-400">
                    ตรวจสอบโปรแกรมพื้นหลังทั้งหมด (ย่อดรอปดาวน์), เช็คโปรแกรมขัดการทำงาน/ชนกัน, เช็คพอร์ต & Service (เช่น vgc) และตัวปลดล็อกการถอนการติดตั้ง
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      (window as any).electronAPI?.scanActivePorts?.().then((p: any) => p && setPorts(p));
                      (window as any).electronAPI?.getWindowsServices?.().then((s: any) => s && setWindowsServices(s));
                      handleScanBackground();
                      handleScanConflicts();
                      showToast('รีเฟรชสำเร็จ', 'อัปเดตข้อมูลพอร์ต, โปรแกรมพื้นหลัง และข้อขัดแย้งล่าสุดแล้ว', 'info');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningBackground || isScanningConflicts ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>รีเฟรชทั้งหมด</span>
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
                  <span>เช็ค Service & Port (เช่น vgc)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                    {windowsServices.length}
                  </span>
                </button>

                <button
                  onClick={() => setPortSubTab('background')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    portSubTab === 'background'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>โปรแกรมพื้นหลังทั้งหมด (ย่อดรอปดาวน์)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                    {backgroundProcs.length}
                  </span>
                </button>

                <button
                  onClick={() => setPortSubTab('conflicts')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    portSubTab === 'conflicts'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ตรวจจับโปรแกรมขัดการทำงาน</span>
                  {conflicts.length > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[11px] font-bold animate-pulse">
                      {conflicts.length}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[11px]">
                      0
                    </span>
                  )}
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
                  <span>ตัวปลดล็อกถอนการติดตั้ง</span>
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

                  {/* View Mode Toggle & Collapse Controls (ให้ย่อพวกไฟล์ไว้ก่อน) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">มุมมองแสดงผล:</span>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                        <button
                          onClick={() => setPortViewMode('grouped_by_file')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                            portViewMode === 'grouped_by_file'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>📂 จัดกลุ่มตามไฟล์โปรแกรม (ย่อไว้ก่อน)</span>
                        </button>
                        <button
                          onClick={() => setPortViewMode('flat')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                            portViewMode === 'flat'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Filter className="w-3.5 h-3.5" />
                          <span>📋 รายการตารางพอร์ตทั้งหมด</span>
                        </button>
                      </div>
                    </div>

                    {portViewMode === 'grouped_by_file' && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">
                          ({groupedPortsByFile.length} กลุ่มโปรแกรมไฟล์)
                        </span>
                        <button
                          onClick={() => setExpandedPortFiles({})}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                          title="ย่อไฟล์ทั้งหมดเข้าด้วยกัน (Collapse All)"
                        >
                          ย่อไฟล์ทั้งหมด
                        </button>
                        <button
                          onClick={() => {
                            const all: any = {};
                            groupedPortsByFile.forEach((g) => (all[g.key] = true));
                            setExpandedPortFiles(all);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                          title="ขยายทุกไฟล์เพื่อดูรายละเอียดพอร์ต (Expand All)"
                        >
                          ขยายไฟล์ทั้งหมด
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mode 1: Grouped by File View (ย่อพวกไฟล์ไว้ก่อนตามค่าเริ่มต้น) */}
                  {portViewMode === 'grouped_by_file' && (
                    <div className="space-y-2.5">
                      {groupedPortsByFile.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                          ไม่พบพอร์ตตามเงื่อนไขที่เลือก
                        </div>
                      ) : (
                        groupedPortsByFile.map((group) => {
                          const isExpanded = !!expandedPortFiles[group.key];
                          return (
                            <div
                              key={group.key}
                              className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden transition-all"
                            >
                              {/* File Accordion Header - COLLAPSED BY DEFAULT (ย่อไว้ก่อน) */}
                              <div
                                onClick={() =>
                                  setExpandedPortFiles((prev) => ({
                                    ...prev,
                                    [group.key]: !prev[group.key]
                                  }))
                                }
                                className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40 select-none transition"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="text-slate-400 shrink-0">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-indigo-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-500" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-white text-sm font-mono">
                                        {group.processName}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                        PID: {group.pid}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                                        {group.ports.length} พอร์ตเปิดใช้งาน
                                      </span>
                                      {group.devPortsCount > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                          Dev Port ({group.devPortsCount})
                                        </span>
                                      )}
                                      {group.serviceName && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono border border-violet-500/30">
                                          Service: {group.serviceName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-xl" title={group.exePath}>
                                      {group.exePath || '<ไม่มีพาธระบุ / โปรเซสของระบบ>'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {group.exePath && (
                                    <button
                                      onClick={() => handleOpenFolder(group.exePath)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                      title="เปิดโฟลเดอร์ใน Windows Explorer"
                                    >
                                      <FolderOpen className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleKillProcess(group.pid, group.processName)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-[11px] transition"
                                    title="ปิดโปรเซสนี้ทันทีเพื่อคืนพอร์ต"
                                  >
                                    Kill PID
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Ports Table for this file */}
                              {isExpanded && (
                                <div className="border-t border-slate-800/80 bg-slate-950/70 p-3">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-800/60 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                          <th className="py-2 px-3">พอร์ต & โปรโตคอล</th>
                                          <th className="py-2 px-3">ที่อยู่ (Local Address)</th>
                                          <th className="py-2 px-3">คำอธิบาย</th>
                                          <th className="py-2 px-3 text-center">จัดการ</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/40">
                                        {group.ports.map((item) => (
                                          <tr key={item.id} className="hover:bg-slate-800/20 transition">
                                            <td className="py-2 px-3">
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-sm text-indigo-400">
                                                  {item.port}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                                  {item.protocol}
                                                </span>
                                                {item.isDevPort && (
                                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    Dev Port
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-2 px-3 font-mono text-slate-300">{item.localAddress}</td>
                                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                                              {item.description || item.serviceDisplayName || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  onClick={() => handleCopy(item.port.toString(), item.id)}
                                                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                  title="คัดลอกหมายเลขพอร์ต"
                                                >
                                                  {copiedId === item.id ? (
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                  ) : (
                                                    <Copy className="w-3 h-3" />
                                                  )}
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Mode 2: Flat Ports Table View */}
                  {portViewMode === 'flat' && (
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
                  )}
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
                  SUB-TAB 4.3: ALL BACKGROUND PROCESSES (โปรแกรมพื้นหลังทั้งหมด - ย่อดรอปดาวน์)
              ============================================================= */}
              {portSubTab === 'background' && (
                <div className="space-y-4">
                  {/* Top Control Bar with Dropdown selector, search, sort, and collapse toggles */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          <span>โปรแกรมและโปรเซสที่ทำงานอยู่เบื้องหลังทั้งหมด ({backgroundProcs.length} โปรเซส)</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          แสดงโปรแกรมเบื้องหลังที่ไม่มีหน้าต่าง แยกหมวดหมู่แอปผู้ใช้ เซอร์วิส และโปรเซสระบบ สามารถย่อขยายแบบดรอปดาวน์ได้
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Quick Accordion Toggle Buttons */}
                        <button
                          onClick={() => {
                            setExpandedBgGroups({
                              user_app: false,
                              service: false,
                              windows_app: false,
                              system: false,
                              other: false
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                        >
                          ย่อทั้งหมด (Collapse All)
                        </button>
                        <button
                          onClick={() => {
                            setExpandedBgGroups({
                              user_app: true,
                              service: true,
                              windows_app: true,
                              system: true,
                              other: true
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                        >
                          ขยายทั้งหมด (Expand All)
                        </button>
                        <button
                          onClick={handleScanBackground}
                          disabled={isScanningBackground}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isScanningBackground ? 'animate-spin' : ''}`} />
                          <span>รีเฟรชโปรเซส</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={backgroundSearch}
                          onChange={(e) => setBackgroundSearch(e.target.value)}
                          placeholder="ค้นหาชื่อโปรแกรม, PID, หรือพาธ..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Category Dropdown ("ย่อดรอปดาวน์เอา") */}
                      <div className="relative">
                        <select
                          value={backgroundCategoryFilter}
                          onChange={(e) => setBackgroundCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="all">📂 หมวดหมู่: แสดงทั้งหมด ({backgroundProcs.length} โปรเซส)</option>
                          <option value="user_app">👤 แอปผู้ใช้เบื้องหลัง ({backgroundProcs.filter((p) => p.category === 'user_app').length} โปรเซส)</option>
                          <option value="service">⚙️ เซอร์วิสของ Windows ({backgroundProcs.filter((p) => p.category === 'service').length} โปรเซส)</option>
                          <option value="windows_app">🪟 แอปเสริมของ Windows ({backgroundProcs.filter((p) => p.category === 'windows_app').length} โปรเซส)</option>
                          <option value="system">🛡️ โปรเซสแกนหลักระบบ ({backgroundProcs.filter((p) => p.category === 'system').length} โปรเซส)</option>
                          <option value="other">📦 อื่นๆ ({backgroundProcs.filter((p) => p.category === 'other').length} โปรเซส)</option>
                        </select>
                      </div>

                      {/* Sort Dropdown */}
                      <div className="relative">
                        <select
                          value={backgroundSortBy}
                          onChange={(e) => setBackgroundSortBy(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="ram">⚡ เรียงตาม: แรมที่ใช้ (มากไปน้อย)</option>
                          <option value="name">🔤 เรียงตาม: ชื่อโปรเซส (A-Z)</option>
                          <option value="pid">🔢 เรียงตาม: หมายเลข PID</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Accordion / Dropdown Group Sections ("ย่อดรอปดาวน์เอา") */}
                  <div className="space-y-3">
                    {[
                      {
                        key: 'user_app',
                        title: '1. แอปผู้ใช้และโปรแกรมบุคคลที่สาม (User Background Apps)',
                        desc: 'โปรแกรมที่ติดตั้งเพิ่มและทำงานอยู่เบื้องหลัง เช่น Discord, Steam, Spotify, Riot, เบราว์เซอร์ helper',
                        badge: 'แอปผู้ใช้',
                        badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
                        headerBg: 'from-slate-900 via-indigo-950/20 to-slate-900',
                        items: groupedBackgroundProcs.user_app
                      },
                      {
                        key: 'service',
                        title: '2. เซอร์วิสของ Windows และโฮสต์บริการ (Windows Services & Host Workers)',
                        desc: 'กระบวนการ Service เบื้องหลังของระบบปฏิบัติการและ svchost.exe',
                        badge: 'Service',
                        badgeColor: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
                        headerBg: 'from-slate-900 via-violet-950/20 to-slate-900',
                        items: groupedBackgroundProcs.service
                      },
                      {
                        key: 'windows_app',
                        title: '3. แอปเสริมของระบบ Windows (Windows Background Apps)',
                        desc: 'โปรเซสเสริมของระบบ Windows เช่น SearchHost, StartMenu, Widgets',
                        badge: 'Windows App',
                        badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
                        headerBg: 'from-slate-900 via-sky-950/20 to-slate-900',
                        items: groupedBackgroundProcs.windows_app
                      },
                      {
                        key: 'system',
                        title: '4. โปรเซสแกนหลักระบบ (Windows System Core)',
                        desc: 'งานระดับแกนกลางของ Windows OS เช่น csrss, lsass, services, wininit (ไม่แนะนำให้ปิด)',
                        badge: 'Core System',
                        badgeColor: 'border-slate-600/30 bg-slate-800 text-slate-300',
                        headerBg: 'from-slate-900 to-slate-950',
                        items: groupedBackgroundProcs.system
                      },
                      {
                        key: 'other',
                        title: '5. งานและโปรเซสเบื้องหลังอื่นๆ (Other Background Tasks)',
                        desc: 'โปรเซสพื้นหลังทั่วไปอื่นๆ ที่กำลังทำงานอยู่',
                        badge: 'General',
                        badgeColor: 'border-slate-700 bg-slate-800/60 text-slate-400',
                        headerBg: 'from-slate-900 to-slate-950',
                        items: groupedBackgroundProcs.other
                      }
                    ]
                      .filter((group) => {
                        if (backgroundCategoryFilter !== 'all') {
                          return group.key === backgroundCategoryFilter;
                        }
                        return group.items.length > 0;
                      })
                      .map((group) => {
                        const isExpanded = !!expandedBgGroups[group.key];
                        const totalMemMB = group.items.reduce((acc: number, p: any) => acc + (p.memoryMB || 0), 0);
                        return (
                          <div
                            key={group.key}
                            className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden transition-all"
                          >
                            {/* Accordion Header (Click to collapse / expand dropdown) */}
                            <button
                              onClick={() => {
                                setExpandedBgGroups((prev) => ({
                                  ...prev,
                                  [group.key]: !prev[group.key]
                                }));
                              }}
                              className={`w-full p-4 bg-gradient-to-r ${group.headerBg} flex items-center justify-between text-left hover:bg-slate-800/40 transition select-none`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1 rounded-lg bg-slate-800 text-slate-300">
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-white">{group.title}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${group.badgeColor}`}>
                                      {group.badge}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5 truncate">{group.desc}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-2">
                                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                  {formatSize(totalMemMB)}
                                </span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                  {group.items.length} รายการ
                                </span>
                              </div>
                            </button>

                            {/* Accordion Content */}
                            {isExpanded && (
                              <div className="divide-y divide-slate-800/60 border-t border-slate-800/80">
                                {group.items.length === 0 ? (
                                  <div className="p-6 text-center text-xs text-slate-500">
                                    ไม่พบโปรเซสในหมวดหมู่นี้
                                  </div>
                                ) : (
                                  group.items.map((proc: any) => (
                                    <div
                                      key={proc.id}
                                      className="p-3.5 pl-6 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/30 transition text-xs"
                                    >
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-sm text-white font-mono">{proc.processName}</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                            PID: {proc.pid}
                                          </span>
                                          {proc.serviceName && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono border border-violet-500/30">
                                              Service: {proc.serviceName}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-xl">
                                          {proc.path || '<ไม่มีพาธระบุ / ระบบจำกัดสิทธิ์>'}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          {proc.company} • {proc.description}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                          <div className="font-mono font-bold text-xs text-amber-400">
                                            {formatSize(proc.memoryMB)}
                                          </div>
                                          <div className="text-[10px] text-slate-500">หน่วยความจำ</div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => handleCopy(proc.pid.toString(), proc.id)}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                            title="คัดลอก PID"
                                          >
                                            {copiedId === proc.id ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                          {proc.path && (
                                            <button
                                              onClick={() => handleOpenFolder(proc.path)}
                                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                              title="เปิดโฟลเดอร์ใน Explorer"
                                            >
                                              <FolderOpen className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleKillProcess(proc.pid, proc.processName)}
                                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-[11px] transition"
                                            title="ปิดโปรเซสนี้"
                                          >
                                            ปิดโปรเซส
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* =============================================================
                  SUB-TAB 4.4: CONFLICT & COLLISION DETECTOR (เช็คโปรแกรมขัดการทำงานกัน)
              ============================================================= */}
              {portSubTab === 'conflicts' && (
                <div className="space-y-5">
                  {/* Top Header Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-rose-400" />
                        <h3 className="text-base font-bold text-white">
                          ระบบตรวจจับโปรแกรมที่ขัดการทำงานและชนกัน (Conflict & Collision Inspector)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 max-w-2xl">
                        วิเคราะห์ 4 สาเหตุหลัก: พอร์ตชนกัน (Port Collisions), โปรเซสเปิดค้างซ้ำซ้อนแย่งล็อกไฟล์ (Multi-Instance Locks), โปรเซสระดับลึก/Anti-Cheat ที่ขวางการถอนการติดตั้ง, และโปรแกรมเบื้องหลังที่แย่งแรมผิดปกติ
                      </p>
                    </div>

                    <button
                      onClick={handleScanConflicts}
                      disabled={isScanningConflicts}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanningConflicts ? 'animate-spin' : ''}`} />
                      <span>สแกนข้อขัดแย้งใหม่</span>
                    </button>
                  </div>

                  {/* Filter Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <button
                      onClick={() => setConflictFilter('all')}
                      className={`px-3 py-1 rounded-xl font-medium transition ${
                        conflictFilter === 'all'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      ข้อขัดแย้งทั้งหมด ({conflicts.length})
                    </button>
                    <button
                      onClick={() => setConflictFilter('critical')}
                      className={`px-3 py-1 rounded-xl font-medium transition ${
                        conflictFilter === 'critical'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      ระดับร้ายแรง / พอร์ตชน ({conflicts.filter((c) => c.severity === 'critical').length})
                    </button>
                    <button
                      onClick={() => setConflictFilter('warning')}
                      className={`px-3 py-1 rounded-xl font-medium transition ${
                        conflictFilter === 'warning'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      ระดับแจ้งเตือน / โปรเซสค้าง ({conflicts.filter((c) => c.severity === 'warning').length})
                    </button>
                    <button
                      onClick={() => setConflictFilter('info')}
                      className={`px-3 py-1 rounded-xl font-medium transition ${
                        conflictFilter === 'info'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      แย่งแรมสูง ({conflicts.filter((c) => c.severity === 'info').length})
                    </button>
                  </div>

                  {/* Conflict Items List */}
                  {filteredConflicts.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                      <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                      <div className="text-base font-bold text-white">ระบบทำงานราบรื่น ไม่พบข้อขัดแย้ง</div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        ไม่มีพอร์ตชนกัน และไม่พบโปรเซสที่รันค้างแย่งทรัพยากรหรือล็อกระบบในขณะนี้
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredConflicts.map((conflict) => {
                        const isCritical = conflict.severity === 'critical';
                        const isWarning = conflict.severity === 'warning';
                        return (
                          <div
                            key={conflict.id}
                            className={`p-5 rounded-2xl border transition space-y-4 ${
                              isCritical
                                ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/20'
                                : isWarning
                                ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/10'
                                : 'bg-sky-950/20 border-sky-500/30'
                            }`}
                          >
                            {/* Conflict Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                      isCritical
                                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                        : isWarning
                                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                        : 'bg-sky-500/30 text-sky-300 border border-sky-500/40'
                                    }`}
                                  >
                                    {isCritical ? 'ร้ายแรง (Critical Collision)' : isWarning ? 'แจ้งเตือน (Conflict Warning)' : 'ใช้ทรัพยากรสูง'}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                    {conflict.type}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-white pt-1">{conflict.title}</h4>
                                <p className="text-xs text-slate-300">{conflict.description}</p>
                              </div>

                              {conflict.canAutoResolve && (
                                <button
                                  onClick={() => handleResolveConflict(conflict)}
                                  disabled={resolvingConflictId === conflict.id}
                                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 shrink-0"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>
                                    {resolvingConflictId === conflict.id ? 'กำลังปลดล็อก...' : '⚡ ปิดโปรเซสที่ขัดแย้งทันที'}
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Involved Programs */}
                            <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 space-y-2">
                              <div className="text-[11px] font-semibold text-slate-400">
                                โปรแกรมที่เกี่ยวข้องในข้อขัดแย้งนี้ ({conflict.conflictingPrograms?.length || 0} ตัว):
                              </div>
                              <div className="divide-y divide-slate-800/50">
                                {conflict.conflictingPrograms?.map((p: any, idx: number) => (
                                  <div key={idx} className="py-2 flex items-center justify-between gap-3 text-xs">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-white font-mono">{p.processName}</span>
                                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                          PID: {p.pid}
                                        </span>
                                        <span className="text-slate-400 text-[11px] truncate">({p.role})</span>
                                      </div>
                                      {p.path && (
                                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-lg mt-0.5">
                                          {p.path}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-amber-400 font-mono text-xs font-bold">
                                        {formatSize(p.memoryMB)}
                                      </span>
                                      <button
                                        onClick={() => handleKillProcess(p.pid, p.processName)}
                                        className="px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/30 text-[10px] font-semibold transition"
                                      >
                                        Kill
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Suggested Action Note */}
                            <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                              <span className="text-indigo-400 font-bold">คำแนะนำ:</span>
                              <span>{conflict.suggestedAction}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  SUB-TAB 4.5: UNINSTALL BLOCKERS & HIDDEN TASKS
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
                        SysInfo System Inspector: ตรวจสอบพอร์ตเชื่อมต่อ 127.0.0.1:8080 (PID 4920) ใช้งาน RAM 2.45 GB
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

              {/* Setting 3: Proper Windows Uninstall & 1-Click Removal */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                    <h3 className="text-sm font-bold text-white">
                      การถอนการติดตั้งโปรแกรม (Uninstallation)
                    </h3>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                    ✓ ปลดล็อกถอนการติดตั้งทันที ไม่ต้อง Restart
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    ระบบถอนการติดตั้งได้รับการอัปเกรดให้ตัดการทำงานของโปรเซสและเซอร์วิสที่เกี่ยวข้องโดยอัตโนมัติก่อนลบไฟล์ เพื่อป้องกันปัญหาไฟล์ถูกล็อกและ<b>ไม่ต้องรีสตาร์ทเครื่องคอมพิวเตอร์ (No Reboot Required)</b> สามารถเลือกช่องทางถอนการติดตั้งได้ตามสะดวก:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-[11px]">
                      <div className="font-bold text-rose-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>ช่องทางที่ 1 (สะดวกสุด)</span>
                      </div>
                      <p className="text-slate-400">
                        กดปุ่ม <b>"ถอนการติดตั้งทันที"</b> ด้านล่าง โปรแกรมจะปิดตัวและถอนการติดตั้งอัตโนมัติ
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-[11px]">
                      <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>ช่องทางที่ 2 (มาตรฐาน Windows)</span>
                      </div>
                      <p className="text-slate-400">
                        เปิด <b>Add or remove programs</b> ใน Windows Settings แล้วเลือก Uninstall
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-[11px]">
                      <div className="font-bold text-amber-400 flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>ช่องทางที่ 3 (ไฟล์ระบบ)</span>
                      </div>
                      <p className="text-slate-400">
                        รันไฟล์ <b>uninstall.bat</b> ในโฟลเดอร์ติดตั้ง หรือกดช็อตคัตใน Start Menu
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowUninstallModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ถอนการติดตั้งโปรแกรมทันที (1-Click Uninstall)</span>
                  </button>

                  <button
                    onClick={() => (window as any).electronAPI?.openWindowsAddRemove?.()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดหน้า Add or Remove Programs</span>
                  </button>

                  <button
                    onClick={() => (window as any).electronAPI?.openInstallFolder?.()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>เปิดโฟลเดอร์ไฟล์ติดตั้ง</span>
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

      {/* Confirmation Modal for 1-Click Uninstall */}
      {showUninstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการถอนการติดตั้ง</h3>
                <p className="text-xs text-rose-300/80">SysInfo v0.1.2</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
              <p>
                คุณต้องการถอนการติดตั้งโปรแกรม <b>SysInfo (v0.1.2)</b> ออกจากเครื่องคอมพิวเตอร์ใช่หรือไม่?
              </p>
              <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ไม่ต้อง Restart คอมพิวเตอร์ (No Reboot Required):</span>
                </p>
                <p className="text-slate-300">
                  ระบบจะปิดโปรเซสของแอป และเริ่มขั้นตอนถอนการติดตั้งของ Windows ให้โดยอัตโนมัติ ไม่มีการค้างไฟล์หรือบังคับรีสตาร์ทเครื่อง
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isUninstalling}
                onClick={() => setShowUninstallModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                disabled={isUninstalling}
                onClick={handleDirectUninstall}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg shadow-rose-600/30"
              >
                {isUninstalling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังเริ่มการถอนการติดตั้ง...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันถอนการติดตั้ง</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for File Deletion */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการลบไฟล์</h3>
                <p className="text-xs text-slate-400">
                  {deleteConfirmModal.isDuplicateCopy
                    ? 'ลบสำเนาซ้ำรายการนี้ออกจากระบบ'
                    : 'ลบไฟล์ขนาดใหญ่รายการนี้ออกจากระบบเพื่อคืนพื้นที่'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-white truncate max-w-[260px]">
                  {deleteConfirmModal.file.name || deleteConfirmModal.file.path.split(/[\\/]/).pop()}
                </span>
                {deleteConfirmModal.file.sizeMB && (
                  <span className="font-bold text-amber-400 font-mono">
                    {formatSize(deleteConfirmModal.file.sizeMB)}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400 break-all">
                {deleteConfirmModal.file.path}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safeRecycleBin}
                  onChange={(e) => setSafeRecycleBin(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Safe Delete (ย้ายลงถังขยะ Recycle Bin สามารถกู้คืนได้)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                disabled={isDeletingSpecificFile}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleConfirmDeleteFile(!safeRecycleBin)}
                disabled={isDeletingSpecificFile}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isDeletingSpecificFile ? 'animate-spin' : ''}`} />
                <span>
                  {isDeletingSpecificFile
                    ? 'กำลังลบไฟล์...'
                    : safeRecycleBin
                    ? 'ย้ายลงถังขยะ'
                    : 'ลบถาวรทันที'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Deep File Inspection Modal (รายละเอียดและการล็อกไฟล์เชิงลึก) */}
      {fileInspectDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-violet-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ข้อมูลเชิงลึกและการตรวจสอบไฟล์</h3>
                  <p className="text-xs text-slate-400">Deep File Inspection Report & Process Locks</p>
                </div>
              </div>
              <button
                onClick={() => setFileInspectDetailModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">ชื่อไฟล์ & ตำแหน่ง (File Path):</div>
                <div className="font-bold text-white break-all">{fileInspectDetailModal.name}</div>
                <div className="font-mono text-[11px] text-slate-400 break-all select-all">{fileInspectDetailModal.path}</div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-500">ขนาดไฟล์จริง:</div>
                  <div className="font-mono font-bold text-sm text-amber-400 mt-0.5">
                    {fileInspectDetailModal.formattedSize || formatSize(fileInspectDetailModal.sizeMB || 0)}
                  </div>
                  {fileInspectDetailModal.sizeBytes > 0 && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {fileInspectDetailModal.sizeBytes.toLocaleString()} Bytes
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-500">หมวดหมู่ไฟล์:</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{fileInspectDetailModal.category || 'ไฟล์ทั่วไป'}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    นามสกุล: {fileInspectDetailModal.extension || '-'} (ไดรฟ์ {fileInspectDetailModal.drive})
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500">วันที่สร้างและแก้ไขล่าสุด:</div>
                <div className="text-slate-300">แก้ไขล่าสุด: <span className="font-mono">{fileInspectDetailModal.lastModified || '-'}</span></div>
                {fileInspectDetailModal.createdDate && (
                  <div className="text-slate-400 text-[11px]">วันที่สร้างไฟล์: <span className="font-mono">{fileInspectDetailModal.createdDate}</span></div>
                )}
              </div>

              {/* Status & Locks */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                fileInspectDetailModal.isLocked
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : !fileInspectDetailModal.exists
                  ? 'bg-rose-950/30 border-rose-500/40'
                  : 'bg-emerald-950/20 border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    {fileInspectDetailModal.isLocked ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : !fileInspectDetailModal.exists ? (
                      <X className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className={fileInspectDetailModal.isLocked ? 'text-amber-300' : !fileInspectDetailModal.exists ? 'text-rose-300' : 'text-emerald-300'}>
                      {fileInspectDetailModal.statusText || (fileInspectDetailModal.isLocked ? 'ไฟล์ถูกล็อกใช้งานอยู่' : 'ไฟล์ปกติ พร้อมจัดการ')}
                    </span>
                  </span>
                </div>

                {fileInspectDetailModal.lockedBy && fileInspectDetailModal.lockedBy.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-300">
                      โปรเซสที่กำลังเปิดใช้งาน/ล็อกไฟล์นี้อยู่ ({fileInspectDetailModal.lockedBy.length} โปรเซส):
                    </div>
                    {fileInspectDetailModal.lockedBy.map((p: any, pIdx: number) => (
                      <div key={pIdx} className="p-2 rounded-lg bg-slate-900 flex items-center justify-between text-xs">
                        <span className="font-mono text-white font-bold">{p.processName} (PID: {p.pid})</span>
                        <button
                          onClick={() => handleKillProcess(p.pid, p.processName)}
                          className="px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600/60 text-rose-200 border border-rose-500/30 text-[10px]"
                        >
                          Kill PID
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenFolder(fileInspectDetailModal.path)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>เปิดโฟลเดอร์</span>
                </button>
                <button
                  onClick={() => handleCopy(fileInspectDetailModal.path, 'inspect_modal')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกพาธ</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {fileInspectDetailModal.exists && (
                  <>
                    <button
                      onClick={() => {
                        handleMoveFile(fileInspectDetailModal);
                        setFileInspectDetailModal(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      <span>ย้ายไฟล์</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmModal({ file: fileInspectDetailModal });
                        setFileInspectDetailModal(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบไฟล์</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setFileInspectDetailModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
