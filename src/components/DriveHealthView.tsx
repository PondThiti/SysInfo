import React, { useState, useEffect, useMemo } from 'react';
import {
  HardDrive,
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  Clock,
  Thermometer,
  Layers,
  Database,
  Usb,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  Flame,
  Archive,
  Lock
} from 'lucide-react';

export interface PartitionMapping {
  driveLetter: string | null;
  partitionNumber: number;
  sizeBytes: number;
  sizeGB: number;
  type: string;
}

export interface PhysicalDriveInfo {
  deviceId: string;
  friendlyName: string;
  manufacturer: string;
  model: string;
  firmwareRevision: string;
  mediaType: 'ssd' | 'hdd' | 'other' | 'unknown';
  rawMediaType: string;
  busType: 'nvme' | 'sata' | 'usb' | 'sas' | 'raid' | 'virtual' | 'other' | 'unknown';
  rawBusType: string;
  sizeBytes: number;
  sizeGB: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown' | 'unavailable';
  operationalStatus: string;
  isRemovable: boolean;
  isVirtual: boolean;
  isBoot: boolean;
  isSystem: boolean;
  partitionStyle: string;
  partitions: PartitionMapping[];
  maskedSerial: string;
  dataSource: string;
  lastSeenAt: string;
}

export interface MetricValue {
  id: string;
  name: string;
  value: number | string | boolean | null;
  delta?: number;
  unit?: string;
  rawName: string;
  source: string;
  status: 'available' | 'unsupported' | 'permission_denied' | 'query_failed';
  healthLevel?: 'healthy' | 'warning' | 'critical';
  meaning?: string;
}

export interface DriveHealthSnapshot {
  deviceId: string;
  checkedAt: string;
  overallStatus: 'healthy' | 'warning' | 'critical' | 'unknown' | 'unavailable';
  dataCoverage: 'complete' | 'partial' | 'unsupported' | 'permission_denied' | 'query_failed' | 'device_disconnected';
  metrics: MetricValue[];
  reasons: string[];
  backupRecommended: boolean;
  dataSource: string;
  hasAdminRights: boolean;
}

interface DriveHealthViewProps {
  theme?: 'dark' | 'light';
  onLogIpc?: (cmd: string, data?: any) => void;
}

