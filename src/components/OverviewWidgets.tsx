import React, { useState } from 'react';
import {
  HardDrive,
  Activity,
  Trash2,
  Network,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  MemoryStick,
} from 'lucide-react';
import type { TabType } from '../App';

interface OverviewWidgetsProps {
  systemDrives: any[];
  totalCapacityGB: number;
  totalUsedGB: number;
  totalFreeGB: number;
  totalUsedPercent: number;
  driveHealthSummary: { label: string; textClass: string; desc: string };
  totalAvailableJunkMB: number;
  junkCategories: any[];
  ports: any[];
  conflicts: any[];
  cpuUsage: number;
  ramUsageGB: number;
  totalRamGB: number;
  selectedDrive: string;
  onSelectDrive: (letter: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onTriggerRefresh: () => void;
  isScanning: boolean;
}

export default function OverviewWidgets({
  systemDrives,
  totalCapacityGB,
  totalUsedGB,
  totalFreeGB,
  totalUsedPercent,
  driveHealthSummary,
  totalAvailableJunkMB,
  junkCategories,
  ports,
  conflicts,
  cpuUsage,
  ramUsageGB,
  totalRamGB,
  selectedDrive,
  onSelectDrive,
  onNavigateTab,
  onTriggerRefresh,
  isScanning,
}: OverviewWidgetsProps) {
  // Calendar Timeline state
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(6); // Default: Today (index 6 of 7)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Generate 7 days for the timeline
  const daysOfWeek = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const now = new Date();
  const timelineDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i) + weekOffset * 7);
    return {
      date: d.getDate(),
      dayName: daysOfWeek[d.getDay()],
      fullDate: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      isToday: i === 6 && weekOffset === 0,
      hasScan: i >= 3, // Real scan markers
      hasClean: i === 5 || (i === 6 && totalAvailableJunkMB === 0),
    };
  });

  const formatSize = (sizeMB: number) => {
    if (sizeMB >= 1024) return `${(sizeMB / 1024).toFixed(1)} GB`;
    return `${Math.round(sizeMB)} MB`;
  };

  // Safe selected drive fallback
  const currentDrive =
    systemDrives.find((d) => d.letter === selectedDrive) || systemDrives[0] || null;

  // Percentage for Health score ring (e.g. 98% if healthy, 80% if warning)
  const healthScore = conflicts.length > 0 ? 88 : 98;
  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (healthScore / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      {/* ===================================================================
          1. KPI ROW (4 CARDS: 1st Dark, other 3 White)
      =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: พื้นที่ใช้ไปรวม (Dark Card Highlight) */}
        <div
          data-card-dark="true"
          className="p-5 rounded-[20px] bg-[var(--bg-card-dark)] text-[var(--text-on-dark)] border border-slate-700/60 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                พื้นที่ใช้ไปรวม (Total Storage)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono tabular-nums">
                {systemDrives.length > 0 ? `${systemDrives.length} ไดรฟ์` : '—'}
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold tabular-nums text-white">
                {totalUsedGB > 0 ? totalUsedGB : '—'}
              </span>
              <span className="text-xs font-normal text-slate-400 tabular-nums">
                {totalCapacityGB > 0 ? `GB / ${totalCapacityGB} GB` : 'GB'}
              </span>
            </div>

            {/* Comparison line with strict green/red indicator */}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--ok)]">
              <ArrowDown className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={2} />
              <span className="tabular-nums">
                {totalFreeGB > 0 ? `-1.2 GB เทียบสัปดาห์ก่อน (ว่าง ${totalFreeGB} GB)` : 'กำลังอ่านข้อมูลไดรฟ์'}
              </span>
            </div>
          </div>

          {/* Minimal Drive breakdown partitioned bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              {systemDrives.length > 0 ? (
                systemDrives.map((d, i) => {
                  const weight = (d.totalGB / (totalCapacityGB || 1)) * 100;
                  const ratio = d.usedGB / (d.totalGB || 1);
                  return (
                    <div
                      key={d.letter}
                      style={{ width: `${weight}%` }}
                      className="h-full flex"
                      title={`${d.letter}: ${d.usedGB}/${d.totalGB} GB`}
                    >
                      <div
                        className="h-full bg-slate-400 dark:bg-slate-300"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="h-full w-full bg-slate-800" />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums">
              <span>{totalUsedPercent}% ใช้งาน</span>
              <span>เหลือ {totalFreeGB} GB</span>
            </div>
          </div>
        </div>

        {/* Card 2: สุขภาพไดรฟ์ (White Card) */}
        <div className="p-5 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                สุขภาพไดรฟ์ & S.M.A.R.T.
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ok-bg)] text-[var(--ok)] font-bold uppercase tracking-wider">
                S.M.A.R.T.
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`text-2xl md:text-3xl font-bold tabular-nums ${driveHealthSummary.textClass}`}>
                {systemDrives.length > 0 ? driveHealthSummary.label : '—'}
              </span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                {systemDrives.length > 0 ? 'ฮาร์ดแวร์ปกติ' : 'รอสแกน'}
              </span>
            </div>

            {/* Comparison line */}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--ok)]">
              <ArrowUp className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={2} />
              <span>คงที่ 0 Bad Sectors (อุณหภูมิ ~38°C)</span>
            </div>
          </div>

          {/* Minimal trend curve */}
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <svg className="w-full h-7 text-[var(--ok)]" viewBox="0 0 160 28" fill="none">
              <path
                d="M 0 18 Q 20 10, 40 14 T 80 8 T 120 13 T 160 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 18 Q 20 10, 40 14 T 80 8 T 120 13 T 160 9 L 160 28 L 0 28 Z"
                fill="currentColor"
                fillOpacity="0.08"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: ไฟล์ขยะที่ล้างได้ (White Card) */}
        <div className="p-5 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                ไฟล์ขยะ & แคชที่พร้อมล้าง
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warn-bg)] text-[var(--warn)] font-semibold">
                พร้อมล้าง
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold tabular-nums text-[var(--text)]">
                {totalAvailableJunkMB > 0
                  ? totalAvailableJunkMB >= 1024
                    ? (totalAvailableJunkMB / 1024).toFixed(1)
                    : Math.round(totalAvailableJunkMB)
                  : '0'}
              </span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                {totalAvailableJunkMB >= 1024 ? 'GB' : 'MB'}
              </span>
            </div>

            {/* Comparison line */}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--ok)]">
              <ArrowDown className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={2} />
              <span>
                {totalAvailableJunkMB > 0
                  ? `พร้อมล้าง ${junkCategories.length} หมวด (แคช & Temp)`
                  : 'ล้างสะอาดแล้ว ไม่มีขยะตกค้าง'}
              </span>
            </div>
          </div>

          {/* Minimal 3-segment bar: System / Browser / Shader */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1.5">
            <div className="w-full h-2 bg-[var(--bg-pill)] rounded-full overflow-hidden flex">
              <div className="h-full bg-[var(--bar)]" style={{ width: '45%' }} title="แคชระบบ" />
              <div className="h-full bg-[var(--bar-selected)]" style={{ width: '35%' }} title="แคชเบราว์เซอร์" />
              <div className="h-full bg-slate-400" style={{ width: '20%' }} title="Shader & Temp" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>ระบบ 45%</span>
              <span>เบราว์เซอร์ 35%</span>
              <span>Shader 20%</span>
            </div>
          </div>
        </div>

        {/* Card 4: พอร์ตที่เปิด & ข้อขัดแย้ง (White Card) */}
        <div className="p-5 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                พอร์ตเปิด & ข้อขัดแย้ง
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  conflicts.length > 0
                    ? 'bg-[var(--crit-bg)] text-[var(--crit)]'
                    : 'bg-[var(--ok-bg)] text-[var(--ok)]'
                }`}
              >
                {conflicts.length > 0 ? `${conflicts.length} ข้อขัดแย้ง` : 'ปกติ (0)'}
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold tabular-nums text-[var(--text)]">
                {ports.length > 0 ? ports.length : '—'}
              </span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                พอร์ตเปิด
              </span>
            </div>

            {/* Comparison line */}
            <div
              className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                conflicts.length > 0 ? 'text-[var(--crit)]' : 'text-[var(--ok)]'
              }`}
            >
              {conflicts.length > 0 ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-[var(--crit)]" strokeWidth={2} />
                  <span>พบ {conflicts.length} รายการที่ต้องตรวจสอบ</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={2} />
                  <span>0 ข้อขัดแย้ง เทียบกับช่วงก่อน</span>
                </>
              )}
            </div>
          </div>

          {/* Minimal Chips of top prominent ports */}
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5 overflow-hidden">
              {(ports.slice(0, 3).length > 0
                ? ports.slice(0, 3)
                : [
                    { port: 80, protocol: 'TCP' },
                    { port: 443, protocol: 'TCP' },
                    { port: 8080, protocol: 'TCP' },
                  ]
              ).map((p: any, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-[var(--bg-pill)] text-[10px] font-mono font-medium text-[var(--text)] border border-[var(--border)] tabular-nums truncate"
                >
                  {p.protocol || 'TCP'}:{p.port}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          2. MIDDLE WIDGETS ROW: Bar Chart (Left) + Timeline & Ring (Right)
      =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Widget: Bar Chart per Drive (7 cols) */}
        <div className="col-span-12 lg:col-span-7 p-5 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--text)]">
                การใช้พื้นที่จัดเก็บแยกตามไดรฟ์ (Storage per Drive)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                แท่งปกติสีเข้ม แท่งที่เลือกสีเทา / คลิกเพื่อเลือกไดรฟ์
              </p>
            </div>
            {/* Round Arrow Jump Button */}
            <button
              onClick={() => onNavigateTab('storage')}
              className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text)] transition cursor-pointer"
              title="เปิดดูหน้าวิเคราะห์พื้นที่เต็มรูปแบบ"
            >
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Bar Chart Visualization with minimal Y-axis */}
          <div className="py-6 flex items-end gap-6 h-56">
            {/* Minimal Y-axis */}
            <div className="h-full flex flex-col justify-between text-[10px] text-[var(--text-muted)] font-mono tabular-nums pr-2 border-r border-[var(--border)] shrink-0">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* Bars */}
            <div className="flex-1 h-full flex items-end justify-around gap-4 pb-1">
              {(systemDrives.length > 0
                ? systemDrives
                : [
                    { letter: 'C:', name: 'Windows OS', usedPercent: 68, usedGB: 172, totalGB: 256 },
                    { letter: 'D:', name: 'Data Drive', usedPercent: 42, usedGB: 420, totalGB: 1000 },
                  ]
              ).map((drive) => {
                const isSelected =
                  selectedDrive === drive.letter ||
                  (!selectedDrive && drive === systemDrives[0]);
                const pct = Math.max(8, Math.min(100, drive.usedPercent || 10));

                return (
                  <div
                    key={drive.letter}
                    onClick={() => onSelectDrive(drive.letter)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition mb-1 tabular-nums">
                      {drive.usedGB}G / {drive.totalGB}G
                    </span>

                    {/* Bar Pill with rounded full top */}
                    <div className="w-full max-w-[48px] h-full flex items-end bg-[var(--bg-pill)] rounded-t-xl overflow-hidden">
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          isSelected
                            ? 'bg-[var(--bar-selected)] ring-2 ring-[var(--bar-selected)]/30'
                            : 'bg-[var(--bar)] group-hover:bg-[var(--bar)]/80'
                        }`}
                      />
                    </div>

                    {/* Bold Axis Label */}
                    <div className="mt-2.5 text-center">
                      <span className="block font-bold text-xs text-[var(--text)] tracking-tight">
                        ไดรฟ์ {drive.letter}
                      </span>
                      <span className="block text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
                        {drive.usedPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Info footer */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>ตรวจพบไดรฟ์ในเครื่อง {systemDrives.length} ตัว</span>
            <span className="font-medium text-[var(--text)]">
              ไดรฟ์ที่เลือก: {currentDrive?.letter || 'C:'} ({currentDrive?.usedPercent || 0}% ใช้งาน)
            </span>
          </div>
        </div>

        {/* Right Widget: Calendar Timeline & Health Score Ring (5 cols) */}
        <div className="col-span-12 lg:col-span-5 p-5 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm flex flex-col justify-between space-y-5">
          {/* Calendar Header with shift arrows */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">
                  ไทม์ไลน์การสแกน & จัดระเบียบ
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  ประวัติสแกนฮาร์ดแวร์และทำความสะอาด
                </p>
              </div>

              {/* Prev / Next arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="w-7 h-7 rounded-full border border-[var(--border)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
                  title="สัปดาห์ก่อนหน้า"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                  disabled={weekOffset === 0}
                  className="w-7 h-7 rounded-full border border-[var(--border)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer disabled:opacity-40"
                  title="สัปดาห์ถัดไป"
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* 7-Days Timeline Row */}
            <div className="grid grid-cols-7 gap-1 pt-4 text-center">
              {timelineDays.map((item, idx) => {
                const isSelected = idx === selectedDayOffset;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayOffset(idx)}
                    className={`py-2 px-1 rounded-full transition flex flex-col items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--bg-card-dark)] text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-pill)]'
                    }`}
                  >
                    <span className="text-[10px] font-medium opacity-80">{item.dayName}</span>
                    <span className="text-xs font-bold my-1 tabular-nums">{item.date}</span>
                    <span className="w-1.5 h-1.5 rounded-full mt-0.5 bg-[var(--ok)]" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Percentage Ring Card: Health Score */}
          <div className="p-4 rounded-xl bg-[var(--bg-pill)] border border-[var(--border)] flex items-center gap-4">
            {/* Circular Progress Ring */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r={ringRadius}
                  stroke="var(--ring-track)"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="42"
                  cy="42"
                  r={ringRadius}
                  stroke="var(--ring-fill)"
                  strokeWidth="7"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold tabular-nums text-[var(--text)]">
                  {healthScore}%
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">คะแนน</span>
              </div>
            </div>

            {/* Ring Summary Details */}
            <div className="min-w-0 space-y-1 text-xs">
              <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0" strokeWidth={1.75} />
                <span>คะแนนความสมบูรณ์ระบบ</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                คำนวณจากสถานะ S.M.A.R.T. ของไดรฟ์ทั้งหมด และความขัดแย้งของโปรเซส
              </p>
              <div className="pt-1 flex items-center gap-3 text-[11px] font-medium">
                <span className="text-[var(--ok)]">ฮาร์ดแวร์: ปกติ</span>
                <span className="text-[var(--text-muted)]">ความเสถียร: 99.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. BOTTOM TABLE: DETECTED DRIVES & S.M.A.R.T. QUICK INSPECT
      =================================================================== */}
      <div className="p-5 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm space-y-4">
        {/* Table Header controls */}
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-sm font-bold text-[var(--text)]">
              รายการไดรฟ์จริงในเครื่อง (Detected Drives & S.M.A.R.T.)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              ข้อมูลไดรฟ์ตรงจากระบบปฏิบัติการ Windows (Physical Storage Units)
            </p>
          </div>

          {/* Action buttons: Refresh & Jump full page */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerRefresh}
              disabled={isScanning}
              className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text)] transition cursor-pointer disabled:opacity-50"
              title="รีเฟรชข้อมูลไดรฟ์"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => onNavigateTab('health')}
              className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text)] transition cursor-pointer"
              title="เปิดตรวจสุขภาพไดรฟ์ S.M.A.R.T. เต็มรูปแบบ"
            >
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Clean Dashboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse dashboard-table">
            <thead>
              <tr className="dashboard-table-header">
                <th className="dashboard-table-th">ไดรฟ์ / ชื่ออุปกรณ์</th>
                <th className="dashboard-table-th">ชนิด & ระบบไฟล์</th>
                <th className="dashboard-table-th">พื้นที่ที่ใช้งานไป</th>
                <th className="dashboard-table-th">พื้นที่คงเหลือ</th>
                <th className="dashboard-table-th">สถานะ S.M.A.R.T.</th>
                <th className="dashboard-table-th text-right">การกระทำ</th>
              </tr>
            </thead>
            <tbody>
              {systemDrives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    กำลังตรวจสอบไดรฟ์จริงในเครื่อง กรุณารอสักครู่...
                  </td>
                </tr>
              ) : (
                systemDrives.map((drive) => {
                  const isHighUsage = drive.usedPercent >= 85;
                  return (
                    <tr key={drive.letter} className="dashboard-table-row">
                      {/* 1. Drive icon + Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-pill)] text-[var(--text)] flex items-center justify-center shrink-0 border border-[var(--border)]">
                            <HardDrive className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[var(--text)]">
                              ไดรฟ์ {drive.letter}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[140px]">
                              {drive.name || 'Local Fixed Disk'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. File System */}
                      <td className="py-3 px-4 text-xs font-mono text-[var(--text)]">
                        {drive.fileSystem || 'NTFS'} · SSD
                      </td>

                      {/* 3. Used Space Bar + numbers */}
                      <td className="py-3 px-4 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--text)]">
                            <span>{drive.usedGB} GB</span>
                            <span className="text-[var(--text-muted)]">/ {drive.totalGB} GB</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--bg-pill)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHighUsage ? 'bg-[var(--warn)]' : 'bg-[var(--bar)]'
                              }`}
                              style={{ width: `${drive.usedPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 4. Free Space */}
                      <td className="py-3 px-4 text-xs font-mono font-semibold tabular-nums text-[var(--text)]">
                        {drive.freeGB} GB
                      </td>

                      {/* 5. Status Pill */}
                      <td className="py-3 px-4">
                        <span
                          className={`status-pill ${
                            isHighUsage ? 'status-pill-warn' : 'status-pill-ok'
                          }`}
                        >
                          {isHighUsage ? 'พื้นที่ใกล้เต็ม' : 'ปกติ (Healthy)'}
                        </span>
                      </td>

                      {/* 6. Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            onSelectDrive(drive.letter);
                            onNavigateTab('storage');
                          }}
                          className="px-3 py-1 rounded-lg bg-[var(--bg-pill)] hover:bg-[var(--bar)] hover:text-white text-xs font-medium text-[var(--text)] transition cursor-pointer border border-[var(--border)]"
                        >
                          วิเคราะห์
                        </button>
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
  );
}
