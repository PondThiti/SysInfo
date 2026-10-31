import React from 'react';
import {
  Bell,
  AlertTriangle,
  Trash2,
  HardDrive,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';
import type { TabType } from '../App';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: any[];
  totalAvailableJunkMB: number;
  systemDrives: any[];
  onNavigate: (tab: TabType) => void;
}

export default function NotificationPopover({
  isOpen,
  onClose,
  conflicts,
  totalAvailableJunkMB,
  systemDrives,
  onNavigate,
}: NotificationPopoverProps) {
  if (!isOpen) return null;

  const lowSpaceDrives = systemDrives.filter((d) => d.usedPercent >= 85);

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  const hasAnyAlert =
    conflicts.length > 0 || totalAvailableJunkMB > 500 || lowSpaceDrives.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-transparent"
      onClick={onClose}
    >
      <div
        className="absolute top-16 right-6 md:right-16 w-80 md:w-96 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-pill)]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--text)]" strokeWidth={1.75} />
            <span className="text-xs font-bold text-[var(--text)]">
              การแจ้งเตือนระบบ (System Alerts)
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-3 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {/* 1. Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--crit-bg)] border border-[var(--crit)]/30 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[var(--crit)] shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <div className="font-bold text-[var(--crit)]">
                    พบโปรแกรมขัดการทำงานกัน {conflicts.length} รายการ
                  </div>
                  <div className="text-[11px] text-[var(--crit)]/90 mt-0.5">
                    มีพอร์ตชนกันหรือโปรเซสที่แย่งทรัพยากรระบบ อาจทำให้แอปทำงานผิดพลาด
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onNavigate('ports');
                  onClose();
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-[var(--crit)] hover:opacity-90 text-white font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>ตรวจสอบข้อขัดแย้ง</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Low Disk Space Warning */}
          {lowSpaceDrives.map((d) => (
            <div
              key={d.letter}
              className="p-3 rounded-xl bg-[var(--warn-bg)] border border-[var(--warn)]/30 text-xs space-y-2"
            >
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-[var(--warn)] shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <div className="font-bold text-[var(--warn)]">
                    ไดรฟ์ {d.letter}: พื้นที่ใกล้เต็ม ({d.usedPercent}%)
                  </div>
                  <div className="text-[11px] text-[var(--warn)]/90 mt-0.5">
                    คงเหลือ {d.freeGB} GB จากความจุ {d.totalGB} GB แนะนำให้ตรวจสอบไฟล์ใหญ่
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onNavigate('storage');
                  onClose();
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-[var(--warn)] hover:opacity-90 text-white font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>วิเคราะห์พื้นที่ไดรฟ์นี้</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* 3. Cleanable Junk Notice */}
          {totalAvailableJunkMB > 500 && (
            <div className="p-3 rounded-xl bg-[var(--bg-pill)] border border-[var(--border)] text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <Trash2 className="w-4 h-4 text-[var(--text)] shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <div className="font-bold text-[var(--text)]">
                    มีไฟล์ขยะและแคชพร้อมล้าง {formatSize(totalAvailableJunkMB)}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    ล้างไฟล์ชั่วคราวและแคชเพื่อคืนพื้นที่ให้ระบบทำงานได้เร็วขึ้น
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onNavigate('cleaner');
                  onClose();
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-[var(--bar)] hover:opacity-90 text-white font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>เริ่มล้างไฟล์ขยะ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* All Good State */}
          {!hasAnyAlert && (
            <div className="py-6 text-center text-xs space-y-1">
              <div className="w-8 h-8 rounded-full bg-[var(--ok-bg)] text-[var(--ok)] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="font-bold text-[var(--text)]">ระบบทำงานปกติ</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                ไม่พบข้อขัดแย้ง พื้นที่ไดรฟ์เพียงพอ และสุขภาพฮาร์ดแวร์สมบูรณ์
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