export const DriveHealthView: React.FC<DriveHealthViewProps> = ({ theme = 'dark', onLogIpc }) => {
  const [drives, setDrives] = useState<PhysicalDriveInfo[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, DriveHealthSnapshot>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, DriveHealthSnapshot[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [selectedDetailDrive, setSelectedDetailDrive] = useState<PhysicalDriveInfo | null>(null);
  const [filterBus, setFilterBus] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const isLight = theme === 'light';

  // Load physical drives and their initial health snapshots
  const loadPhysicalDrives = async () => {
    setIsLoading(true);
    try {
      if ((window as any).electronAPI?.listPhysicalDrives) {
        onLogIpc?.('listPhysicalDrives');
        const driveList: PhysicalDriveInfo[] = await (window as any).electronAPI.listPhysicalDrives();
        setDrives(driveList);

        // Fetch health snapshot for each drive
        const healthRecords: Record<string, DriveHealthSnapshot> = {};
        const historyRecords: Record<string, DriveHealthSnapshot[]> = {};

        for (const drv of driveList) {
          try {
            onLogIpc?.('getDriveHealth', { deviceId: drv.deviceId });
            const health: DriveHealthSnapshot = await (window as any).electronAPI.getDriveHealth(drv.deviceId);
            healthRecords[drv.deviceId] = health;

            if ((window as any).electronAPI?.getDriveHealthHistory) {
              const hist: DriveHealthSnapshot[] = await (window as any).electronAPI.getDriveHealthHistory(drv.deviceId);
              historyRecords[drv.deviceId] = hist;
            }
          } catch (err) {
            console.error(`Failed to get health for drive ${drv.deviceId}:`, err);
          }
        }

        setHealthMap(healthRecords);
        setHistoryMap(historyRecords);
      }
    } catch (err) {
      console.error('Failed to list physical drives:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhysicalDrives();
  }, []);

  const handleRefreshSingleDrive = async (deviceId: string) => {
    setRefreshingId(deviceId);
    try {
      if ((window as any).electronAPI?.refreshDriveHealth) {
        onLogIpc?.('refreshDriveHealth', { deviceId });
        const health: DriveHealthSnapshot = await (window as any).electronAPI.refreshDriveHealth(deviceId);
        setHealthMap((prev) => ({ ...prev, [deviceId]: health }));

        if ((window as any).electronAPI?.getDriveHealthHistory) {
          const hist: DriveHealthSnapshot[] = await (window as any).electronAPI.getDriveHealthHistory(deviceId);
          setHistoryMap((prev) => ({ ...prev, [deviceId]: hist }));
        }
      }
    } catch (err) {
      console.error(`Failed to refresh drive health for ${deviceId}:`, err);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleCopy = (text: string) => {
    if ((window as any).electronAPI?.clipboardWrite) {
      (window as any).electronAPI.clipboardWrite(text);
    } else {
      navigator.clipboard?.writeText(text);
    }
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredDrives = useMemo(() => {
    if (filterBus === 'all') return drives;
    return drives.filter((d) => d.busType === filterBus);
  }, [drives, filterBus]);

  // Check if any drive has warning or critical health
  const alertDrives = useMemo(() => {
    return drives.filter((d) => {
      const h = healthMap[d.deviceId];
      return h?.overallStatus === 'warning' || h?.overallStatus === 'critical' || d.healthStatus === 'warning' || d.healthStatus === 'critical';
    });
  }, [drives, healthMap]);

  const hasPermissionDenied = useMemo(() => {
    return Object.values(healthMap).some((h) => h.dataCoverage === 'permission_denied');
  }, [healthMap]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Header */}
      <div className={`p-6 rounded-2xl border transition ${
        isLight
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/30 shadow-lg'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                ตรวจสุขภาพอุปกรณ์จัดเก็บข้อมูล (Drive Health & S.M.A.R.T. Monitor)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Read-Only Safe
              </span>
            </div>
            <p className={`text-xs max-w-3xl leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              ตรวจพบ Physical Drive จริงที่ Windows เปิดเผย แยกจาก Drive Letter และ Volume ชัดเจน
              วิเคราะห์ตัวชี้วัดสุขภาพตามความสามารถของอุปกรณ์ (Capability-Driven) ไม่สุ่มเดาค่าที่ไม่รองรับ
              และปลอดภัยต่อข้อมูลโดยไม่มีการรัน Benchmark หรือ Write Test ใดๆ
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Bus Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>บัส:</span>
              <select
                value={filterBus}
                onChange={(e) => setFilterBus(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none focus:border-indigo-500 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="all">ทั้งหมด ({drives.length} ไดรฟ์)</option>
                <option value="nvme">NVMe SSD</option>
                <option value="sata">SATA (SSD / HDD)</option>
                <option value="usb">USB External</option>
                <option value="virtual">Virtual / Logical</option>
              </select>
            </div>

            <button
              onClick={loadPhysicalDrives}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'กำลังตรวจเช็ค...' : 'ตรวจสุขภาพใหม่ทั้งหมด'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Privilege Advice Banner (Non-Admin Warning) */}
      {hasPermissionDenied && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition ${
          isLight
            ? 'bg-sky-50 border-sky-200 text-sky-950'
            : 'bg-sky-950/40 border-sky-500/40 text-sky-200'
        }`}>
          <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-sm text-sky-400 flex items-center gap-2">
              <span>ข้อมูลเบื้องต้นพร้อมใช้งาน — ปลดล็อก S.M.A.R.T. Counters เชิงลึกด้วยสิทธิ์ Administrator</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
                สิทธิ์ระดับผู้ใช้ (Standard User)
              </span>
            </div>
            <p className={isLight ? 'text-slate-700' : 'text-slate-300'}>
              ระบบตรวจพบข้อมูล Physical Drive, ขนาด, พาร์ทิชัน และสถานะความพร้อมจากระบบปฏิบัติการอย่างถูกต้องแล้ว
              หากต้องการอ่านตัววัดอุณหภูมิ (°C), อัตราการสึกหรอ (Wear / Percentage Used), และตัวนับข้อผิดพลาดแบบละเอียด
              ท่านสามารถ <b>ปิดโปรแกรมแล้วคลิกขวาที่ไอคอน SysInfo &gt; เลือก "Run as administrator"</b> ได้ทันที
            </p>
          </div>
        </div>
      )}

      {/* Backup Recommendation Banner (if Warning or Critical detected) */}
      {alertDrives.length > 0 && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition ${
          isLight
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}>
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs flex-1">
            <div className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <span>⚠️ คำแนะนำการสำรองข้อมูลเร่งด่วน (Data Backup Advisory)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ตรวจพบสัญญาณเฝ้าระวัง
              </span>
            </div>
            <p className={isLight ? 'text-slate-700' : 'text-slate-300'}>
              ตรวจพบอุปกรณ์จัดเก็บข้อมูลที่มีตัวชี้วัดเข้าเกณฑ์เฝ้าระวังหรือความเสื่อมสภาพสูง:
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-1 font-mono text-[11px]">
              {alertDrives.map((d) => (
                <li key={d.deviceId}>
                  <b>{d.friendlyName}</b> (พาร์ทิชัน: {d.partitions.map(p => p.driveLetter || 'NoLetter').join(', ')}) —{' '}
                  <span className="text-amber-400">{healthMap[d.deviceId]?.reasons?.[0] || 'ควรสำรองข้อมูลสำคัญโดยเร็ว'}</span>
                </li>
              ))}
            </ul>
            <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              คำแนะนำ: หลีกเลี่ยงการทำ Stress Test หรือ Benchmark หนักๆ และทำการคัดลอกไฟล์รูปภาพ, เอกสารสำคัญ, และเซฟเกมไปยังไดรฟ์สำรองหรือ Cloud Storage ทันที
            </p>
          </div>
        </div>
      )}

      {/* Drives Grid */}
      {isLoading ? (
        <div className={`p-12 text-center rounded-2xl border space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <div className={`font-semibold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>
            กำลังเชื่อมต่อและตรวจหา Physical Disks ในเครื่อง...
          </div>
          <p className="text-xs text-slate-500">
            ระบบกำลังจำแนกประเภทอุปกรณ์ (NVMe / SATA / USB), ตรวจสอบพาร์ทิชัน และดึงค่า S.M.A.R.T. Counters
          </p>
        </div>
      ) : filteredDrives.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border space-y-2 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <HardDrive className="w-8 h-8 text-slate-500 mx-auto" />
          <div className={`font-semibold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>
            ไม่พบอุปกรณ์จัดเก็บข้อมูลตามเงื่อนไขที่เลือก
          </div>
          <p className="text-xs text-slate-500">ลองเปลี่ยนตัวกรองบัส หรือกด "ตรวจสุขภาพใหม่ทั้งหมด"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDrives.map((drv) => {
            const health = healthMap[drv.deviceId];
            const isRefreshing = refreshingId === drv.deviceId;
            const history = historyMap[drv.deviceId] || [];

            // Health status badge styling
            const statusConfig = {
              healthy: {
                label: 'ปกติ (Healthy)',
                badgeCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                icon: ShieldCheck,
                color: 'text-emerald-400'
              },
              warning: {
                label: 'เฝ้าระวัง (Warning)',
                badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                icon: AlertTriangle,
                color: 'text-amber-400'
              },
              critical: {
                label: 'วิกฤต (Critical)',
                badgeCls: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                icon: ShieldAlert,
                color: 'text-rose-400'
              },
              unknown: {
                label: 'ไม่ทราบสถานะ',
                badgeCls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
                icon: HelpCircle,
                color: 'text-slate-400'
              },
              unavailable: {
                label: 'ไม่พร้อมใช้งาน',
                badgeCls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
                icon: AlertCircle,
                color: 'text-slate-400'
              }
            }[health?.overallStatus || drv.healthStatus] || {
              label: 'ไม่ทราบสถานะ',
              badgeCls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
              icon: HelpCircle,
              color: 'text-slate-400'
            };

            const StatusIcon = statusConfig.icon;

            // Temp metric
            const tempMetric = health?.metrics?.find((m) => m.id === 'temperature_celsius');
            // Wear metric
            const wearMetric = health?.metrics?.find((m) => m.id === 'wear_percent' || m.id === 'percentage_used');
            // Power on hours
            const powerHoursMetric = health?.metrics?.find((m) => m.id === 'power_on_hours');
            // Read errors
            const readErrorsMetric = health?.metrics?.find((m) => m.id === 'read_errors_total');
            // Write errors
            const writeErrorsMetric = health?.metrics?.find((m) => m.id === 'write_errors_total');

            return (
              <div
                key={drv.deviceId}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-md ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header: Device Identity & Health Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Bus & Media Pill */}
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          {drv.busType === 'usb' ? (
                            <Usb className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <HardDrive className="w-3 h-3 text-indigo-400" />
                          )}
                          <span>
                            {drv.mediaType.toUpperCase()} · {drv.busType.toUpperCase()}
                          </span>
                        </span>

                        {drv.isBoot && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Boot Drive
                          </span>
                        )}

                        {drv.isRemovable && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Removable
                          </span>
                        )}
                      </div>

                      <h2
                        className={`text-base font-bold truncate max-w-sm ${isLight ? 'text-slate-900' : 'text-white'}`}
                        title={drv.friendlyName}
                      >
                        {drv.friendlyName}
                      </h2>
                      <div className="text-xs font-mono text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>ความจุ: <b className={isLight ? 'text-slate-800' : 'text-slate-200'}>{drv.sizeGB} GB</b></span>
                        <span>•</span>
                        <span>Serial: {drv.maskedSerial}</span>
                        {drv.firmwareRevision && drv.firmwareRevision !== 'Unknown' && (
                          <>
                            <span>•</span>
                            <span>FW: {drv.firmwareRevision}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Overall Status Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 shadow-sm ${statusConfig.badgeCls}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusConfig.label}</span>
                      </span>

                      {/* Coverage status pill */}
                      <span className="text-[10px] text-slate-500 font-medium">
                        {health?.dataCoverage === 'complete' && '✓ ข้อมูลสุขภาพสมบูรณ์'}
                        {health?.dataCoverage === 'permission_denied' && '⚠️ ต้องการสิทธิ์ Admin'}
                        {health?.dataCoverage === 'partial' && '✓ ข้อมูลบางส่วน'}
                        {health?.dataCoverage === 'unsupported' && '✕ ไม่เปิดเผย SMART'}
                        {!health && 'กำลังตรวจสอบ...'}
                      </span>
                    </div>
                  </div>

                  {/* Partition & Volume Mappings */}
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        <span>พาร์ทิชันและ Volume ที่ผูกกับดิสก์นี้:</span>
                      </span>
                      <span>สไตล์: {drv.partitionStyle}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {drv.partitions.length === 0 ? (
                        <span className="text-[11px] text-slate-500">ไม่มีไดรฟ์ที่กำหนด Drive Letter (RAW / Reserved)</span>
                      ) : (
                        drv.partitions.map((part, idx) => (
                          <div
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[11px] ${
                              part.driveLetter
                                ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300 font-bold'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                            }`}
                          >
                            <span>{part.driveLetter || `Part ${part.partitionNumber}`}</span>
                            <span className="text-[10px] opacity-75">({part.sizeGB} GB)</span>
                            {part.type && <span className="text-[9px] uppercase opacity-60">[{part.type}]</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Capability-driven Metric Preview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* 1. Temperature */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                    }`}>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        <span>อุณหภูมิ</span>
                      </span>
                      <div className="mt-1 font-mono font-bold text-sm">
                        {tempMetric?.status === 'available' ? (
                          <span className={
                            Number(tempMetric.value) >= 70
                              ? 'text-rose-400'
                              : Number(tempMetric.value) >= 55
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }>
                            {tempMetric.value} °C
                          </span>
                        ) : tempMetric?.status === 'permission_denied' ? (
                          <span className="text-[10px] text-slate-500 font-normal">ต้องการ Admin</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-normal">ไม่รองรับ</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Wear / Percentage Used */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                    }`}>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        <span>{drv.busType === 'nvme' ? 'NVMe Wear' : 'ความสึกหรอ'}</span>
                      </span>
                      <div className="mt-1 font-mono font-bold text-sm">
                        {wearMetric?.status === 'available' ? (
                          <span className={
                            Number(wearMetric.value) >= 90
                              ? 'text-rose-400'
                              : Number(wearMetric.value) >= 75
                              ? 'text-amber-400'
                              : 'text-indigo-400'
                          }>
                            {wearMetric.value} %
                          </span>
                        ) : wearMetric?.status === 'permission_denied' ? (
                          <span className="text-[10px] text-slate-500 font-normal">ต้องการ Admin</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-normal">ไม่รองรับ</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Power On Hours */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                    }`}>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" />
                        <span>ชั่วโมงเปิดใช้</span>
                      </span>
                      <div className="mt-1 font-mono font-bold text-sm">
                        {powerHoursMetric?.status === 'available' ? (
                          <span className="text-sky-400">
                            {Number(powerHoursMetric.value).toLocaleString()} ชม.
                          </span>
                        ) : powerHoursMetric?.status === 'permission_denied' ? (
                          <span className="text-[10px] text-slate-500 font-normal">ต้องการ Admin</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-normal">ไม่รองรับ</span>
                        )}
                      </div>
                    </div>

                    {/* 4. Errors Summary */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                    }`}>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        <span>Error นับสะสม</span>
                      </span>
                      <div className="mt-1 font-mono font-bold text-sm">
                        {readErrorsMetric?.status === 'available' ? (
                          <span className={
                            (Number(readErrorsMetric.value) + Number(writeErrorsMetric?.value || 0)) > 0
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }>
                            {readErrorsMetric.value}/{writeErrorsMetric?.value ?? 0}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-normal">
                            {readErrorsMetric?.status === 'permission_denied' ? 'ต้องการ Admin' : '0 (ปกติ)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Health Reasons List */}
                  {health?.reasons && health.reasons.length > 0 && (
                    <div className="text-[11px] space-y-1">
                      {health.reasons.slice(0, 2).map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span className="truncate">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className={`mt-5 pt-3 border-t flex items-center justify-between gap-3 text-xs ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ตรวจล่าสุด: {health ? new Date(health.checkedAt).toLocaleTimeString('th-TH') : 'ยังไม่ได้ตรวจ'}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefreshSingleDrive(drv.deviceId)}
                      disabled={isRefreshing}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="ตรวจเช็คดิสก์ลูกนี้ซ้ำ"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      onClick={() => setSelectedDetailDrive(drv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition"
                    >
                      <span>ดูรายละเอียดตัวชี้วัด</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Drive Health Detail Modal */}
      {selectedDetailDrive && (() => {
        const drv = selectedDetailDrive;
        const health = healthMap[drv.deviceId];
        const history = historyMap[drv.deviceId] || [];

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`w-full max-w-3xl rounded-3xl border shadow-2xl p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {drv.mediaType.toUpperCase()} · {drv.busType.toUpperCase()}
                    </span>
                    <h3 className="text-lg font-bold">{drv.friendlyName}</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    รายงานข้อมูลสุขภาพฮาร์ดแวร์จริงและตัวชี้วัด S.M.A.R.T. ตามมาตรฐาน Windows Storage Provider
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDetailDrive(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hardware Identity & Partition Mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <div className="font-bold font-sans text-slate-400 mb-1 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ข้อมูลทางกายภาพ (Physical Identity)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Device ID:</span>
                    <span className="font-bold">PhysicalDrive{drv.deviceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model:</span>
                    <span className="truncate max-w-[200px]" title={drv.model}>{drv.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ความจุจริง:</span>
                    <span>{drv.sizeGB} GB ({drv.sizeBytes.toLocaleString()} Bytes)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Firmware:</span>
                    <span>{drv.firmwareRevision}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Serial (Masked):</span>
                    <span>{drv.maskedSerial}</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <div className="font-bold font-sans text-slate-400 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ระบบพาร์ทิชันและสถานะ (Volume & Status)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Partition Style:</span>
                    <span className="font-bold">{drv.partitionStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Boot / System:</span>
                    <span>{drv.isBoot ? 'Yes (Boot Drive)' : 'No'} / {drv.isSystem ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operational Status:</span>
                    <span className="text-emerald-400">{drv.operationalStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Source:</span>
                    <span className="truncate max-w-[200px] text-[10px]" title={drv.dataSource}>{drv.dataSource}</span>
                  </div>
                </div>
              </div>

              {/* S.M.A.R.T. Capability-Driven Metrics Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>ตัวชี้วัดสุขภาพ (S.M.A.R.T. & Reliability Metrics)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    แสดงเฉพาะตัวชี้วัดที่อุปกรณ์เปิดเผยจริง
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${
                        isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                      }`}>
                        <th className="py-2.5 px-4">ตัวชี้วัด (Metric)</th>
                        <th className="py-2.5 px-4">ค่าปัจจุบัน</th>
                        <th className="py-2.5 px-4">ส่วนต่าง (Delta)</th>
                        <th className="py-2.5 px-4">สถานะความพร้อม</th>
                        <th className="py-2.5 px-4">คำอธิบายความหมาย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {health?.metrics && health.metrics.length > 0 ? (
                        health.metrics.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-4 font-sans font-semibold">
                              {m.name}
                            </td>
                            <td className="py-2.5 px-4 font-bold">
                              {m.status === 'available' ? (
                                <span className={
                                  m.healthLevel === 'critical'
                                    ? 'text-rose-400'
                                    : m.healthLevel === 'warning'
                                    ? 'text-amber-400'
                                    : 'text-indigo-300'
                                }>
                                  {m.value != null ? `${m.value} ${m.unit || ''}` : '—'}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-normal">อ่านไม่ได้</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              {m.delta != null && m.delta > 0 ? (
                                <span className="text-rose-400 font-bold">+{m.delta}</span>
                              ) : (
                                <span className="text-slate-600">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-sans">
                              {m.status === 'available' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold">
                                  Available
                                </span>
                              )}
                              {m.status === 'permission_denied' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-semibold">
                                  ต้องการ Admin
                                </span>
                              )}
                              {m.status === 'unsupported' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                                  ไม่รองรับ
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px] max-w-xs truncate" title={m.meaning}>
                              {m.meaning || '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                            ยังไม่มีข้อมูลตัวชี้วัด กรุณากดปุ่มตรวจเช็คใหม่
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Trend Snapshots */}
              {history.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-sans text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ประวัติบันทึกสถานะตามเวลา (Historical Snapshots: {history.length} รายการ)</span>
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-mono">
                    {history.slice(0, 5).map((snap, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border shrink-0 min-w-[150px] ${
                          i === 0
                            ? 'bg-indigo-600/10 border-indigo-500/30'
                            : isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        <div className="text-[10px] text-slate-500">
                          {new Date(snap.checkedAt).toLocaleDateString('th-TH')}{' '}
                          {new Date(snap.checkedAt).toLocaleTimeString('th-TH')}
                        </div>
                        <div className="font-bold text-xs capitalize mt-1 text-emerald-400">
                          {snap.overallStatus}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {snap.metrics.filter(m => m.status === 'available').length} ตัวชี้วัด
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleCopy(JSON.stringify({ drive: drv, health }, null, 2))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'คัดลอก JSON แล้ว' : 'คัดลอกข้อมูลดิบ (JSON)'}</span>
                </button>

                <button
                  onClick={() => setSelectedDetailDrive(null)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
export default DriveHealthView;
