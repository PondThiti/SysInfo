import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Activity,
  HardDrive,
  Trash2,
  PieChart,
  Folder,
  FolderInput,
  Gamepad2,
  Package,
  Network,
  Settings,
  Terminal,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { TabType } from '../App';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  systemDrives: any[];
  conflicts: any[];
  totalAvailableJunkMB: number;
  gameCount: number;
  lastScanTime: string;
  onTriggerScan: () => void;
  isScanning: boolean;
  onToggleIpc: () => void;
  showIpcConsole: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  systemDrives,
  conflicts,
  totalAvailableJunkMB,
  gameCount,
  lastScanTime,
  onTriggerScan,
  isScanning,
  onToggleIpc,
  showIpcConsole,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Accordion state for collapsible sub-menus
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('sysinfo_nav_expanded');
      return saved ? JSON.parse(saved) : { storage: true, files: true };
    } catch {
      return { storage: true, files: true };
    }
  });

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('sysinfo_nav_expanded', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Helper to format junk size
  const formatSize = (sizeMB: number) => {
    if (sizeMB >= 1024) return `${(sizeMB / 1024).toFixed(1)} GB`;
    return `${Math.round(sizeMB)} MB`;
  };

  // Check if a child tab is active
  const isStorageActive = activeTab === 'storage' || activeTab === 'cleaner';
  const isFilesActive = activeTab === 'organizer' || activeTab === 'games';

  return (
    <aside
      className={`h-full flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-150 border-r border-[var(--border)] bg-[var(--bg-sidebar)] ${
        collapsed ? 'w-[68px]' : 'w-[220px]'
      }`}
    >
      {/* 1. Top Section: Logo & Navigation Items */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* App Logo & Collapse Toggle */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-[var(--border)]/70 shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--bar)] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Activity className="w-4 h-4 text-white" strokeWidth={1.75} />
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-sm tracking-tight text-[var(--text)]">SysInfo</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-pill)] text-[var(--text-muted)] font-mono border border-[var(--border)]">
                  v0.1.5
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-lg bg-[var(--bar)] text-white flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-white" strokeWidth={1.75} />
              </div>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`w-7 h-7 rounded-lg hover:bg-[var(--bg-pill)] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition cursor-pointer ${
              collapsed ? 'hidden' : 'block'
            }`}
            title="ย่อแถบเมนู (Collapse Sidebar)"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* If collapsed, show small expand button at top */}
        {collapsed && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded-lg hover:bg-[var(--bg-pill)] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition cursor-pointer"
              title="ขยายแถบเมนู (Expand Sidebar)"
            >
              <PanelLeftOpen className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Navigation Menu List */}
        <nav className="p-2 space-y-1 text-xs">
          {/* 1. ภาพรวม (Overview) */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
            }`}
            title="ภาพรวมสถานะระบบ"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">ภาพรวม</span>}
          </button>

          {/* 2. ไดรฟ์ (Drive Health S.M.A.R.T.) */}
          <button
            onClick={() => onSelectTab('health')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'health'
                ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
            }`}
            title="สุขภาพไดรฟ์ (S.M.A.R.T.)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Activity className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">ไดรฟ์</span>}
            </div>
            {!collapsed && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-[var(--ok-bg)] text-[var(--ok)]">
                S.M.A.R.T.
              </span>
            )}
          </button>

          {/* 3. พื้นที่จัดเก็บ (Storage Group with Chevron) */}
          <div>
            <button
              onClick={() => {
                if (collapsed) {
                  onSelectTab('storage');
                } else {
                  toggleMenu('storage');
                }
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer ${
                isStorageActive && !collapsed
                  ? 'text-[var(--text)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
              }`}
              title="พื้นที่จัดเก็บ"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <HardDrive className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">พื้นที่จัดเก็บ</span>}
              </div>
              {!collapsed && (
                <div className="text-[var(--text-muted)]">
                  {expandedMenus.storage ? (
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  )}
                </div>
              )}
            </button>

            {/* Sub-items for Storage */}
            {(!collapsed && expandedMenus.storage) && (
              <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-[var(--border)] ml-4 mt-0.5">
                <button
                  onClick={() => onSelectTab('storage')}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                    activeTab === 'storage'
                      ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/50'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">วิเคราะห์พื้นที่</span>
                </button>

                <button
                  onClick={() => onSelectTab('cleaner')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                    activeTab === 'cleaner'
                      ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">ล้างไฟล์ขยะ</span>
                  </div>
                  {totalAvailableJunkMB > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums bg-[var(--warn-bg)] text-[var(--warn)]">
                      {formatSize(totalAvailableJunkMB)}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 4. ไฟล์และเกม (Files & Games Group with Chevron) */}
          <div>
            <button
              onClick={() => {
                if (collapsed) {
                  onSelectTab('organizer');
                } else {
                  toggleMenu('files');
                }
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer ${
                isFilesActive && !collapsed
                  ? 'text-[var(--text)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
              }`}
              title="จัดการไฟล์และเกม"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Folder className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">จัดการไฟล์</span>}
              </div>
              {!collapsed && (
                <div className="text-[var(--text-muted)]">
                  {expandedMenus.files ? (
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  )}
                </div>
              )}
            </button>

            {/* Sub-items for Files */}
            {(!collapsed && expandedMenus.files) && (
              <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-[var(--border)] ml-4 mt-0.5">
                <button
                  onClick={() => onSelectTab('organizer')}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                    activeTab === 'organizer'
                      ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/50'
                  }`}
                >
                  <FolderInput className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">จัดระเบียบไฟล์</span>
                </button>

                <button
                  onClick={() => onSelectTab('games')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                    activeTab === 'games'
                      ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Gamepad2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">จัดการเกม</span>
                  </div>
                  {gameCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums bg-[var(--bg-pill)] text-[var(--text)] border border-[var(--border)]">
                      {gameCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 5. แอปพลิเคชัน (Installed Apps) */}
          <button
            onClick={() => onSelectTab('apps')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'apps'
                ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
            }`}
            title="แอปพลิเคชันที่ติดตั้ง"
          >
            <Package className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">แอปพลิเคชัน</span>}
          </button>

          {/* 6. พอร์ต & เครือข่าย (Ports & Conflicts) */}
          <button
            onClick={() => onSelectTab('ports')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'ports'
                ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
            }`}
            title="พอร์ต & ข้อขัดแย้ง"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Network className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">พอร์ต & เครือข่าย</span>}
            </div>
            {!collapsed && conflicts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums bg-[var(--crit-bg)] text-[var(--crit)] animate-pulse">
                {conflicts.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 2. Bottom Section: Dark Scan Card + Settings & IPC */}
      <div className="p-2.5 pt-0 shrink-0 space-y-2 border-t border-[var(--border)]/70">
        {/* Dark Rounded Card: Last Scan & Rescan (Strictly NOT an Upgrade/Ad) */}
        {!collapsed ? (
          <div className="p-3.5 rounded-[20px] bg-[var(--bg-card-dark)] text-[var(--text-on-dark)] border border-slate-700/50 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">สแกนล่าสุด</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tabular-nums tracking-tight">
                {lastScanTime || 'วันนี้ 11:30 น.'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ระบบมอนิเตอร์ไดรฟ์พร้อมทำงาน
              </div>
            </div>
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="w-full py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              <span>{isScanning ? 'กำลังสแกน...' : 'สแกนใหม่'}</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="w-10 h-10 rounded-xl bg-[var(--bg-card-dark)] text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer shadow-sm"
              title={`สแกนล่าสุด: ${lastScanTime || 'วันนี้ 11:30 น.'} - กดเพื่อสแกนใหม่`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Settings & IPC Console navigation */}
        <div className="space-y-0.5 pt-1">
          <button
            onClick={() => onSelectTab('settings')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer text-xs ${
              activeTab === 'settings'
                ? 'bg-[var(--bg-pill)] text-[var(--text)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
            }`}
            title="ตั้งค่าระบบ & BETA"
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">ตั้งค่า</span>}
          </button>

          <button
            onClick={onToggleIpc}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer text-xs ${
              showIpcConsole
                ? 'bg-[var(--warn-bg)] text-[var(--warn)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]/60 font-medium'
            }`}
            title="คอนโซลวินิจฉัย IPC Backend"
          >
            <Terminal className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">วินิจฉัย IPC</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
