import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Activity,
  HardDrive,
  Trash2,
  FolderInput,
  Gamepad2,
  Package,
  Network,
  Settings,
  RefreshCw,
  Sun,
  Moon,
  Terminal,
  ArrowRight,
  X,
} from 'lucide-react';
import type { TabType } from '../App';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  onTriggerScan: () => void;
  onToggleTheme: () => void;
  onToggleIpc: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'หน้าหลัก' | 'คำสั่งด่วน';
  subtitle: string;
  icon: any;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectTab,
  onTriggerScan,
  onToggleTheme,
  onToggleIpc,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: 'tab_dashboard',
      title: 'ภาพรวมระบบ (Overview)',
      category: 'หน้าหลัก',
      subtitle: 'ดูสถานะสรุป ไดรฟ์ สุขภาพฮาร์ดแวร์ และทรัพยากร',
      icon: LayoutDashboard,
      action: () => {
        onSelectTab('dashboard');
        onClose();
      },
    },
    {
      id: 'tab_health',
      title: 'สุขภาพไดรฟ์ (S.M.A.R.T.)',
      category: 'หน้าหลัก',
      subtitle: 'ตรวจสถานะ S.M.A.R.T., Bad Sectors, อุณหภูมิ และความทนทาน',
      icon: Activity,
      action: () => {
        onSelectTab('health');
        onClose();
      },
    },
    {
      id: 'tab_storage',
      title: 'วิเคราะห์พื้นที่จัดเก็บ (Storage Analyzer)',
      category: 'หน้าหลัก',
      subtitle: 'ค้นหาไฟล์ขนาดใหญ่ โฟลเดอร์ที่กินพื้นที่ และ Treemap',
      icon: HardDrive,
      action: () => {
        onSelectTab('storage');
        onClose();
      },
    },
    {
      id: 'tab_cleaner',
      title: 'ล้างไฟล์ขยะ & แคช (Junk Cleaner)',
      category: 'หน้าหลัก',
      subtitle: 'ล้างแคชระบบ, แคชเบราว์เซอร์, Shader Cache และไฟล์ชั่วคราว',
      icon: Trash2,
      action: () => {
        onSelectTab('cleaner');
        onClose();
      },
    },
    {
      id: 'tab_organizer',
      title: 'จัดระเบียบไฟล์อัจฉริยะ (File Organizer)',
      category: 'หน้าหลัก',
      subtitle: 'แยกหมวดหมู่ไฟล์อัตโนมัติ พร้อมระบบ Dry-run และ Undo Journal',
      icon: FolderInput,
      action: () => {
        onSelectTab('organizer');
        onClose();
      },
    },
    {
      id: 'tab_games',
      title: 'จัดการคลังเกมในเครื่อง (Games Library)',
      category: 'หน้าหลัก',
      subtitle: 'ค้นหาและจัดการไฟล์เกมจาก Steam, Epic Games, Riot, Xbox',
      icon: Gamepad2,
      action: () => {
        onSelectTab('games');
        onClose();
      },
    },
    {
      id: 'tab_ports',
      title: 'พอร์ต, โปรเซส & ข้อขัดแย้ง (Ports & Conflicts)',
      category: 'หน้าหลัก',
      subtitle: 'ตรวจหาพอร์ตชนกัน และโปรแกรมเบื้องหลังที่แย่งทรัพยากร',
      icon: Network,
      action: () => {
        onSelectTab('ports');
        onClose();
      },
    },
    {
      id: 'tab_apps',
      title: 'แอปพลิเคชันที่ติดตั้ง (Installed Apps)',
      category: 'หน้าหลัก',
      subtitle: 'ตรวจขนาดจริงของแอป และถอนการติดตั้งอย่างหมดจด (Smart Uninstall)',
      icon: Package,
      action: () => {
        onSelectTab('apps');
        onClose();
      },
    },
    {
      id: 'tab_settings',
      title: 'ตั้งค่าระบบ (Settings & Preferences)',
      category: 'หน้าหลัก',
      subtitle: 'ปรับโหมดสีหน้าจอ, เปลี่ยนสีธีม, เปลี่ยน Font [BETA]',
      icon: Settings,
      action: () => {
        onSelectTab('settings');
        onClose();
      },
    },
    {
      id: 'act_scan',
      title: 'สแกนพื้นที่ระบบทันที (Scan Storage)',
      category: 'คำสั่งด่วน',
      subtitle: 'สั่งตรวจหาไฟล์ขนาดใหญ่และสถิติไดรฟ์ใหม่ทั้งหมด',
      icon: RefreshCw,
      action: () => {
        onTriggerScan();
        onClose();
      },
    },
    {
      id: 'act_theme',
      title: 'สลับโหมดสี Dark / Light [BETA]',
      category: 'คำสั่งด่วน',
      subtitle: 'สลับระหว่างโหมดมืด (Dark) และโหมดสว่าง (Light)',
      icon: Sun,
      action: () => {
        onToggleTheme();
        onClose();
      },
    },
    {
      id: 'act_ipc',
      title: 'เปิด/ปิด คอนโซลวินิจฉัย IPC',
      category: 'คำสั่งด่วน',
      subtitle: 'ดูคำสั่งสื่อสารระหว่าง Frontend และ Backend Process',
      icon: Terminal,
      action: () => {
        onToggleIpc();
        onClose();
      },
    },
  ];

  const filtered = commands.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-pill)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="ค้นหาหน้า, ไดรฟ์, หรือคำสั่งระบบ..."
            className="w-full bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-hidden"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]">
              ESC
            </kbd>
          )}
        </div>

        {/* Command List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              ไม่พบรายการที่ตรงกับคำค้นหา "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-pill)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-[var(--bg-card-dark)] text-white'
                          : 'bg-[var(--bg-pill)] text-[var(--text-muted)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-semibold text-[var(--text)] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-[var(--bg-pill)] text-[var(--text-muted)] border border-[var(--border)]">
                      {item.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <span>↑↓ เลื่อนรายการ</span>
            <span>↵ เลือก</span>
            <span>ESC ปิด</span>
          </div>
          <span>SysInfo Quick Access</span>
        </div>
      </div>
    </div>
  );
}
