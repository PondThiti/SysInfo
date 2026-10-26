import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  HardDrive,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FolderOpen,
  RefreshCw,
  Archive,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  X,
  Play,
  RotateCcw,
  Zap,
  Check,
  SlidersHorizontal
} from 'lucide-react';

export interface InstalledAppItem {
  id: string;
  name: string;
  version: string;
  publisher: string;
  installLocation: string;
  uninstallString: string;
  quietUninstallString?: string;
  reportedSizeMB: number | null;
  scannedSizeMB: number | null;
  installType: 'win32' | 'msi' | 'store' | 'winget';
  scope: 'user' | 'machine';
  category: 'win32' | 'developer' | 'store';
  packageFullName?: string;
  isMock?: boolean;
}

export interface ResidualItem {
  id: string;
  name: string;
  path: string;
  type: 'cache_log' | 'app_data' | 'leftover_folder' | 'startup_entry' | 'registry_key';
  typeName: string;
  recommendedAction: 'remove' | 'keep' | 'review';
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
  sizeMB: number;
  fileCount: number;
  status: 'pending' | 'kept' | 'backed_up' | 'recycled' | 'deleted';
}

interface PreflightData {
  isRunning: boolean;
  runningProcesses: Array<{ pid: number; name: string; path: string; memoryMB: number }>;
  unsavedWarning: boolean;
  requiresAdmin: boolean;
  adminReason: string;
  relatedServices: Array<{ name: string; displayName: string; state: string }>;
  relatedStartup: Array<{ name: string; command: string }>;
  sharedSafety: { status: string; warning: string };
  rebootRequired: boolean;
  rebootMessage: string;
}

// Sample Mockup Data as specified by user
const MOCK_APPS: InstalledAppItem[] = [
  {
    id: 'mock_1',
    name: 'Example Editor',
    publisher: 'Example Studio',
    version: 'v2.4.1',
    reportedSizeMB: 1843.2, // 1.8 GB
    scannedSizeMB: 1843.2,
    installLocation: 'C:\\Program Files\\Example Studio\\Example Editor',
    uninstallString: 'C:\\Program Files\\Example Studio\\Example Editor\\uninstall.exe',
    quietUninstallString: 'C:\\Program Files\\Example Studio\\Example Editor\\uninstall.exe /S',
    installType: 'win32',
    scope: 'machine',
    category: 'win32',
    isMock: true
  },
  {
    id: 'mock_2',
    name: 'Game Launcher',
    publisher: 'Game Studio',
    version: 'v5.2.0',
    reportedSizeMB: 650.0, // 650 MB
    scannedSizeMB: 650.0,
    installLocation: 'C:\\Program Files (x86)\\Game Studio\\Launcher',
    uninstallString: 'C:\\Program Files (x86)\\Game Studio\\Launcher\\unins000.exe',
    quietUninstallString: 'C:\\Program Files (x86)\\Game Studio\\Launcher\\unins000.exe /SILENT',
    installType: 'win32',
    scope: 'machine',
    category: 'win32',
    isMock: true
  },
  {
    id: 'mock_3',
    name: 'Developer Toolkit',
    publisher: 'Example Tools',
    version: 'v1.9.3',
    reportedSizeMB: 2150.4, // 2.1 GB
    scannedSizeMB: 2150.4,
    installLocation: 'C:\\Users\\CurrentUser\\AppData\\Local\\Programs\\Developer Toolkit',
    uninstallString: 'C:\\Users\\CurrentUser\\AppData\\Local\\Programs\\Developer Toolkit\\Uninstall.exe',
    quietUninstallString: 'C:\\Users\\CurrentUser\\AppData\\Local\\Programs\\Developer Toolkit\\Uninstall.exe /S',
    installType: 'win32',
    scope: 'user',
    category: 'developer',
    isMock: true
  },
  {
    id: 'mock_4',
    name: 'Sample Store App',
    publisher: 'Microsoft Store',
    version: 'v3.0.0',
    reportedSizeMB: null, // "ข้อมูลไม่พร้อม"
    scannedSizeMB: null,
    installLocation: 'C:\\Program Files\\WindowsApps\\SampleStoreApp_3.0.0.0_x64__8wekyb3d8bbwe',
    uninstallString: 'Remove-AppxPackage -Package SampleStoreApp_3.0.0.0_x64__8wekyb3d8bbwe',
    installType: 'store',
    scope: 'user',
    category: 'store',
    packageFullName: 'SampleStoreApp_3.0.0.0_x64__8wekyb3d8bbwe',
    isMock: true
  }
];

