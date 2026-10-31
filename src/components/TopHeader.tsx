import React from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Minus,
  Square,
  X,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface TopHeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  timeRange: 'day' | 'week' | 'month' | 'year';
  onChangeTimeRange: (range: 'day' | 'week' | 'month' | 'year') => void;
  dateRangeText: string;
  onOpenSearch: () => void;
  hasUnreadAlerts: boolean;
  onToggleNotifications: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  showTimeFilter?: boolean;
  totalCleanedMB?: number;
}

export default function TopHeader({
  pageTitle,
  pageSubtitle,
  timeRange,
  onChangeTimeRange,
  dateRangeText,
  onOpenSearch,
  hasUnreadAlerts,
  onToggleNotifications,
  theme,
  onToggleTheme,
  showTimeFilter = true,
  totalCleanedMB = 0,
}: TopHeaderProps) {
  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  return (
    <header className="shrink-0 bg-[var(--bg-card)]/90 backdrop-blur border-b border-[var(--border)] px-4 md:px-6 pt-3 pb-3 select-none titlebar-drag-region z-20">
      {/* Top Row: Page Title + Search + Actions + Window Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Page Title */}
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text)] truncate">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
              {pageSubtitle}
            </p>
          )}
        </div>

        {/* Right: Search Pill + Notification + Theme Toggle + Native Window Controls */}
        <div className="flex items-center gap-2 md:gap-2.5 no-drag shrink-0">
          {totalCleanedMB > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs bg-[var(--ok-bg)] text-[var(--ok)] border border-[var(--ok)]/30 px-3 py-1 rounded-full tabular-nums font-medium">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>ได้พื้นที่คืน: {formatSize(totalCleanedMB)}</span>
            </div>
          )}

          {/* Search Box Capsule (Ctrl+K) */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-pill)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition cursor-pointer shadow-xs"
            title="ค้นหาหรือเปิดคำสั่งลัด (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">ค้นหาด่วน...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[var(--text-muted)] border border-[var(--border)]">
              Ctrl+K
            </kbd>
          </button>

          {/* Round Notification Button */}
          <button
            onClick={onToggleNotifications}
            className="relative w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text)] transition cursor-pointer"
            title="การแจ้งเตือนระบบ"
          >
            <Bell className="w-3.5 h-3.5" strokeWidth={1.75} />
            {hasUnreadAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--crit)] ring-2 ring-[var(--bg-card)] animate-pulse" />
            )}
          </button>

          {/* Round Quick Theme Toggle [BETA] */}
          <button
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text)] transition cursor-pointer"
            title={
              theme === 'dark'
                ? 'สลับเป็นธีมสีขาว (Switch to Light Theme) [BETA]'
                : 'สลับเป็นธีมสีมืด (Switch to Dark Theme) [BETA]'
            }
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" strokeWidth={1.75} />
            )}
          </button>

          {/* Native Window Controls */}
          <div className="flex items-center gap-1 pl-2 border-l border-[var(--border)]">
            <button
              onClick={() => (window as any).electronAPI?.minimize?.()}
              className="w-7 h-7 rounded-lg hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
              title="ย่อหน้าต่าง (Minimize)"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => (window as any).electronAPI?.maximize?.()}
              className="w-7 h-7 rounded-lg hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
              title="ขยาย/คืนขนาดหน้าต่าง (Maximize)"
            >
              <Square className="w-3 h-3" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => (window as any).electronAPI?.close?.()}
              className="w-7 h-7 rounded-lg hover:bg-[var(--crit)] hover:text-white flex items-center justify-center text-[var(--text-muted)] transition cursor-pointer"
              title="ปิดโปรแกรม (Close)"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Under-Header Row: Segmented Pills (วัน / สัปดาห์ / เดือน / ปี) + Date Range Pill */}
      {showTimeFilter && (
        <div className="mt-3 pt-2.5 border-t border-[var(--border)]/70 flex flex-wrap items-center justify-between gap-2.5 no-drag">
          <div className="inline-flex p-1 rounded-full bg-[var(--bg-pill)] border border-[var(--border)] text-xs font-medium shadow-xs">
            {(
              [
                { id: 'day', label: 'วัน' },
                { id: 'week', label: 'สัปดาห์' },
                { id: 'month', label: 'เดือน' },
                { id: 'year', label: 'ปี' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => onChangeTimeRange(item.id)}
                className={`px-3.5 py-1 rounded-full transition cursor-pointer ${
                  timeRange === item.id
                    ? 'bg-[var(--bg-card-dark)] text-white font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Clickable Date Range Pill */}
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-xs font-medium text-[var(--text)] flex items-center gap-2 shadow-xs cursor-default">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
            <span className="tabular-nums">{dateRangeText}</span>
          </div>
        </div>
      )}
    </header>
  );
}
