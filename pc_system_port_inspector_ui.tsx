import React, { useState, useEffect, useMemo } from 'react';
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
  Zap,
  FileText,
  Film,
  Code2,
  Archive,
  Lock,
  Unlock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Play,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Layers,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Info,
  X
} from 'lucide-react';

// ============================================================================
// TAURI IPC SIMULATION HELPER
// ในโปรเจกต์จริง ให้เปิดใช้งาน: import { invoke } from '@tauri-apps/api/core';
// ============================================================================

const INITIAL_LARGE_FILES = [
  {
    id: 'f1',
    name: 'vdo_raw_footage_4k_60fps.mp4',
    path: 'D:\\MediaProjects\\Youtube2026\\vdo_raw_footage_4k_60fps.mp4',
    drive: 'D:',
    category: 'Media / Video',
    sizeMB: 18840, // 18.4 GB
    lastModified: '2 วันที่แล้ว',
    daysInactive: 2,
    type: 'file'
  },
  {
    id: 'f2',
    name: 'Docker Desktop VHDX (ext4.vhdx)',
    path: 'C:\\Users\\Admin\\AppData\\Local\\Docker\\wsl\\data\\ext4.vhdx',
    drive: 'C:',
    category: 'Dev / VM Disk',
    sizeMB: 15260, // 14.9 GB
    lastModified: 'วันนี้',
    daysInactive: 0,
    type: 'file'
  },
  {
    id: 'f3',
    name: 'target (Rust Debug & Incremental Builds)',
    path: 'D:\\Workspace\\tauri-system-cleaner\\src-tauri\\target',
    drive: 'D:',
    category: 'Dev Cache',
    sizeMB: 8920, // 8.7 GB
    lastModified: '45 วันที่แล้ว',
    daysInactive: 45,
    type: 'folder'
  },
  {
    id: 'f4',
    name: 'Windows11_InsiderPreview_Client_x64.iso',
    path: 'C:\\Users\\Admin\\Downloads\\Windows11_InsiderPreview_Client_x64.iso',
    drive: 'C:',
    category: 'Archive / ISO',
    sizeMB: 6550, // 6.4 GB
    lastModified: '120 วันที่แล้ว',
    daysInactive: 120,
    type: 'file'
  },
  {
    id: 'f5',
    name: 'node_modules (Monorepo Legacy Project)',
    path: 'D:\\Workspace\\old-ecommerce-nextjs\\node_modules',
    drive: 'D:',
    category: 'Dev Cache',
    sizeMB: 4320, // 4.2 GB
    lastModified: '98 วันที่แล้ว',
    daysInactive: 98,
    type: 'folder'
  },
  {
    id: 'f6',
    name: 'Adobe Premiere Pro Media Cache Files',
    path: 'C:\\Users\\Admin\\AppData\\Roaming\\Adobe\\Common\\Media Cache Files',
    drive: 'C:',
    category: 'App Cache',
    sizeMB: 5480, // 5.35 GB
    lastModified: '14 วันที่แล้ว',
    daysInactive: 14,
    type: 'folder'
  },
  {
    id: 'f7',
    name: 'llm-qwen2.5-coder-14b-instruct-q4_k_m.gguf',
    path: 'D:\\AI_Models\\ollama\\blobs\\llm-qwen2.5-coder-14b-instruct.gguf',
    drive: 'D:',
    category: 'AI Model',
    sizeMB: 9120, // 8.9 GB
    lastModified: '19 วันที่แล้ว',
    daysInactive: 19,
    type: 'file'
  },
  {
    id: 'f8',
    name: 'backup_database_prod_2025.sql.tar.gz',
    path: 'D:\\Backups\\DB\\backup_database_prod_2025.sql.tar.gz',
    drive: 'D:',
    category: 'Archive / ISO',
    sizeMB: 3890, // 3.8 GB
    lastModified: '180 วันที่แล้ว',
    daysInactive: 180,
    type: 'file'
  }
];

const INITIAL_DUPLICATE_GROUPS = [
  {
    id: 'dup1',
    name: 'Windows11_InsiderPreview_Client_x64.iso',
    hash: 'blake3:9f86d081884c7d659a2feaa0c55ad015',
    sizeEachMB: 6550,
    copies: [
      { path: 'C:\\Users\\Admin\\Downloads\\Windows11_InsiderPreview_Client_x64.iso', date: '2025-11-10' },
      { path: 'D:\\Backup_Installers\\OS\\Windows11_InsiderPreview_Client_x64 (1).iso', date: '2025-11-12' }
    ]
  },
  {
    id: 'dup2',
    name: 'dataset_training_v2_cleaned.parquet',
    hash: 'blake3:4b227777d4dd1fc61c6f884f48641d02',
    sizeEachMB: 1840,
    copies: [
      { path: 'D:\\Workspace\\ml-pipeline\\data\\dataset_training_v2_cleaned.parquet', date: '2026-01-05' },
      { path: 'D:\\Workspace\\ml-pipeline\\notebooks\\temp\\dataset_training_v2_cleaned.parquet', date: '2026-01-08' },
      { path: 'C:\\Users\\Admin\\Desktop\\dataset_training_v2_cleaned_copy.parquet', date: '2026-01-15' }
    ]
  },
  {
    id: 'dup3',
    name: 'company_promo_master_4k.mov',
    hash: 'blake3:e3b0c44298fc1c149afbf4c8996fb924',
    sizeEachMB: 3120,
    copies: [
      { path: 'D:\\MediaProjects\\FinalExport\\company_promo_master_4k.mov', date: '2026-02-01' },
      { path: 'D:\\MediaProjects\\ClientReview\\company_promo_master_4k.mov', date: '2026-02-01' }
    ]
  }
];