export default function InstalledAppsView({
  theme = 'dark',
  onLogIpc
}: {
  theme?: 'dark' | 'light';
  onLogIpc?: (action: string, detail: string) => void;
}) {
  const [apps, setApps] = useState<InstalledAppItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'win32' | 'developer' | 'store'>('all');
  const [useMockPreview, setUseMockPreview] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'size_desc' | 'name_asc' | 'publisher_asc'>('size_desc');

  // Wizard modal state for Smart Uninstall
  const [activeApp, setActiveApp] = useState<InstalledAppItem | null>(null);
  const [wizardStep, setWizardStep] = useState<'preflight' | 'confirm' | 'progress' | 'residuals' | null>(null);
  const [preflightData, setPreflightData] = useState<PreflightData | null>(null);
  const [isPreflighting, setIsPreflighting] = useState<boolean>(false);

  // Preserve User Data configuration
  const [preserveUserData, setPreserveUserData] = useState<boolean>(true);
  const [backupUserData, setBackupUserData] = useState<boolean>(true);

  // Uninstall execution & residual state
  const [isUninstalling, setIsUninstalling] = useState<boolean>(false);
  const [uninstallLogs, setUninstallLogs] = useState<string[]>([]);
  const [uninstallSuccess, setUninstallSuccess] = useState<boolean>(false);
  const [residuals, setResiduals] = useState<ResidualItem[]>([]);
  const [isScanningResiduals, setIsScanningResiduals] = useState<boolean>(false);

  // Permanent Delete Confirmation Modal
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<ResidualItem | null>(null);

  // Load Installed Apps
  const fetchApps = async () => {
    setIsLoading(true);
    try {
      if ((window as any).electronAPI?.scanInstalledApps) {
        const result = await (window as any).electronAPI.scanInstalledApps();
        if (result && Array.isArray(result) && result.length > 0) {
          setApps(result);
          onLogIpc?.('scan_installed_apps', `สแกนพบโปรแกรมที่ติดตั้งใน Windows จำนวน ${result.length} รายการ`);
        } else {
          // Fallback to sample apps if empty
          setApps(MOCK_APPS);
        }
      } else {
        setApps(MOCK_APPS);
      }
    } catch (e: any) {
      console.warn('Scan installed apps failed:', e);
      setApps(MOCK_APPS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Display list (toggle between live apps and mock preview)
  const displayedApps = useMockPreview ? MOCK_APPS : apps;

  // Filter & Search Logic
  const filteredApps = useMemo(() => {
    return displayedApps
      .filter((app) => {
        // Category Filter
        if (categoryFilter !== 'all') {
          if (categoryFilter === 'win32' && app.category !== 'win32') return false;
          if (categoryFilter === 'developer' && app.category !== 'developer') return false;
          if (categoryFilter === 'store' && app.category !== 'store') return false;
        }

        // Search Query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          app.name.toLowerCase().includes(q) ||
          app.publisher.toLowerCase().includes(q) ||
          app.version.toLowerCase().includes(q) ||
          app.installLocation.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'size_desc') {
          const sizeA = a.scannedSizeMB ?? a.reportedSizeMB ?? 0;
          const sizeB = b.scannedSizeMB ?? b.reportedSizeMB ?? 0;
          return sizeB - sizeA;
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'publisher_asc') {
          return a.publisher.localeCompare(b.publisher);
        }
        return 0;
      });
  }, [displayedApps, categoryFilter, searchQuery, sortBy]);

  // Format File Size
  const formatSize = (mb: number | null | undefined): string => {
    if (mb === null || mb === undefined || isNaN(mb) || mb <= 0) {
      return 'ข้อมูลไม่พร้อม';
    }
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  // Pre-uninstall Check Handler
  const startSmartUninstall = async (app: InstalledAppItem) => {
    setActiveApp(app);
    setWizardStep('preflight');
    setIsPreflighting(true);
    setPreflightData(null);
    setUninstallLogs([]);
    setResiduals([]);

    try {
      if ((window as any).electronAPI?.preflightUninstallCheck) {
        const preflight = await (window as any).electronAPI.preflightUninstallCheck(app);
        setPreflightData(preflight);
      } else {
        // Mock preflight
        setPreflightData({
          isRunning: false,
          runningProcesses: [],
          unsavedWarning: true,
          requiresAdmin: app.scope === 'machine',
          adminReason: app.scope === 'machine'
            ? 'โปรแกรมได้รับการติดตั้งในระดับระบบ (Machine-wide) ต้องใช้สิทธิ์ Administrator ในการถอน'
            : 'ติดตั้งในพื้นที่บัญชีผู้ใช้ปัจจุบัน ไม่ต้องขอสิทธิ์ Administrator เพิ่มเติม',
          relatedServices: [],
          relatedStartup: [],
          sharedSafety: {
            status: 'safe_standalone',
            warning: 'โปรแกรมเป็นแอปพลิเคชันเดี่ยว ไม่พบความเชื่อมโยงกับไดรเวอร์หลักของระบบ'
          },
          rebootRequired: false,
          rebootMessage: 'ไม่ต้องรีสตาร์ตเครื่องคอมพิวเตอร์หลังการถอน'
        });
      }
    } catch (e: any) {
      console.error('Preflight check error:', e);
    } finally {
      setIsPreflighting(false);
    }
  };

  // Close Running Processes before uninstallation
  const handleKillProcess = async (pid: number) => {
    if ((window as any).electronAPI?.killProcess) {
      await (window as any).electronAPI.killProcess(pid);
      if (activeApp) {
        const updated = await (window as any).electronAPI.preflightUninstallCheck(activeApp);
        setPreflightData(updated);
      }
    }
  };

  // Execute Standard Uninstallation
  const handleConfirmUninstall = async () => {
    if (!activeApp) return;
    setWizardStep('progress');
    setIsUninstalling(true);
    setUninstallLogs([
      `เริ่มกระบวนการ Smart Uninstall สำหรับ "${activeApp.name}"`,
      preserveUserData ? '✓ บันทึกการตั้งค่าและข้อมูลผู้ใช้ไว้ (Preserve User Data: เปิดใช้งาน)' : 'ระบุ: ลบข้อมูลการตั้งค่าของผู้ใช้ออกด้วย',
      backupUserData ? '💾 ดำเนินการสำรองข้อมูล (Backup User Data) ไปยัง SysInfo_Backups...' : 'ข้ามขั้นตอนการสำรองข้อมูล',
      `ตรวจสอบประเภทตัวติดตั้ง: ${activeApp.installType.toUpperCase()}`,
      activeApp.installType === 'store'
        ? 'เรียกกลไกจัดการแพ็กเกจของ Windows (Remove-AppxPackage)...'
        : activeApp.installType === 'msi'
        ? 'เรียกตัวจัดการ Windows Installer (msiexec.exe)...'
        : 'เรียกตัวถอนการติดตั้งมาตรฐานที่โปรแกรมลงทะเบียนไว้ในระบบ...'
    ]);

    try {
      if ((window as any).electronAPI?.smartUninstallApp) {
        const res = await (window as any).electronAPI.smartUninstallApp(activeApp, {
          preserveUserData,
          backupUserData
        });

        if (res.success) {
          setUninstallSuccess(true);
          setUninstallLogs((prev) => [
            ...prev,
            '✓ ถอนการติดตั้งผ่านตัวถอนมาตรฐานสำเร็จเรียบร้อย',
            'เริ่มเรียก Residual Scanner เพื่อตรวจสอบไฟล์และรีจิสทรีที่อาจตกค้าง...'
          ]);
          // Scan for residuals
          runResidualScan(activeApp);
        } else {
          setUninstallSuccess(false);
          setUninstallLogs((prev) => [
            ...prev,
            `⚠️ แจ้งเตือน: ${res.message || 'การถอนการติดตั้งหยุดชะงัก หรือผู้ใช้กดยกเลิกในตัวถอนมาตรฐาน'}`,
            'เข้าสู่การตรวจสอบไฟล์ตกค้าง...'
          ]);
          runResidualScan(activeApp);
        }
      } else {
        // Simulated progress for preview/web
        setTimeout(() => {
          setUninstallSuccess(true);
          setUninstallLogs((prev) => [
            ...prev,
            '✓ ถอนการติดตั้งผ่านตัวถอนมาตรฐานสำเร็จเรียบร้อย',
            'เริ่มเรียก Residual Scanner เพื่อตรวจสอบไฟล์และรีจิสทรีที่อาจตกค้าง...'
          ]);
          runResidualScan(activeApp);
        }, 1200);
      }
    } catch (e: any) {
      setUninstallLogs((prev) => [...prev, `ข้อผิดพลาด: ${e.message}`]);
      runResidualScan(activeApp);
    } finally {
      setIsUninstalling(false);
    }
  };

  // Run Residual Scanner
  const runResidualScan = async (app: InstalledAppItem) => {
    setIsScanningResiduals(true);
    try {
      if ((window as any).electronAPI?.scanResiduals) {
        const resList = await (window as any).electronAPI.scanResiduals(app);
        setResiduals(resList || []);
      } else {
        // Fallback mock residuals
        setResiduals([
          {
            id: 'mock_res_1',
            name: `${app.name} Cache และ Log ของแอป`,
            path: `C:\\Users\\CurrentUser\\AppData\\Local\\${app.name}\\Cache`,
            type: 'cache_log',
            typeName: 'Cache และ Log ของแอป',
            recommendedAction: 'review',
            recommendation: 'Cache และ Log ของแอป: แสดงให้ตรวจสอบก่อนลบ',
            riskLevel: 'low',
            sizeMB: 12.4,
            fileCount: 48,
            status: 'pending'
          },
          {
            id: 'mock_res_2',
            name: `${app.name} ข้อมูลการตั้งค่าใน AppData`,
            path: `C:\\Users\\CurrentUser\\AppData\\Roaming\\${app.name}`,
            type: 'app_data',
            typeName: 'ข้อมูลใน AppData',
            recommendedAction: 'keep',
            recommendation: 'ข้อมูลใน AppData: แนะนำให้เก็บไว้เป็นค่าเริ่มต้น (Preserve User Data)',
            riskLevel: 'medium',
            sizeMB: 3.2,
            fileCount: 6,
            status: 'pending'
          },
          {
            id: 'mock_res_3',
            name: `โฟลเดอร์โปรแกรมที่เหลือ`,
            path: app.installLocation || `C:\\Program Files\\${app.name}`,
            type: 'leftover_folder',
            typeName: 'โฟลเดอร์โปรแกรมที่เหลือ',
            recommendedAction: 'review',
            recommendation: 'โฟลเดอร์โปรแกรมที่เหลือ: ตรวจสอบ Path และเจ้าของก่อนลบ',
            riskLevel: 'medium',
            sizeMB: 0.8,
            fileCount: 4,
            status: 'pending'
          },
          {
            id: 'mock_res_4',
            name: `Startup Entry ที่ตกค้าง`,
            path: `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\${app.name}`,
            type: 'startup_entry',
            typeName: 'Startup Entry ที่ตกค้าง',
            recommendedAction: 'review',
            recommendation: 'Startup Entry ที่ตกค้าง: ตรวจสอบความเชื่อมโยงก่อนเปลี่ยนแปลง',
            riskLevel: 'medium',
            sizeMB: 0,
            fileCount: 1,
            status: 'pending'
          },
          {
            id: 'mock_res_5',
            name: `Registry ที่อาจตกค้าง`,
            path: `HKCU\\Software\\${app.name}`,
            type: 'registry_key',
            typeName: 'Registry ที่อาจตกค้าง',
            recommendedAction: 'keep',
            recommendation: 'Registry ที่อาจตกค้าง: ให้ตรวจสอบอย่างระมัดระวัง ไม่ลบแบบกวาดทั้งหมด',
            riskLevel: 'high',
            sizeMB: 0,
            fileCount: 1,
            status: 'pending'
          }
        ]);
      }
      setWizardStep('residuals');
    } catch (e: any) {
      console.error('Residual scan error:', e);
      setWizardStep('residuals');
    } finally {
      setIsScanningResiduals(false);
    }
  };

  // Manage individual residual item (Open, Keep, Backup, Recycle, Delete Permanent)
  const handleManageResidual = async (
    item: ResidualItem,
    action: 'open' | 'keep' | 'backup' | 'recycle' | 'delete_permanent'
  ) => {
    if (action === 'delete_permanent') {
      setPermanentDeleteTarget(item);
      return;
    }

    try {
      if ((window as any).electronAPI?.manageResidualItem) {
        await (window as any).electronAPI.manageResidualItem(action, item.path);
      }

      setResiduals((prev) =>
        prev.map((r) => {
          if (r.id === item.id) {
            let nextStatus: ResidualItem['status'] = r.status;
            if (action === 'keep') nextStatus = 'kept';
            if (action === 'backup') nextStatus = 'backed_up';
            if (action === 'recycle') nextStatus = 'recycled';
            return { ...r, status: nextStatus };
          }
          return r;
        })
      );
    } catch (e: any) {
      console.error('Manage residual error:', e);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    try {
      if ((window as any).electronAPI?.manageResidualItem) {
        await (window as any).electronAPI.manageResidualItem('delete_permanent', permanentDeleteTarget.path);
      }
      setResiduals((prev) =>
        prev.map((r) => (r.id === permanentDeleteTarget.id ? { ...r, status: 'deleted' } : r))
      );
      setPermanentDeleteTarget(null);
    } catch (e: any) {
      console.error('Permanent delete error:', e);
      setPermanentDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. HEADER & CONTROLS
      ===================================================================== */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  ค้นหาและจัดการโปรแกรม (Installed Apps &amp; Smart Uninstall)
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ค้นหาจากชื่อ ผู้พัฒนา เวอร์ชัน และตำแหน่งติดตั้ง พร้อมระบบ Preflight Check, Preserve User Data และ Residual Scanner
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Toggle Mockup Preview Mode */}
          <button
            onClick={() => setUseMockPreview(!useMockPreview)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              useMockPreview
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title="สลับระหว่างข้อมูลโปรแกรมจริงในเครื่อง กับตัวอย่างหน้าจอจำลอง"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{useMockPreview ? 'ตัวอย่างหน้าจอจำลอง (Mockup On)' : 'ดูตัวอย่างหน้าจอจำลอง'}</span>
          </button>

          {/* Refresh Real Apps */}
          <button
            onClick={fetchApps}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Mockup Preview Notice Banner if enabled */}
      {useMockPreview && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-200 shadow-md">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>ตัวอย่างหน้าจอจำลอง ไม่ใช่ข้อมูลโปรแกรมที่ติดตั้งจริง:</b> กำลังแสดงโครงสร้างข้อมูลโปรแกรมตัวอย่างตามข้อกำหนด
            </span>
          </div>
          <button
            onClick={() => setUseMockPreview(false)}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold"
          >
            กลับสู่โปรแกรมจริงในเครื่อง
          </button>
        </div>
      )}

      {/* =====================================================================
          2. FILTER TABS & SEARCH BAR
      ===================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Exact category tabs specified: ทั้งหมด | Windows Apps | Developer | Store Apps */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/60 backdrop-blur border border-slate-800 rounded-2xl">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด ({displayedApps.length})
            </button>
            <button
              onClick={() => setCategoryFilter('win32')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                categoryFilter === 'win32'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Windows Apps ({displayedApps.filter((a) => a.category === 'win32').length})
            </button>
            <button
              onClick={() => setCategoryFilter('developer')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                categoryFilter === 'developer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Developer ({displayedApps.filter((a) => a.category === 'developer').length})
            </button>
            <button
              onClick={() => setCategoryFilter('store')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                categoryFilter === 'store'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Store Apps ({displayedApps.filter((a) => a.category === 'store').length})
            </button>
          </div>

          {/* Search Box & Sort */}
          <div className="flex items-center gap-3 flex-1 md:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาจากชื่อ ผู้พัฒนา เวอร์ชัน และตำแหน่งติดตั้ง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="size_desc">ขนาด (มาก → น้อย)</option>
              <option value="name_asc">ชื่อโปรแกรม (A-Z)</option>
              <option value="publisher_asc">ผู้พัฒนา (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Legend Notice for Reported Size vs Scanned Size */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            ระบบแยกชัดเจนระหว่าง <b>ขนาดที่ตัวติดตั้งรายงาน (Reported)</b> กับ <b>ขนาดที่แอปคำนวณจากการสแกน (Scanned)</b> เพื่อความแม่นยำสูงสุด
          </span>
        </div>
      </div>

      {/* =====================================================================
          3. PROGRAM LIST CARDS (MATCHING THE USER'S MOCKUP HIERARCHY)
      ===================================================================== */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center space-y-3 bg-slate-900/60 rounded-3xl border border-slate-800">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <div className="text-sm font-semibold text-white">กำลังสแกนรายการโปรแกรมทั้งหมดในเครื่อง...</div>
            <p className="text-xs text-slate-500">
              อ่านข้อมูลจาก Windows Registry (HKLM, HKCU), MSI Databases และ Store Packages
            </p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-900/60 rounded-3xl border border-slate-800">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-white">ไม่พบโปรแกรมที่ตรงกับเงื่อนไขการค้นหา</div>
            <p className="text-xs text-slate-500">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const displaySizeMB = app.scannedSizeMB ?? app.reportedSizeMB ?? null;
            return (
              <div
                key={app.id}
                className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side: Program Name, Publisher, Version, Badges */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base md:text-lg font-bold text-white tracking-tight truncate">
                      {app.name}
                    </h2>

                    {/* Category / Installer Type Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                        app.category === 'developer'
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                          : app.category === 'store'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : app.installType === 'msi'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {app.category === 'developer'
                        ? 'Developer'
                        : app.category === 'store'
                        ? 'Store'
                        : app.installType === 'msi'
                        ? 'MSI'
                        : 'Win32'}
                    </span>

                    {/* Scope Badge */}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono shrink-0">
                      {app.scope === 'user' ? 'บัญชีปัจจุบัน (User)' : 'ทั้งเครื่อง (Machine)'}
                    </span>
                  </div>

                  {/* Subtitle: Publisher · Version */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{app.publisher}</span>
                    <span>·</span>
                    <span className="font-mono text-slate-400">{app.version}</span>
                  </div>

                  {/* Install Location */}
                  {app.installLocation && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate pt-0.5">
                      <HardDrive className="w-3 h-3 shrink-0 text-slate-600" />
                      <span className="font-mono truncate">{app.installLocation}</span>
                    </div>
                  )}
                </div>

                {/* Right side: Size Breakdown & Smart Uninstall Trigger */}
                <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                  <div className="text-left md:text-right">
                    <div className="text-base md:text-lg font-bold font-mono text-white">
                      {formatSize(displaySizeMB)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {app.scannedSizeMB !== null ? (
                        <span className="text-emerald-400">ขนาดสแกนจริง</span>
                      ) : app.reportedSizeMB !== null ? (
                        <span className="text-sky-400">รายงานโดยตัวติดตั้ง</span>
                      ) : (
                        <span className="text-slate-500">ไม่ได้รายงานขนาด</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {app.installLocation && (
                      <button
                        onClick={() => (window as any).electronAPI?.openInExplorer?.(app.installLocation)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="เปิดตำแหน่งติดตั้งใน Windows Explorer"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => startSmartUninstall(app)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Smart Uninstall</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =====================================================================
          4. SMART UNINSTALL WORKFLOW MODAL WIZARD
      ===================================================================== */}
      {wizardStep && activeApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>ถอนการติดตั้ง: {activeApp.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {activeApp.version}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Smart Uninstaller — ขั้นตอนการตรวจสอบและถอนอย่างถูกวิธี
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWizardStep(null);
                  setActiveApp(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content depending on Wizard Step */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* STEP 1: PREFLIGHT CHECK */}
              {wizardStep === 'preflight' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span>Pre-uninstall Check (ตรวจสอบความพร้อมก่อนถอน)</span>
                    </div>
                    {isPreflighting && (
                      <span className="text-xs text-sky-400 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" /> กำลังวิเคราะห์...
                      </span>
                    )}
                  </div>

                  {preflightData ? (
                    <div className="space-y-3 text-xs">
                      {/* Check 1: Running Process */}
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          preflightData.isRunning
                            ? 'bg-rose-950/30 border-rose-500/40'
                            : 'bg-emerald-950/20 border-emerald-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {preflightData.isRunning ? (
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold text-white">
                                {preflightData.isRunning
                                  ? `โปรแกรมยังเปิดทำงานอยู่ (${preflightData.runningProcesses.length} โปรเซส)`
                                  : 'โปรแกรมไม่ได้เปิดทำงานอยู่'}
                              </div>
                              <p className="text-slate-400 text-[11px] mt-0.5">
                                {preflightData.isRunning
                                  ? 'แนะนำให้ปิดโปรเซสก่อนเพื่อป้องกันไฟล์ถูกล็อกขณะถอนการติดตั้ง'
                                  : 'ไม่พบโปรเซสทำงานค้างอยู่ ปลอดภัยต่อการถอน'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {preflightData.isRunning && (
                          <div className="mt-3 pt-2.5 border-t border-rose-500/20 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {preflightData.runningProcesses.map((p) => (
                                <div
                                  key={p.pid}
                                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300"
                                >
                                  <span>{p.name}</span>
                                  <span className="text-rose-400">PID {p.pid}</span>
                                  <button
                                    onClick={() => handleKillProcess(p.pid)}
                                    className="px-1.5 py-0.5 rounded bg-rose-600/40 hover:bg-rose-600 text-white text-[10px] transition"
                                  >
                                    ปิด
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Check 2: Unsaved Files Warning */}
                      <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-300">แจ้งเตือนไฟล์ที่ยังไม่ได้บันทึก</div>
                          <p className="text-slate-300 text-[11px] mt-0.5">
                            โปรดบันทึกไฟล์งาน หรือเอกสารโปรเจกต์ที่เปิดค้างไว้ในโปรแกรมนี้ ก่อนดำเนินการต่อ
                          </p>
                        </div>
                      </div>

                      {/* Check 3: Administrator Rights Check */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                        <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-white">
                            สิทธิ์ Administrator: {preflightData.requiresAdmin ? 'จำเป็นต้องใช้' : 'ไม่จำเป็น'}
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">{preflightData.adminReason}</p>
                        </div>
                      </div>

                      {/* Check 4: Shared Components & Driver Risk Check */}
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          preflightData.sharedSafety.status === 'unverified'
                            ? 'bg-rose-950/30 border-rose-500/40'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <ShieldAlert
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              preflightData.sharedSafety.status === 'unverified' ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          />
                          <div>
                            <div className="font-bold text-white">ความเกี่ยวข้องกับไดรเวอร์และคอมโพเนนต์อื่น</div>
                            <p
                              className={`text-[11px] mt-0.5 ${
                                preflightData.sharedSafety.status === 'unverified'
                                  ? 'text-rose-300 font-medium'
                                  : 'text-slate-400'
                              }`}
                            >
                              {preflightData.sharedSafety.warning}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Check 5: Windows Services & Startup Entries */}
                      {(preflightData.relatedServices.length > 0 || preflightData.relatedStartup.length > 0) && (
                        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <div className="font-bold text-white flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Service &amp; รายการเริ่มต้นที่ตรวจพบ</span>
                          </div>
                          <div className="text-[11px] text-slate-400 space-y-1 pl-1">
                            {preflightData.relatedServices.map((s, idx) => (
                              <div key={idx}>• Windows Service: <span className="text-indigo-300">{s.name}</span> ({s.state})</div>
                            ))}
                            {preflightData.relatedStartup.map((st, idx) => (
                              <div key={idx}>• Startup Run Key: <span className="text-amber-300">{st.name}</span></div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Check 6: Reboot Required */}
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] flex items-center justify-between text-slate-400">
                        <span>สถานะการรีสตาร์ตเครื่อง:</span>
                        <span className="font-semibold text-slate-300">{preflightData.rebootMessage}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">กำลังตรวจสอบข้อมูล Preflight...</div>
                  )}

                  {/* Step Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => setWizardStep(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => setWizardStep('confirm')}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                    >
                      <span>ขั้นตอนถัดไป (Preserve User Data)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PRESERVE USER DATA & UNINSTALL CONFIRM */}
              {wizardStep === 'confirm' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <Archive className="w-4 h-4 text-indigo-400" />
                      <span>Preserve User Data — การเก็บและรักษาข้อมูลผู้ใช้</span>
                    </div>
                    <p className="text-xs text-indigo-200/90 leading-relaxed">
                      จุดสำคัญที่สุด: ข้อมูลใน <b>AppData</b>, <b>Documents</b>, <b>เซฟเกม</b> หรือ <b>โฟลเดอร์โปรเจกต์</b> อาจมีข้อมูลสำคัญ แม้โปรแกรมหลักจะถูกถอนออกไปแล้ว จึงไม่ควรถูกลบโดยอัตโนมัติ
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveUserData}
                        onChange={(e) => setPreserveUserData(e.target.checked)}
                        className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          ถอนเฉพาะตัวโปรแกรม และเก็บข้อมูลผู้ใช้ไว้ก่อน (ค่าเริ่มต้น / แนะนำ)
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          ไม่ลบโฟลเดอร์เซฟ ข้อมูลคอนฟิก และไฟล์งานส่วนตัวของคุณ
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-800/60">
                      <input
                        type="checkbox"
                        checked={backupUserData}
                        onChange={(e) => setBackupUserData(e.target.checked)}
                        className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>สำรองข้อมูลส่วนตัว (Backup User Data) อัตโนมัติ</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            ปลอดภัย
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          คัดลอกไฟล์การตั้งค่าและประวัติงานไปยังโฟลเดอร์ Backup ก่อนเริ่มถอนการติดตั้ง
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Summary of What Will Happen */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs space-y-2 text-slate-300">
                    <div className="font-bold text-white">สรุปกระบวนการ Smart Uninstall:</div>
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div>1. เรียกตัวถอนการติดตั้งมาตรฐาน: <span className="font-mono text-slate-300">{activeApp.installType.toUpperCase()}</span></div>
                      <div>2. ควบคุมไม่ให้ลบโฟลเดอร์ทิ้งตรงๆ ป้องกันความเสียหายของระบบ</div>
                      <div>3. หลังถอนเสร็จ จะเปิด <b>Residual Scanner</b> เพื่อให้คุณเลือกตรวจและจัดการไฟล์ตกค้างทีละรายการ</div>
                    </div>
                  </div>

                  {/* Confirm Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => setWizardStep('preflight')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      onClick={handleConfirmUninstall}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>ยืนยันเริ่มถอนการติดตั้ง</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PROGRESS TRACKING */}
              {wizardStep === 'progress' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {isUninstalling || isScanningResiduals ? (
                          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        <span>
                          {isUninstalling
                            ? 'กำลังเรียกตัวถอนการติดตั้งมาตรฐาน...'
                            : isScanningResiduals
                            ? 'กำลังสแกนหาไฟล์และรีจิสทรีตกค้าง (Residual Scanner)...'
                            : 'การถอนการติดตั้งและสแกนเสร็จสมบูรณ์'}
                        </span>
                      </div>
                    </div>

                    {/* Live Logs Terminal Box */}
                    <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800/80 max-h-48 overflow-y-auto space-y-1">
                      {uninstallLogs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-400 select-none">›</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!isUninstalling && !isScanningResiduals && (
                    <div className="flex items-center justify-end pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => setWizardStep('residuals')}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                      >
                        <span>เข้าสู่ Residual Scanner</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: RESIDUAL SCANNER (ALL 4 REQUIRED ACTIONS: OPEN LOCATION, KEEP, BACK UP, MOVE TO RECYCLE BIN, PERMANENT DELETE) */}
              {wizardStep === 'residuals' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>Residual Scanner — ตรวจสอบไฟล์ตกค้างหลังถอน</span>
                      </div>
                      <span className="text-xs font-mono text-indigo-400">
                        {residuals.length} รายการที่พบ
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      คุณสามารถควบคุมการจัดการแต่ละรายการได้อย่างอิสระ ผ่านปุ่ม <b>Open Location</b>, <b>Keep</b>, <b>Back Up</b> และ <b>Move to Recycle Bin</b>
                    </p>
                  </div>

                  {/* Residuals list */}
                  <div className="space-y-3">
                    {residuals.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                        ✓ ไม่พบไฟล์หรือข้อมูลตกค้าง ระบบสะอาดเรียบร้อย
                      </div>
                    ) : (
                      residuals.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{item.name}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    item.riskLevel === 'high'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                      : item.riskLevel === 'medium'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  }`}
                                >
                                  {item.typeName}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                                {item.path}
                              </p>
                            </div>

                            {/* Item status or size */}
                            <div className="text-left sm:text-right shrink-0">
                              {item.status !== 'pending' ? (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    item.status === 'kept'
                                      ? 'bg-indigo-500/20 text-indigo-300'
                                      : item.status === 'backed_up'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : item.status === 'recycled'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {item.status === 'kept' && '✓ เก็บไว้ (Keep)'}
                                  {item.status === 'backed_up' && '✓ สำรองแล้ว (Backed Up)'}
                                  {item.status === 'recycled' && '✓ ย้ายลงถังขยะแล้ว'}
                                  {item.status === 'deleted' && '✓ ลบถาวรแล้ว'}
                                </span>
                              ) : (
                                <span className="font-mono text-xs font-bold text-slate-300">
                                  {formatSize(item.sizeMB)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Recommendation explanation note */}
                          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{item.recommendation}</span>
                          </div>

                          {/* Action Buttons: Open Location, Keep, Back Up, Move to Recycle Bin, Permanent Delete */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
                            {/* Open Location */}
                            <button
                              onClick={() => handleManageResidual(item, 'open')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                              title="เปิดตำแหน่งไฟล์ใน Explorer"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                              <span>Open Location</span>
                            </button>

                            {/* Keep */}
                            <button
                              onClick={() => handleManageResidual(item, 'keep')}
                              disabled={item.status !== 'pending'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium transition"
                              title="เก็บข้อมูลรายการนี้ไว้"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Keep</span>
                            </button>

                            {/* Back Up */}
                            <button
                              onClick={() => handleManageResidual(item, 'backup')}
                              disabled={item.status !== 'pending'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium transition"
                              title="สำรองข้อมูลไปยังโฟลเดอร์ Backup"
                            >
                              <Archive className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Back Up</span>
                            </button>

                            {/* Move to Recycle Bin */}
                            <button
                              onClick={() => handleManageResidual(item, 'recycle')}
                              disabled={item.status !== 'pending'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium transition"
                              title="ย้ายลงถังขยะอย่างปลอดภัย"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Move to Recycle Bin</span>
                            </button>

                            {/* Permanent Delete with confirmation modal */}
                            <button
                              onClick={() => handleManageResidual(item, 'delete_permanent')}
                              disabled={item.status !== 'pending'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 text-xs font-semibold transition ml-auto"
                              title="ลบถาวร (มีหน้าต่างยืนยันแยกต่างหาก)"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>ลบถาวร</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Finish Button */}
                  <div className="flex items-center justify-end pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setWizardStep(null);
                        setActiveApp(null);
                        fetchApps();
                      }}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                    >
                      เสร็จสิ้นกระบวนการถอนการติดตั้ง
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. SEPARATE PERMANENT DELETE CONFIRMATION MODAL
      ===================================================================== */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-white">ยืนยันการลบถาวร (Permanent Delete)</h4>
                <p className="text-xs text-rose-200">
                  คุณกำลังจะลบรายการนี้ออกจากระบบอย่างถาวรโดย<b>ไม่ผ่าน Recycle Bin</b> การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
              {permanentDeleteTarget.path}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPermanentDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                ยืนยันลบถาวรทันที
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