const INITIAL_JUNK_CATEGORIES = [
  {
    id: 'sys_temp',
    title: '1. System Temp & Windows Logs (ไฟล์ขยะระบบและบันทึกข้อผิดพลาด)',
    description: 'ไฟล์ชั่วคราวที่ระบบปฏิบัติการสร้างขึ้นและไม่ได้ใช้งานแล้ว ลบได้อย่างปลอดภัย 100%',
    badge: 'ปลอดภัยสูง',
    badgeColor: 'emerald',
    expanded: true,
    items: [
      {
        id: 'j1',
        name: 'User Temporary Folder (%temp%)',
        path: 'C:\\Users\\Admin\\AppData\\Local\\Temp',
        sizeMB: 3420,
        lastModified: 'วันนี้',
        selected: true,
        fileCount: 14820
      },
      {
        id: 'j2',
        name: 'Windows System Temp & Prefetch',
        path: 'C:\\Windows\\Temp',
        sizeMB: 1850,
        lastModified: '3 วันที่แล้ว',
        selected: true,
        fileCount: 4120
      },
      {
        id: 'j3',
        name: 'Windows Update Download Cache (SoftwareDistribution)',
        path: 'C:\\Windows\\SoftwareDistribution\\Download',
        sizeMB: 4680,
        lastModified: '21 วันที่แล้ว',
        selected: true,
        fileCount: 892
      },
      {
        id: 'j4',
        name: 'System Crash Dumps & Error Reports (WER)',
        path: 'C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue',
        sizeMB: 940,
        lastModified: '40 วันที่แล้ว',
        selected: true,
        fileCount: 315
      }
    ]
  },
  {
    id: 'app_cache',
    title: '2. Application & Browser Cache (แคชของโปรแกรมและเบราว์เซอร์)',
    description: 'ไฟล์แคชสะสมของเบราว์เซอร์ แอปแชท และการ์ดจอที่กินพื้นที่ไดรฟ์ C: โดยไม่รู้ตัว',
    badge: 'แนะนำให้ล้าง',
    badgeColor: 'sky',
    expanded: true,
    items: [
      {
        id: 'j5',
        name: 'Google Chrome & Microsoft Edge Code/GPU Cache',
        path: 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache',
        sizeMB: 3190,
        lastModified: 'วันนี้',
        selected: true,
        fileCount: 28450
      },
      {
        id: 'j6',
        name: 'Discord Media & GPU Cache',
        path: 'C:\\Users\\Admin\\AppData\\Roaming\\discord\\Cache\\Cache_Data',
        sizeMB: 1640,
        lastModified: 'เมื่อวานนี้',
        selected: true,
        fileCount: 9420
      },
      {
        id: 'j7',
        name: 'NVIDIA DirectX & Vulkan Shader Cache (DXCache)',
        path: 'C:\\Users\\Admin\\AppData\\LocalLow\\NVIDIA\\PerDriverVersion\\DXCache',
        sizeMB: 4120,
        lastModified: '5 วันที่แล้ว',
        selected: true,
        fileCount: 1640
      },
      {
        id: 'j8',
        name: 'Spotify Offline Storage Cache',
        path: 'C:\\Users\\Admin\\AppData\\Local\\Spotify\\Storage',
        sizeMB: 2280,
        lastModified: '2 วันที่แล้ว',
        selected: false,
        fileCount: 5110
      }
    ]
  },
  {
    id: 'dev_junk',
    title: '3. Developer & Workspace Cleaner (ขยะโปรเจกต์สายพัฒนาซอฟต์แวร์)',
    description: 'โฟลเดอร์ Build Artifacts และ Dependencies ของโปรเจกต์เก่าที่ไม่ได้เปิดใช้งานนานแล้ว (สามารถสั่ง npm install / cargo build ใหม่ได้)',
    badge: 'ประหยัดพื้นที่สูงสุด',
    badgeColor: 'violet',
    expanded: true,
    items: [
      {
        id: 'j9',
        name: 'Rust Cargo Build Artifacts (target/) — 3 โปรเจกต์เก่า',
        path: 'D:\\Workspace\\archive-rust-services\\*\\target',
        sizeMB: 11400,
        lastModified: 'ไม่ได้แก้มา 64 วัน',
        daysInactive: 64,
        selected: true,
        fileCount: 42300
      },
      {
        id: 'j10',
        name: 'Node.js Dependencies (node_modules) — 5 โปรเจกต์ไม่ได้เปิดเกิน 90 วัน',
        path: 'D:\\Workspace\\old-web-projects\\*\\node_modules',
        sizeMB: 6850,
        lastModified: 'ไม่ได้แก้มา 98 วัน',
        daysInactive: 98,
        selected: true,
        fileCount: 184500
      },
      {
        id: 'j11',
        name: 'Next.js & Vite Build Cache (.next / .vite)',
        path: 'D:\\Workspace\\dashboard-v1\\.next\\cache',
        sizeMB: 2450,
        lastModified: 'ไม่ได้แก้มา 32 วัน',
        daysInactive: 32,
        selected: true,
        fileCount: 8310
      },
      {
        id: 'j12',
        name: 'Python Virtual Envs & Pip Cache (.venv / __pycache__)',
        path: 'C:\\Users\\Admin\\AppData\\Local\\pip\\cache',
        sizeMB: 3180,
        lastModified: 'ไม่ได้แก้มา 50 วัน',
        daysInactive: 50,
        selected: true,
        fileCount: 15900
      }
    ]
  },
  {
    id: 'leftover_appdata',
    title: '4. Leftover App Data (ไฟล์ตกค้างจากโปรแกรมที่ถอนการติดตั้งไปแล้ว)',
    description: 'โฟลเดอร์กำพร้าใน AppData\\Local และ Roaming ที่ไม่มีไฟล์ .exe ต้นทางอยู่ในเครื่องแล้ว',
    badge: 'Orphaned Data',
    badgeColor: 'amber',
    expanded: false,
    items: [
      {
        id: 'j13',
        name: ' Postman Legacy Agent & Logs (ถอนการติดตั้งแล้ว)',
        path: 'C:\\Users\\Admin\\AppData\\Local\\Postman',
        sizeMB: 890,
        lastModified: '140 วันที่แล้ว',
        selected: true,
        fileCount: 2140
      },
      {
        id: 'j14',
        name: 'Unity Editor 2022.3 Leftover Package Cache',
        path: 'C:\\Users\\Admin\\AppData\\Local\\Unity\\cache\\packages',
        sizeMB: 3750,
        lastModified: '210 วันที่แล้ว',
        selected: true,
        fileCount: 6420
      }
    ]
  }
];

const INITIAL_PORTS = [
  {
    id: 'p1',
    port: 3000,
    protocol: 'TCP',
    localAddress: '0.0.0.0:3000',
    remoteAddress: '*:*',
    state: 'LISTENING',
    pid: 18432,
    processName: 'node.exe',
    description: 'Next.js Dev Server (turbopack)',
    exePath: 'C:\\Program Files\\nodejs\\node.exe',
    workingDir: 'D:\\Workspace\\ecommerce-web',
    cpuPercent: 4.2,
    memoryMB: 642,
    isDevPort: true
  },
  {
    id: 'p2',
    port: 5173,
    protocol: 'TCP',
    localAddress: '127.0.0.1:5173',
    remoteAddress: '127.0.0.1:59812',
    state: 'ESTABLISHED',
    pid: 22910,
    processName: 'node.exe',
    description: 'Vite React Frontend (Tauri UI Dev)',
    exePath: 'C:\\Users\\Admin\\AppData\\Local\\fnm_multishells\\node.exe',
    workingDir: 'D:\\Workspace\\tauri-system-cleaner',
    cpuPercent: 1.8,
    memoryMB: 318,
    isDevPort: true
  },
  {
    id: 'p3',
    port: 8080,
    protocol: 'TCP',
    localAddress: '0.0.0.0:8080',
    remoteAddress: '*:*',
    state: 'LISTENING',
    pid: 9412,
    processName: 'java.exe',
    description: 'Spring Boot API Server (Orphaned Instance)',
    exePath: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.2\\bin\\java.exe',
    workingDir: 'D:\\Workspace\\legacy-payment-service',
    cpuPercent: 8.7,
    memoryMB: 1420,
    isDevPort: true
  },
  {
    id: 'p4',
    port: 5432,
    protocol: 'TCP',
    localAddress: '127.0.0.1:5432',
    remoteAddress: '127.0.0.1:54399',
    state: 'LISTENING',
    pid: 4820,
    processName: 'postgres.exe',
    description: 'PostgreSQL 16 Database Server',
    exePath: 'C:\\Program Files\\PostgreSQL\\16\\bin\\postgres.exe',
    workingDir: 'C:\\Program Files\\PostgreSQL\\16\\data',
    cpuPercent: 0.6,
    memoryMB: 285,
    isDevPort: true
  },
  {
    id: 'p5',
    port: 11434,
    protocol: 'TCP',
    localAddress: '127.0.0.1:11434',
    remoteAddress: '*:*',
    state: 'LISTENING',
    pid: 15024,
    processName: 'ollama.exe',
    description: 'Ollama Local LLM Runner Server',
    exePath: 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Ollama\\ollama.exe',
    workingDir: 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Ollama',
    cpuPercent: 2.1,
    memoryMB: 1950,
    isDevPort: true
  },
  {
    id: 'p6',
    port: 6379,
    protocol: 'TCP',
    localAddress: '0.0.0.0:6379',
    remoteAddress: '*:*',
    state: 'LISTENING',
    pid: 11208,
    processName: 'com.docker.backend.exe',
    description: 'Docker Desktop Port Forwarder (Redis)',
    exePath: 'C:\\Program Files\\Docker\\Docker\\resources\\com.docker.backend.exe',
    workingDir: 'C:\\Program Files\\Docker\\Docker',
    cpuPercent: 3.4,
    memoryMB: 890,
    isDevPort: true
  },
  {
    id: 'p7',
    port: 8000,
    protocol: 'TCP',
    localAddress: '127.0.0.1:8000',
    remoteAddress: '*:*',
    state: 'LISTENING',
    pid: 27400,
    processName: 'python.exe',
    description: 'FastAPI Uvicorn Worker',
    exePath: 'D:\\Workspace\\ai-rag-agent\\.venv\\Scripts\\python.exe',
    workingDir: 'D:\\Workspace\\ai-rag-agent',
    cpuPercent: 1.2,
    memoryMB: 410,
    isDevPort: true
  },
  {
    id: 'p8',
    port: 5353,
    protocol: 'UDP',
    localAddress: '224.0.0.251:5353',
    remoteAddress: '*:*',
    state: 'ACTIVE',
    pid: 7640,
    processName: 'chrome.exe',
    description: 'Google Chrome mDNS Responder',
    exePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    workingDir: 'C:\\Program Files\\Google\\Chrome\\Application',
    cpuPercent: 2.9,
    memoryMB: 1180,
    isDevPort: false
  }
];

const INITIAL_LOCKED_FILES = [
  {
    id: 'lk1',
    targetName: 'D:\\Workspace\\old-ecommerce-nextjs\\node_modules\\@next\\swc-win32-x64-msvc\\next-swc.win32-x64-msvc.node',
    targetType: 'Native Binary (.node)',
    lockedByProcess: 'node.exe',
    pid: 18432,
    exePath: 'C:\\Program Files\\nodejs\\node.exe',
    handleId: '0x000004AC',
    reason: 'ลบโฟลเดอร์ node_modules ไม่ได้เนื่องจากมี Node Worker แอบรันค้างอยู่'
  },
  {
    id: 'lk2',
    targetName: 'D:\\MediaProjects\\Youtube2026\\preview_render_draft.mp4',
    targetType: 'Video File (.mp4)',
    lockedByProcess: 'WMPlayer.exe',
    pid: 13904,
    exePath: 'C:\\Program Files (x86)\\Windows Media Player\\wmplayer.exe',
    handleId: '0x000008F0',
    reason: 'ไฟล์วิดีโอถูกเปิดค้างไว้ใน Background Media Handle'
  },
  {
    id: 'lk3',
    targetName: 'C:\\Users\\Admin\\Documents\\Financial_Report_Q1.xlsx',
    targetType: 'Excel Document (.xlsx)',
    lockedByProcess: 'EXCEL.EXE (Background Zombie)',
    pid: 21508,
    exePath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
    handleId: '0x0000021C',
    reason: 'หน้าต่างโปรแกรมปิดไปแล้วแต่ Process ยังไม่คืน Handle ของไฟล์'
  }
];

const INITIAL_STARTUP_APPS = [
  {
    id: 'st1',
    name: 'Docker Desktop Service',
    publisher: 'Docker Inc.',
    path: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe -Autostart',
    impact: 'High',
    enabled: true
  },
  {
    id: 'st2',
    name: 'Spotify Web Helper',
    publisher: 'Spotify AB',
    path: 'C:\\Users\\Admin\\AppData\\Roaming\\Spotify\\Spotify.exe --minimized',
    impact: 'Medium',
    enabled: false
  },
  {
    id: 'st3',
    name: 'Steam Client Bootstrapper',
    publisher: 'Valve Corporation',
    path: 'C:\\Program Files (x86)\\Steam\\steam.exe -silent',
    impact: 'High',
    enabled: false
  },
  {
    id: 'st4',
    name: 'SysPulse System Tray Monitor',
    publisher: 'Tauri Rust Core',
    path: 'C:\\Program Files\\SysPulse\\syspulse.exe --tray',
    impact: 'Low',
    enabled: true
  }
];

const TREEMAP_BLOCKS = [
  {
    id: 'tm1',
    label: 'D:\\MediaProjects (4K Raw Video)',
    path: 'D:\\MediaProjects',
    drive: 'D:',
    sizeGB: 142.5,
    percent: 28,
    color: 'from-rose-600/90 to-rose-800/90 border-rose-400/40',
    badge: 'Media / Video',
    filesCount: '1,240 ไฟล์'
  },
  {
    id: 'tm2',
    label: 'D:\\Workspace (target & node_modules)',
    path: 'D:\\Workspace',
    drive: 'D:',
    sizeGB: 96.4,
    percent: 20,
    color: 'from-violet-600/90 to-indigo-800/90 border-violet-400/40',
    badge: 'Dev Projects',
    filesCount: '412,900 ไฟล์'
  },
  {
    id: 'tm3',
    label: 'C:\\Users\\Admin\\AppData (Caches & WSL)',
    path: 'C:\\Users\\Admin\\AppData',
    drive: 'C:',
    sizeGB: 78.2,
    percent: 16,
    color: 'from-amber-600/90 to-orange-800/90 border-amber-400/40',
    badge: 'AppData & Docker',
    filesCount: '198,400 ไฟล์'
  },
  {
    id: 'tm4',
    label: 'D:\\AI_Models (Ollama GGUF Weights)',
    path: 'D:\\AI_Models',
    drive: 'D:',
    sizeGB: 64.0,
    percent: 13,
    color: 'from-emerald-600/90 to-teal-800/90 border-emerald-400/40',
    badge: 'AI / LLM Blobs',
    filesCount: '84 ไฟล์'
  },
  {
    id: 'tm5',
    label: 'C:\\Windows (System, Installer, WinSxS)',
    path: 'C:\\Windows',
    drive: 'C:',
    sizeGB: 52.8,
    percent: 12,
    color: 'from-sky-600/90 to-blue-800/90 border-sky-400/40',
    badge: 'System OS',
    filesCount: '164,120 ไฟล์'
  },
  {
    id: 'tm6',
    label: 'C:\\Program Files (Installed Apps)',
    path: 'C:\\Program Files',
    drive: 'C:',
    sizeGB: 48.1,
    percent: 11,
    color: 'from-slate-600/90 to-slate-800/90 border-slate-400/40',
    badge: 'Applications',
    filesCount: '89,300 ไฟล์'
  }
];

// Utility function to format MB into readable MB / GB
function formatSize(sizeMB) {
  if (sizeMB >= 1024) {
    return `${(sizeMB / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(sizeMB).toLocaleString()} MB`;
}

export default function App() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'storage' | 'cleaner' | 'ports'
  const [storageSubTab, setStorageSubTab] = useState('heavy'); // 'heavy' | 'duplicates'
  const [portSubTab, setPortSubTab] = useState('ports'); // 'ports' | 'unlocker' | 'startup'

  // Data state
  const [largeFiles, setLargeFiles] = useState(INITIAL_LARGE_FILES);
  const [duplicateGroups, setDuplicateGroups] = useState(INITIAL_DUPLICATE_GROUPS);
  const [junkCategories, setJunkCategories] = useState(INITIAL_JUNK_CATEGORIES);
  const [ports, setPorts] = useState(INITIAL_PORTS);
  const [lockedFiles, setLockedFiles] = useState(INITIAL_LOCKED_FILES);
  const [startupApps, setStartupApps] = useState(INITIAL_STARTUP_APPS);

  // Filters & UI controls
  const [selectedDrive, setSelectedDrive] = useState('ALL'); // 'ALL' | 'C:' | 'D:'
  const [selectedTreemapBlock, setSelectedTreemapBlock] = useState(null);
  const [storageSearch, setStorageSearch] = useState('');
  const [storageSortAsc, setStorageSortAsc] = useState(false);

  const [safeRecycleBin, setSafeRecycleBin] = useState(true);
  const [isScanningStorage, setIsScanningStorage] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);
  const [isCleaningJunk, setIsCleaningJunk] = useState(false);
  const [totalCleanedSessionMB, setTotalCleanedSessionMB] = useState(0);

  const [portSearch, setPortSearch] = useState('');
  const [portFilter, setPortFilter] = useState('ALL'); // 'ALL' | 'TCP' | 'UDP' | 'LISTENING' | 'DEV'
  const [copiedId, setCopiedId] = useState(null);

  // Live system telemetry simulation
  const [cpuUsage, setCpuUsage] = useState(18);
  const [ramUsageGB, setRamUsageGB] = useState(14.2);
  const [showIpcConsole, setShowIpcConsole] = useState(false);
  const [ipcLogs, setIpcLogs] = useState([
    {
      time: '10:15:02',
      cmd: 'invoke("get_system_drives")',
      detail: 'Rust sysinfo scanned 2 NVMe volumes in 4.2ms',
      status: 'OK'
    },
    {
      time: '10:15:03',
      cmd: 'invoke("scan_active_ports")',
      detail: 'Enumerated TCP/UDP socket table + PIDs via Win32 GetExtendedTcpTable (11.8ms)',
      status: 'OK'
    }
  ]);

  // Toast notification state (No browser alert() used)
  const [toast, setToast] = useState(null);

  const showToast = (title, subtitle, type = 'success') => {
    setToast({ title, subtitle, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Log simulated Tauri Rust IPC command
  const logTauriInvoke = (commandName, payload, responseSummary) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const argStr = payload ? JSON.stringify(payload) : '';
    setIpcLogs((prev) => [
      {
        time: timeStr,
        cmd: `invoke("${commandName}"${argStr ? `, ${argStr}` : ''})`,
        detail: responseSummary,
        status: 'OK'
      },
      ...prev.slice(0, 19)
    ]);
  };

  // Subtle CPU/RAM live fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.min(95, Math.max(6, prev + delta));
      });
      setRamUsageGB((prev) => {
        const delta = (Math.random() * 0.4 - 0.2);
        return Number(Math.min(31.2, Math.max(8.5, prev + delta)).toFixed(1));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // COMPUTED METRICS
  // ============================================================================

  // Total junk currently available & selected
  const { totalAvailableJunkMB, totalSelectedJunkMB, selectedJunkCount } = useMemo(() => {
    let available = 0;
    let selected = 0;
    let count = 0;
    junkCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        available += item.sizeMB;
        if (item.selected) {
          selected += item.sizeMB;
          count += 1;
        }
      });
    });
    return {
      totalAvailableJunkMB: available,
      totalSelectedJunkMB: selected,
      selectedJunkCount: count
    };
  }, [junkCategories]);

  // Filtered Large Files
  const filteredLargeFiles = useMemo(() => {
    return largeFiles
      .filter((f) => {
        if (selectedDrive !== 'ALL' && f.drive !== selectedDrive) return false;
        if (selectedTreemapBlock && !f.path.toLowerCase().startsWith(selectedTreemapBlock.path.toLowerCase().slice(0, 8))) {
          // Filter by drive or prefix if treemap block is clicked
          if (f.drive !== selectedTreemapBlock.drive) return false;
        }
        if (!storageSearch.trim()) return true;
        const q = storageSearch.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (storageSortAsc ? a.sizeMB - b.sizeMB : b.sizeMB - a.sizeMB));
  }, [largeFiles, selectedDrive, selectedTreemapBlock, storageSearch, storageSortAsc]);

  // Filtered Ports
  const filteredPorts = useMemo(() => {
    return ports.filter((p) => {
      if (portFilter === 'TCP' && p.protocol !== 'TCP') return false;
      if (portFilter === 'UDP' && p.protocol !== 'UDP') return false;
      if (portFilter === 'LISTENING' && p.state !== 'LISTENING') return false;
      if (portFilter === 'DEV' && !p.isDevPort) return false;

      if (!portSearch.trim()) return true;
      const q = portSearch.toLowerCase();
      return (
        String(p.port).includes(q) ||
        String(p.pid).includes(q) ||
        p.processName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.exePath.toLowerCase().includes(q) ||
        p.workingDir.toLowerCase().includes(q)
      );
    });
  }, [ports, portFilter, portSearch]);

  // ============================================================================
  // INTERACTIVE HANDLERS (SIMULATING TAURI RUST COMMANDS)
  // ============================================================================

  const handleTriggerStorageScan = () => {
    if (isScanningStorage) return;
    setIsScanningStorage(true);
    setScanProgress(12);

    // ในโปรเจกต์ Tauri จริง:
    // await invoke('scan_directory_jwalk', { drive: selectedDrive });
    logTauriInvoke(
      'scan_directory_jwalk',
      { drive: selectedDrive, threads: 16 },
      'Parallel directory walk started via Rust jwalk crate...'
    );

    const step1 = setTimeout(() => setScanProgress(48), 350);
    const step2 = setTimeout(() => setScanProgress(84), 700);
    const step3 = setTimeout(() => {
      setScanProgress(100);
      setIsScanningStorage(false);
      logTauriInvoke(
        'scan_directory_jwalk_complete',
        null,
        'Scanned 866,044 files across NVMe volumes in 1.05s'
      );
      showToast(
        'สแกนพื้นที่เสร็จสมบูรณ์ (1.05 วินาที)',
        'Rust jwalk สแกนไฟล์ทั้งหมด 866,044 ไฟล์เรียบร้อยแล้ว',
        'success'
      );
    }, 1050);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  const handleCopyPath = (id, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
    logTauriInvoke('clipboard_write_text', { path: text }, 'Copied full file path to OS clipboard');
    showToast('คัดลอก Path เรียบร้อยแล้ว', text, 'info');
  };

  const handleOpenFolder = (path) => {
    // ในโปรเจกต์ Tauri จริง:
    // await invoke('open_in_explorer', { path });
    logTauriInvoke('open_in_explorer', { path }, 'Opened Windows Explorer & highlighted target item');
    showToast('เปิดโฟลเดอร์ต้นทางใน Explorer', `กำลังเปิด: ${path}`, 'info');
  };

  const handleDeleteLargeFile = (file) => {
    // ในโปรเจกต์ Tauri จริง:
    // await invoke('delete_file_item', { path: file.path, recycleBin: true });
    setLargeFiles((prev) => prev.filter((item) => item.id !== file.id));
    setTotalCleanedSessionMB((prev) => prev + file.sizeMB);
    logTauriInvoke(
      'delete_file_item',
      { path: file.path, useRecycleBin: true },
      `Reclaimed ${formatSize(file.sizeMB)}`
    );
    showToast(
      `ลบ ${file.name} สำเร็จ`,
      `ได้พื้นที่คืนมา ${formatSize(file.sizeMB)} (ย้ายไปที่ Recycle Bin)`,
      'success'
    );
  };

  const handleCleanDuplicates = (group) => {
    const reclaimedMB = group.sizeEachMB * (group.copies.length - 1);
    setDuplicateGroups((prev) => prev.filter((g) => g.id !== group.id));
    setTotalCleanedSessionMB((prev) => prev + reclaimedMB);
    logTauriInvoke(
      'deduplicate_files_blake3',
      { hash: group.hash, keepIndex: 0 },
      `Removed ${group.copies.length - 1} duplicate copies, saved ${formatSize(reclaimedMB)}`
    );
    showToast(
      'ลบไฟล์ซ้ำเรียบร้อยแล้ว',
      `เก็บไฟล์ต้นฉบับไว้ 1 ไฟล์ และได้พื้นที่คืน ${formatSize(reclaimedMB)}`,
      'success'
    );
  };

  const handleToggleJunkCategory = (catId) => {
    setJunkCategories((prev) =>
      prev.map((cat) => (cat.id === catId ? { ...cat, expanded: !cat.expanded } : cat))
    );
  };

  const handleSelectAllInCategory = (catId, checked) => {
    setJunkCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: cat.items.map((it) => ({ ...it, selected: checked }))
            }
          : cat
      )
    );
  };

  const handleToggleJunkItem = (catId, itemId) => {
    setJunkCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: cat.items.map((it) =>
                it.id === itemId ? { ...it, selected: !it.selected } : it
              )
            }
          : cat
      )
    );
  };

  const handleCleanSelectedJunk = () => {
    if (selectedJunkCount === 0 || isCleaningJunk) return;
    setIsCleaningJunk(true);

    const cleanedMB = totalSelectedJunkMB;
    const count = selectedJunkCount;

    // ในโปรเจกต์ Tauri จริง:
    // await invoke('clean_junk_items', { items: selectedIds, safeToRecycleBin: safeRecycleBin });
    logTauriInvoke(
      'clean_junk_items',
      { count, safeRecycleBin },
      `Rust multi-threaded cleaner removing ${count} targets (${formatSize(cleanedMB)})`
    );

    setTimeout(() => {
      setJunkCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.filter((it) => !it.selected)
        }))
      );
      setTotalCleanedSessionMB((prev) => prev + cleanedMB);
      setIsCleaningJunk(false);
      showToast(
        `ล้างไฟล์ขยะสำเร็จ! ได้พื้นที่คืน ${formatSize(cleanedMB)}`,
        safeRecycleBin
          ? `ย้ายรายการขยะ ${count} รายการไปยังถังขยะอย่างปลอดภัยแล้ว`
          : `ลบไฟล์ขยะ ${count} รายการแบบถาวรเรียบร้อยแล้ว`,
        'success'
      );
    }, 900);
  };

  const handleRestoreDemoJunk = () => {
    setJunkCategories(INITIAL_JUNK_CATEGORIES);
    logTauriInvoke('rescan_junk_locations', null, 'Found 14 junk targets across C: and D:');
    showToast('สแกนพบรายการไฟล์ขยะใหม่', 'อัปเดตข้อมูลแคชและไฟล์ขยะล่าสุดเรียบร้อย', 'info');
  };

  const handleKillProcess = (portItem) => {
    // ในโปรเจกต์ Tauri จริง:
    // await invoke('kill_process_by_pid', { pid: portItem.pid });
    setPorts((prev) => prev.filter((p) => p.id !== portItem.id));
    logTauriInvoke(
      'kill_process_by_pid',
      { pid: portItem.pid, port: portItem.port, name: portItem.processName },
      `Terminated PID ${portItem.pid} and released Port ${portItem.port}`
    );
    showToast(
      `ปิด Process ${portItem.processName} (PID: ${portItem.pid}) สำเร็จ`,
      `พอร์ต ${portItem.port} (${portItem.protocol}) ว่างพร้อมใช้งานแล้ว`,
      'success'
    );
  };

  const handleSpawnTestPort = () => {
    const randomPort = [3001, 4000, 4200, 8081, 9000][Math.floor(Math.random() * 5)];
    const randomPid = Math.floor(10000 + Math.random() * 20000);
    const newPort = {
      id: `p_${Date.now()}`,
      port: randomPort,
      protocol: 'TCP',
      localAddress: `0.0.0.0:${randomPort}`,
      remoteAddress: '*:*',
      state: 'LISTENING',
      pid: randomPid,
      processName: 'node.exe',
      description: `Simulated Stuck Dev Server (Port ${randomPort})`,
      exePath: 'C:\\Program Files\\nodejs\\node.exe',
      workingDir: 'D:\\Workspace\\test-microservice',
      cpuPercent: 3.1,
      memoryMB: 490,
      isDevPort: true
    };
    setPorts((prev) => [newPort, ...prev]);
    logTauriInvoke('scan_active_ports', null, `Detected new listener on TCP :${randomPort} (PID ${randomPid})`);
    showToast(
      `จำลองพอร์ตค้าง :${randomPort} สำเร็จ`,
      `ลองค้นหาพอร์ต ${randomPort} แล้วกดปุ่ม Kill Process ได้เลย`,
      'info'
    );
  };

  const handleUnlockFile = (lockItem) => {
    // ในโปรเจกต์ Tauri จริง:
    // await invoke('unlock_file_handle', { pid: lockItem.pid, handleId: lockItem.handleId });
    setLockedFiles((prev) => prev.filter((item) => item.id !== lockItem.id));
    logTauriInvoke(
      'unlock_file_handle',
      { pid: lockItem.pid, handle: lockItem.handleId },
      `Closed Win32 file handle ${lockItem.handleId} held by ${lockItem.lockedByProcess}`
    );
    showToast(
      'ปลดล็อกไฟล์สำเร็จ!',
      `ปล่อย Handle จาก ${lockItem.lockedByProcess} เรียบร้อย คุณสามารถลบหรือย้ายไฟล์ได้ทันที`,
      'success'
    );
  };

  const handleToggleStartup = (id) => {
    setStartupApps((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          const nextState = !app.enabled;
          logTauriInvoke(
            'set_startup_registry',
            { app: app.name, enabled: nextState },
            `Updated HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`
          );
          showToast(
            `${nextState ? 'เปิด' : 'ปิด'}การรันอัตโนมัติ: ${app.name}`,
            'อัปเดตค่า Windows Startup Registry เรียบร้อยแล้ว',
            'info'
          );
          return { ...app, enabled: nextState };
        }
        return app;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* =====================================================================
          CUSTOM TAURI DESKTOP WINDOW TITLEBAR
      ===================================================================== */}
      <header className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between select-none sticky top-0 z-40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm text-white">SysPulse</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
              Tauri v2 • Rust Core
            </span>
          </div>
          <span className="hidden md:inline-block text-xs text-slate-500 pl-2 border-l border-slate-800">
            All-in-One Storage Analyzer, Smart Junk Cleaner & Port Inspector
          </span>
        </div>

        {/* Right Titlebar Controls & Rust IPC Log Toggle */}
        <div className="flex items-center gap-3">
          {totalCleanedSessionMB > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ได้พื้นที่คืนแล้ว: {formatSize(totalCleanedSessionMB)}</span>
            </div>
          )}

          <button
            onClick={() => setShowIpcConsole(!showIpcConsole)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition ${
              showIpcConsole
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="ดูคำสั่งเชื่อมต่อระหว่าง React และ Rust (Tauri invoke)"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Rust IPC Console ({ipcLogs.length})</span>
          </button>

          {/* Simulated Window Traffic Controls */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
            <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN BODY: LEFT SIDEBAR + CONTENT VIEWPORT
      ===================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT SIDEBAR (4 MAIN MENUS) */}
        <aside className="w-full lg:w-64 bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-800/90 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              เมนูจัดการระบบ (Main Menu)
            </div>

            {/* Menu 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>Dashboard</div>
                  <div className={`text-[11px] ${activeTab === 'dashboard' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    ภาพรวมระบบและไดรฟ์
                  </div>
                </div>
              </div>
            </button>

            {/* Menu 2: Storage Analyzer */}
            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'storage'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>Storage Analyzer</div>
                  <div className={`text-[11px] ${activeTab === 'storage' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    ไฟล์ใหญ่สุด & ไฟล์ซ้ำ
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'storage'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {largeFiles.length}
              </span>
            </button>

            {/* Menu 3: Junk Cleaner */}
            <button
              onClick={() => setActiveTab('cleaner')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'cleaner'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>Junk Cleaner</div>
                  <div className={`text-[11px] ${activeTab === 'cleaner' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    ล้างไฟล์ขยะ & แคช Dev
                  </div>
                </div>
              </div>
              {totalAvailableJunkMB > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    activeTab === 'cleaner'
                      ? 'bg-white text-indigo-700'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {formatSize(totalAvailableJunkMB)}
                </span>
              )}
            </button>

            {/* Menu 4: Port & Process Inspector */}
            <button
              onClick={() => setActiveTab('ports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'ports'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Network className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>Port & Process</div>
                  <div className={`text-[11px] ${activeTab === 'ports' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    เช็กพอร์ต, ที่อยู่ไฟล์ & ปลดล็อก
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'ports'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {ports.length}
              </span>
            </button>
          </div>

          {/* Live Resource Monitor Box in Sidebar */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="px-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" /> CPU Load
              </span>
              <span className="font-mono text-slate-200">{cpuUsage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${cpuUsage}%` }}
              />
            </div>

            <div className="px-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <MemoryStick className="w-3.5 h-3.5 text-violet-400" /> RAM (32 GB)
              </span>
              <span className="font-mono text-slate-200">{ramUsageGB} GB</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${(ramUsageGB / 32) * 100}%` }}
              />
            </div>

            {/* Architecture Info Pill */}
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Engine: Rust Backend</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div>Crates: jwalk, sysinfo, blake3</div>
              <div className="text-slate-500">App Memory: ~28.4 MB (WebView2)</div>
            </div>
          </div>
        </aside>

        {/* =====================================================================
            MAIN CONTENT VIEWPORT
        ===================================================================== */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
          {/* Toast Notification Floating Banner */}
          {toast && (
            <div className="fixed bottom-12 right-6 z-50 max-w-md bg-slate-900/95 border border-indigo-500/40 shadow-2xl rounded-xl p-4 flex items-start gap-3 backdrop-blur animate-in fade-in slide-in-from-bottom-4">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{toast.title}</div>
                <div className="text-xs text-slate-300 break-all mt-0.5">{toast.subtitle}</div>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
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
                    ภาพรวมระบบและพื้นที่จัดเก็บข้อมูล (System Overview)
                  </h1>
                  <p className="text-sm text-slate-400">
                    ตรวจสอบพื้นที่ไดรฟ์ ไฟล์ขนาดใหญ่ ขยะสะสม และพอร์ตที่กำลังเปิดใช้งานแบบเรียลไทม์
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      handleTriggerStorageScan();
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningStorage ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>สแกนระบบด่วน</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('cleaner')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างขยะ {formatSize(totalAvailableJunkMB)}</span>
                  </button>
                </div>
              </div>

              {/* 3 Quick Action Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Junk Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">
                        ไฟล์ขยะและแคชที่ลบได้
                      </span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {formatSize(totalAvailableJunkMB)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        พบใน %temp%, แคชเบราว์เซอร์ และ node_modules/target เก่า
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      <Trash2 className="w-5 h-5" />
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('cleaner')}
                    className="mt-4 w-full py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                  >
                    ไปที่หน้าตรวจสอบและล้างไฟล์ขยะ →
                  </button>
                </div>

                {/* Active Ports Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                        พอร์ตที่กำลังเปิดใช้งาน (Active Ports)
                      </span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {ports.length} พอร์ต{' '}
                        <span className="text-sm font-normal text-slate-400">
                          (Dev {ports.filter((p) => p.isDevPort).length} พอร์ต)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        เช่น 3000, 5173, 8080, 5432 พร้อมระบุตำแหน่งไฟล์ .exe
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Network className="w-5 h-5" />
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('ports')}
                    className="mt-4 w-full py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    ดูรายการพอร์ตและสั่ง Kill Process →
                  </button>
                </div>

                {/* Locked Files & Heavy Files Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                        ไฟล์ถูกล็อก & ไฟล์ซ้ำซ้อน
                      </span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {lockedFiles.length} ไฟล์ล็อก / {duplicateGroups.length} กลุ่มไฟล์ซ้ำ
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        ปลดล็อกไฟล์ที่ลบไม่ได้ (File in use) และเคลียร์ไฟล์ซ้ำ
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('ports');
                        setPortSubTab('unlocker');
                      }}
                      className="py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                    >
                      ปลดล็อกไฟล์ ({lockedFiles.length})
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('storage');
                        setStorageSubTab('duplicates');
                      }}
                      className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                    >
                      ดูไฟล์ซ้ำ ({duplicateGroups.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Drive Overview Cards (C: and D:) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Drive C: */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">Local Disk (C:) — NVMe SSD</h3>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            OS & Apps
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Samsung 990 PRO 512GB • NTFS</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">ว่าง 94.2 GB</div>
                      <div className="text-xs text-slate-400">ใช้ไป 417.8 GB / 512 GB (81%)</div>
                    </div>
                  </div>

                  {/* Multi-segment bar */}
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
                    <div className="bg-sky-500 h-full rounded-l-full" style={{ width: '32%' }} title="System & Windows: 164 GB" />
                    <div className="bg-indigo-500 h-full" style={{ width: '26%' }} title="Installed Apps: 132 GB" />
                    <div className="bg-amber-500 h-full" style={{ width: '15%' }} title="AppData & Docker WSL: 78 GB" />
                    <div className="bg-rose-500 h-full rounded-r-full" style={{ width: '8%' }} title="Temp & Cache: 43 GB" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Windows OS (164 GB)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> โปรแกรม (132 GB)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> AppData/Docker (78 GB)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> ขยะ/แคช (43 GB)
                    </span>
                  </div>
                </div>

                {/* Drive D: */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">Workspace & Data (D:) — NVMe</h3>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Projects & Media
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">WD Black SN850X 1TB • NTFS</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">ว่าง 388.0 GB</div>
                      <div className="text-xs text-slate-400">ใช้ไป 612.0 GB / 1,000 GB (61%)</div>
                    </div>
                  </div>

                  {/* Multi-segment bar */}
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
                    <div className="bg-rose-500 h-full rounded-l-full" style={{ width: '28%' }} title="4K Media & Footage: 280 GB" />
                    <div className="bg-violet-500 h-full" style={{ width: '18%' }} title="Workspace & Build Caches: 180 GB" />
                    <div className="bg-emerald-500 h-full" style={{ width: '10%' }} title="AI Models (GGUF): 100 GB" />
                    <div className="bg-slate-500 h-full rounded-r-full" style={{ width: '5%' }} title="Backups & Archives: 52 GB" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> วิดีโอ/มีเดีย (280 GB)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" /> โปรเจกต์โค้ด (180 GB)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> AI Models (100 GB)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" /> ไฟล์สำรอง (52 GB)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Preview: Top Largest Files & Active Dev Ports */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Preview Largest Files */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>อันดับไฟล์และโฟลเดอร์ที่กินพื้นที่มากที่สุด</span>
                      </h3>
                      <p className="text-xs text-slate-400">สแกนพบไฟล์ขนาดใหญ่ระดับ GB ในเครื่อง</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('storage')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      ดูทั้งหมด ({largeFiles.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {largeFiles.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-100 truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                            {item.path}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            {formatSize(item.sizeMB)}
                          </span>
                          <button
                            onClick={() => handleOpenFolder(item.path)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="เปิดโฟลเดอร์ที่เก็บไฟล์นี้"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Active Ports */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-400" />
                        <span>พอร์ตสำคัญที่กำลังเปิดใช้งาน (Active Listeners)</span>
                      </h3>
                      <p className="text-xs text-slate-400">ระบุโปรเซส ตำแหน่งไฟล์ .exe และสั่งปิดได้ทันที</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('ports')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      จัดการพอร์ตทั้งหมด ({ports.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {ports.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold">
                              :{p.port}
                            </span>
                            <span className="font-semibold text-sm text-white">
                              {p.processName}
                            </span>
                            <span className="text-xs text-slate-400 truncate">
                              — {p.description}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                            Path: {p.exePath}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                            PID {p.pid}
                          </span>
                          <button
                            onClick={() => handleKillProcess(p)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                          >
                            Kill
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: STORAGE ANALYZER (วิเคราะห์พื้นที่ & ไฟล์ใหญ่ที่สุด)
          ================================================================= */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              {/* Header & Drive Filter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    วิเคราะห์พื้นที่จัดเก็บข้อมูล (Storage & Deep File Analyzer)
                  </h1>
                  <p className="text-sm text-slate-400">
                    สแกนโครงสร้างไฟล์แบบ Multi-threaded ด้วย Rust <code className="text-indigo-300">jwalk</code> เพื่อหาว่าไฟล์ไหนกินพื้นที่มากที่สุด
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['ALL', 'C:', 'D:'].map((drv) => (
                    <button
                      key={drv}
                      onClick={() => {
                        setSelectedDrive(drv);
                        setSelectedTreemapBlock(null);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        selectedDrive === drv
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {drv === 'ALL' ? 'ทุกไดรฟ์ (All Drives)' : `ไดรฟ์ ${drv}`}
                    </button>
                  ))}

                  <button
                    onClick={handleTriggerStorageScan}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningStorage ? 'animate-spin' : ''}`} />
                    <span>Rescan with Rust (jwalk)</span>
                  </button>
                </div>
              </div>

              {/* Scanning Progress Bar (when active) */}
              {isScanningStorage && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-200">
                    <span className="font-semibold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      กำลังสแกนไฟล์ระดับ MFT/Directory ด้วย Rust jwalk (16 Threads)...
                    </span>
                    <span className="font-mono">{scanProgress}% (~215,000 files/sec)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Visual Treemap Section */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>แผนผังสัดส่วนพื้นที่โฟลเดอร์ขนาดใหญ่ (Interactive Visual Treemap)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      คลิกที่บล็อกเพื่อกรองดูไฟล์ภายในไดรฟ์หรือหมวดหมู่นั้น
                    </p>
                  </div>
                  {selectedTreemapBlock && (
                    <button
                      onClick={() => setSelectedTreemapBlock(null)}
                      className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 self-start sm:self-auto"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างตัวกรอง ({selectedTreemapBlock.label})
                    </button>
                  )}
                </div>

                {/* Proportional Visual Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 min-h-[190px]">
                  {TREEMAP_BLOCKS.filter(
                    (b) => selectedDrive === 'ALL' || b.drive === selectedDrive
                  ).map((block, idx) => {
                    const colSpan =
                      idx === 0
                        ? 'md:col-span-4'
                        : idx === 1
                        ? 'md:col-span-3'
                        : idx === 2
                        ? 'md:col-span-3'
                        : 'md:col-span-2';
                    const isSelected = selectedTreemapBlock?.id === block.id;
                    return (
                      <div
                        key={block.id}
                        onClick={() =>
                          setSelectedTreemapBlock(isSelected ? null : block)
                        }
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
                            <span className="text-xs font-mono font-bold text-white/90">
                              {block.percent}%
                            </span>
                          </div>
                          <div className="font-bold text-sm text-white mt-2 break-all">
                            {block.label}
                          </div>
                        </div>

                        <div className="mt-4 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-white/90">
                          <span className="font-mono font-bold text-base">
                            {block.sizeGB} GB
                          </span>
                          <span className="text-[11px] text-white/75">{block.filesCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-tabs: Top Heavy Files vs Duplicate File Finder */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStorageSubTab('heavy')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      storageSubTab === 'heavy'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    ไฟล์และโฟลเดอร์ขนาดใหญ่ที่สุด ({filteredLargeFiles.length})
                  </button>
                  <button
                    onClick={() => setStorageSubTab('duplicates')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                      storageSubTab === 'duplicates'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>ค้นหาไฟล์ซ้ำด้วย BLAKE3 Hash</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[11px]">
                      {duplicateGroups.length} กลุ่ม
                    </span>
                  </button>
                </div>

                {storageSubTab === 'heavy' && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={storageSearch}
                        onChange={(e) => setStorageSearch(e.target.value)}
                        placeholder="ค้นหาชื่อไฟล์, Path, .iso, node_modules..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => setStorageSortAsc(!storageSortAsc)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{storageSortAsc ? 'เล็ก → ใหญ่' : 'ใหญ่ → เล็ก'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SUB-TAB 2.1: HEAVY FILES TABLE */}
              {storageSubTab === 'heavy' && (
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                          <th className="py-3 px-4">ชื่อไฟล์ / โฟลเดอร์</th>
                          <th className="py-3 px-4">ตำแหน่งที่ตั้งไฟล์ (Full Path)</th>
                          <th className="py-3 px-4">หมวดหมู่</th>
                          <th className="py-3 px-4">แก้ไขล่าสุด</th>
                          <th className="py-3 px-4 text-right">ขนาดไฟล์</th>
                          <th className="py-3 px-4 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-sm">
                        {filteredLargeFiles.map((file) => (
                          <tr
                            key={file.id}
                            className="hover:bg-slate-800/40 transition group"
                          >
                            <td className="py-3.5 px-4 font-medium text-white">
                              <div className="flex items-center gap-2.5">
                                {file.type === 'folder' ? (
                                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                                )}
                                <span className="truncate max-w-[220px]" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 font-mono text-xs text-slate-300 max-w-md">
                                <span className="truncate" title={file.path}>
                                  {file.path}
                                </span>
                                <button
                                  onClick={() => handleCopyPath(file.id, file.path)}
                                  className="opacity-70 hover:opacity-100 text-slate-400 hover:text-white shrink-0"
                                  title="คัดลอก Path"
                                >
                                  {copiedId === file.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {file.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>{file.lastModified}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                              {formatSize(file.sizeMB)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenFolder(file.path)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                                  <span>เปิดโฟลเดอร์</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteLargeFile(file)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>ลบ</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {filteredLargeFiles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-500 text-sm">
                              ไม่พบรายการไฟล์ที่ตรงกับคำค้นหา
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2.2: DUPLICATE FILE FINDER */}
              {storageSubTab === 'duplicates' && (
                <div className="space-y-4">
                  {duplicateGroups.map((group) => {
                    const wastedMB = group.sizeEachMB * (group.copies.length - 1);
                    return (
                      <div
                        key={group.id}
                        className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-white text-base">{group.name}</h3>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {group.hash}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              ขนาดไฟล์ละ {formatSize(group.sizeEachMB)} • พบซ้ำกัน {group.copies.length} ตำแหน่ง (เสียพื้นที่ฟรี{' '}
                              <span className="text-rose-400 font-semibold">{formatSize(wastedMB)}</span>)
                            </p>
                          </div>

                          <button
                            onClick={() => handleCleanDuplicates(group)}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 shrink-0 transition"
                          >
                            ลบไฟล์ซ้ำ (เก็บต้นฉบับไว้ 1 ไฟล์ • คืนพื้นที่ {formatSize(wastedMB)})
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          {group.copies.map((copy, index) => (
                            <div
                              key={copy.path}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded font-semibold ${
                                    index === 0
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {index === 0 ? 'เก็บไว้ (Original)' : 'ไฟล์ซ้ำ (จะถูกลบ)'}
                                </span>
                                <span className="font-mono text-slate-300 truncate">
                                  {copy.path}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-slate-400">
                                <span>{copy.date}</span>
                                <button
                                  onClick={() => handleOpenFolder(copy.path)}
                                  className="text-sky-400 hover:underline"
                                >
                                  เปิดดู
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {duplicateGroups.length === 0 && (
                    <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <div className="text-base font-bold text-white">ไม่มีไฟล์ซ้ำในระบบแล้ว!</div>
                      <p className="text-xs text-slate-400">
                        ไฟล์ที่ซ้ำซ้อนทั้งหมดถูกจัดการเรียบร้อยแล้ว
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 3: SMART JUNK CLEANER (ระบบล้างไฟล์ขยะอัจฉริยะ)
          ================================================================= */}
          {activeTab === 'cleaner' && (
            <div className="space-y-6">
              {/* Top Cleaner Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Smart System & Developer Junk Cleaner</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    พร้อมเคลียร์พื้นที่ว่าง{' '}
                    <span className="text-emerald-400 font-mono">
                      {formatSize(totalSelectedJunkMB)}
                    </span>
                  </h1>
                  <p className="text-sm text-slate-300 max-w-2xl">
                    แยกหมวดหมู่ไฟล์ขยะระบบ แคชของโปรแกรม/เบราว์เซอร์ และโฟลเดอร์ Build Artifacts สายพัฒนาซอฟต์แวร์ (<code className="text-indigo-300">node_modules</code>, <code className="text-indigo-300">target</code>, <code className="text-indigo-300">.venv</code>) อย่างชัดเจน
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
                  {/* Safe Delete Toggle */}
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      checked={safeRecycleBin}
                      onChange={(e) => setSafeRecycleBin(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>ย้ายไปถังขยะก่อนลบถาวร (Safe Mode: Recycle Bin)</span>
                  </label>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleRestoreDemoJunk}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>สแกนหาขยะใหม่</span>
                    </button>

                    <button
                      onClick={handleCleanSelectedJunk}
                      disabled={selectedJunkCount === 0 || isCleaningJunk}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl transition ${
                        selectedJunkCount === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-rose-600/25'
                      }`}
                    >
                      <Trash2 className={`w-4 h-4 ${isCleaningJunk ? 'animate-bounce' : ''}`} />
                      <span>
                        {isCleaningJunk
                          ? 'กำลังล้างไฟล์ขยะด้วย Rust...'
                          : `ล้างไฟล์ขยะที่เลือก (${selectedJunkCount} รายการ)`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Junk Categories Accordion List */}
              <div className="space-y-4">
                {junkCategories.map((cat) => {
                  const catTotalMB = cat.items.reduce((acc, i) => acc + i.sizeMB, 0);
                  const catSelectedMB = cat.items
                    .filter((i) => i.selected)
                    .reduce((acc, i) => acc + i.sizeMB, 0);
                  const allChecked =
                    cat.items.length > 0 && cat.items.every((i) => i.selected);

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden"
                    >
                      {/* Category Header */}
                      <div className="p-4 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            disabled={cat.items.length === 0}
                            onChange={(e) =>
                              handleSelectAllInCategory(cat.id, e.target.checked)
                            }
                            className="mt-1 w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div
                            onClick={() => handleToggleJunkCategory(cat.id)}
                            className="cursor-pointer select-none"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-base">
                                {cat.title}
                              </span>
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                                {cat.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {cat.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold font-mono text-amber-400">
                              เลือก {formatSize(catSelectedMB)} / {formatSize(catTotalMB)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {cat.items.length} รายการในหมวดนี้
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleJunkCategory(cat.id)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          >
                            {cat.expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Category Items */}
                      {cat.expanded && (
                        <div className="divide-y divide-slate-800/60">
                          {cat.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition"
                            >
                              <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleJunkItem(cat.id, item.id)}
                                  className="mt-1 w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-sm text-slate-100">
                                      {item.name}
                                    </span>
                                    {item.daysInactive && (
                                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                        {item.lastModified}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                                    {item.path} ({item.fileCount.toLocaleString()} ไฟล์)
                                  </div>
                                </div>
                              </label>

                              <div className="flex items-center justify-end gap-3 shrink-0">
                                <span className="text-sm font-mono font-bold text-slate-200">
                                  {formatSize(item.sizeMB)}
                                </span>
                                <button
                                  onClick={() => handleOpenFolder(item.path)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  title="เปิดดูโฟลเดอร์"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {cat.items.length === 0 && (
                            <div className="p-6 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>หมวดหมู่นี้สะอาดเรียบร้อยแล้ว ไม่พบไฟล์ขยะค้างอยู่</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 4: PORT & PROCESS INSPECTOR (ตรวจสอบพอร์ต ที่อยู่โปรแกรม & ปลดล็อกไฟล์)
          ================================================================= */}
          {activeTab === 'ports' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    ระบบตรวจสอบพอร์ต ที่ตั้งโปรแกรม และปลดล็อกไฟล์ (Port & Process Inspector)
                  </h1>
                  <p className="text-sm text-slate-400">
                    ตรวจสอบว่าแต่ละโปรแกรมรันมาจากโฟลเดอร์ไหน กำลังใช้พอร์ตอะไรอยู่ และสั่งปิด Process หรือปลดล็อกไฟล์ได้ในคลิกเดียว
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSpawnTestPort}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>จำลองพอร์ตค้าง (Test Port)</span>
                  </button>
                </div>
              </div>

              {/* Sub-navigation tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setPortSubTab('ports')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                      portSubTab === 'ports'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>พอร์ตที่เปิดใช้งาน & ที่อยู่โปรแกรม ({ports.length})</span>
                  </button>

                  <button
                    onClick={() => setPortSubTab('unlocker')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                      portSubTab === 'unlocker'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>ปลดล็อกไฟล์ที่ลบไม่ได้ (File Unlocker)</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[11px]">
                      {lockedFiles.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setPortSubTab('startup')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                      portSubTab === 'startup'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>โปรแกรมเปิดอัตโนมัติ (Startup Manager)</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB 4.1: ACTIVE PORT MAPPER */}
              {portSubTab === 'ports' && (
                <div className="space-y-4">
                  {/* Search & Filter Bar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={portSearch}
                        onChange={(e) => setPortSearch(e.target.value)}
                        placeholder="ค้นหาเลขพอร์ต (เช่น 3000, 5173, 8080), ชื่อโปรเซส (node.exe), PID หรือที่อยู่ไฟล์..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'ALL', label: 'ทั้งหมด' },
                        { id: 'DEV', label: 'เฉพาะพอร์ตสาย Dev' },
                        { id: 'LISTENING', label: 'LISTENING' },
                        { id: 'TCP', label: 'TCP' },
                        { id: 'UDP', label: 'UDP' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setPortFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                            portFilter === f.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ports Table */}
                  <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                            <th className="py-3 px-4">พอร์ต (Port)</th>
                            <th className="py-3 px-4">สถานะ</th>
                            <th className="py-3 px-4">โปรแกรม (Process & PID)</th>
                            <th className="py-3 px-4">ที่อยู่ไฟล์โปรแกรม (.exe Path & Working Dir)</th>
                            <th className="py-3 px-4 text-right">CPU / RAM</th>
                            <th className="py-3 px-4 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-sm">
                          {filteredPorts.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-800/40 transition">
                              {/* Port & Protocol */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold">
                                    :{p.port}
                                  </span>
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {p.protocol}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 mt-1">
                                  {p.localAddress}
                                </div>
                              </td>

                              {/* State */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                    p.state === 'LISTENING'
                                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                      : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                                  }`}
                                >
                                  {p.state}
                                </span>
                              </td>

                              {/* Process Name & PID */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                  <span className="font-bold text-white">{p.processName}</span>
                                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                                    PID: {p.pid}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {p.description}
                                </div>
                              </td>

                              {/* Full Executable Path & Working Dir */}
                              <td className="py-3.5 px-4 max-w-md">
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                                  <span className="truncate" title={p.exePath}>
                                    {p.exePath}
                                  </span>
                                  <button
                                    onClick={() => handleCopyPath(p.id, p.exePath)}
                                    className="text-slate-400 hover:text-white shrink-0"
                                    title="คัดลอกที่อยู่ไฟล์ .exe"
                                  >
                                    {copiedId === p.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                  WorkDir: <span className="text-indigo-300">{p.workingDir}</span>
                                </div>
                              </td>

                              {/* CPU & Memory */}
                              <td className="py-3.5 px-4 text-right font-mono text-xs">
                                <div className="text-slate-200">{p.memoryMB} MB</div>
                                <div className="text-slate-400">{p.cpuPercent}% CPU</div>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenFolder(p.exePath)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                    title="เปิดโฟลเดอร์ที่โปรแกรมนี้ติดตั้งอยู่"
                                  >
                                    <FolderOpen className="w-4 h-4 text-sky-400" />
                                  </button>
                                  <button
                                    onClick={() => handleKillProcess(p)}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold flex items-center gap-1 transition"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Kill Process</span>
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

              {/* SUB-TAB 4.2: FILE LOCK DETECTOR & UNLOCKER */}
              {portSubTab === 'unlocker' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-6 h-6 text-amber-400 shrink-0" />
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          แก้ปัญหาลบไฟล์หรือโฟลเดอร์ไม่ได้ (&quot;The action can&apos;t be completed because the file is open in another program&quot;)
                        </h3>
                        <p className="text-xs text-slate-300">
                          ตรวจสอบว่า Process ไหนแอบล็อก Handle ของไฟล์ไว้ พร้อมสั่งปลดล็อกได้โดยไม่ต้องรีสตาร์ทเครื่อง
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {lockedFiles.map((lk) => (
                      <div
                        key={lk.id}
                        className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              ถูกล็อกโดย: {lk.lockedByProcess} (PID: {lk.pid})
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              Win32 Handle: {lk.handleId}
                            </span>
                          </div>
                          <div className="font-mono text-sm font-semibold text-white break-all">
                            ไฟล์เป้าหมาย: {lk.targetName}
                          </div>
                          <div className="text-xs text-slate-400">
                            สาเหตุ: {lk.reason} • ตำแหน่งโปรแกรมต้นเหตุ:{' '}
                            <span className="font-mono text-slate-300">{lk.exePath}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => handleOpenFolder(lk.exePath)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                            <span>ดูโปรแกรมต้นเหตุ</span>
                          </button>
                          <button
                            onClick={() => handleUnlockFile(lk)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>ปลดล็อกไฟล์ทันที (Unlock Handle)</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {lockedFiles.length === 0 && (
                      <div className="p-10 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                        <div className="text-base font-bold text-white">
                          ปลดล็อกไฟล์ทั้งหมดเรียบร้อยแล้ว!
                        </div>
                        <p className="text-xs text-slate-400">
                          ไม่มีไฟล์หรือโฟลเดอร์ที่ถูก Process เบื้องหลังล็อกค้างไว้
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 4.3: STARTUP MANAGER */}
              {portSubTab === 'startup' && (
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                          <th className="py-3 px-4">ชื่อโปรแกรม (Startup Application)</th>
                          <th className="py-3 px-4">ผู้พัฒนา</th>
                          <th className="py-3 px-4">คำสั่งและตำแหน่งไฟล์ที่รันตอนเปิดเครื่อง</th>
                          <th className="py-3 px-4">ผลกระทบต่อเวลาบูต</th>
                          <th className="py-3 px-4 text-right">สถานะการทำงาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-sm">
                        {startupApps.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-4 font-bold text-white">{app.name}</td>
                            <td className="py-3.5 px-4 text-xs text-slate-400">{app.publisher}</td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                              {app.path}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                  app.impact === 'High'
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : app.impact === 'Medium'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {app.impact} Impact
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleToggleStartup(app.id)}
                                className={`px-3.5 py-1 rounded-full text-xs font-bold transition ${
                                  app.enabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {app.enabled ? 'เปิดใช้งาน (Enabled)' : 'ปิดไว้ (Disabled)'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAURI RUST IPC CONSOLE DRAWER (TOGGLEABLE FOR DEVELOPERS)
          ================================================================= */}
          {showIpcConsole && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Terminal className="w-4 h-4" />
                  <span>Tauri IPC Bridge Console — บันทึกการเรียกคำสั่งจาก React ไปยัง Rust Backend</span>
                </div>
                <button
                  onClick={() => setShowIpcConsole(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ซ่อนหน้าต่างนี้
                </button>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-xs">
                {ipcLogs.map((log, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span className="text-emerald-400 font-semibold">{log.cmd}</span>
                      <span className="text-slate-300 truncate">→ {log.detail}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          BOTTOM STATUS FOOTER BAR
      ===================================================================== */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Tauri IPC Connected (Rust 1.84)
          </span>
          <span className="hidden sm:inline">Scanner Engine: jwalk (16 Threads)</span>
          <span className="hidden md:inline">Hash Engine: BLAKE3</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span>Active Ports: {ports.length}</span>
          <span>Reclaimable Junk: {formatSize(totalAvailableJunkMB)}</span>
        </div>
      </footer>
    </div>
  );
}