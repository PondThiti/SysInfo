import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderInput,
  FolderOpen,
  FolderCheck,
  Search,
  RefreshCw,
  Check,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Trash2,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  History,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  Filter,
  Copy,
  ExternalLink,
  Files
} from 'lucide-react';

interface FileOrganizerViewProps {
  initialSourceDir?: string;
  showToast: (title: string, desc: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  systemDrives?: any[];
}

interface PlanItem {
  id: string;
  sourcePath: string;
  targetPath: string;
  fileName: string;
  extension: string;
  category: string;
  sizeBytes: number;
  formattedSize: string;
  modifiedAt: string;
  mtimeMs: number;
  matchedRuleName: string;
  conflictType: 'none' | 'name_collision' | 'identical_duplicate';
  suggestedAction: 'rename' | 'skip' | 'overwrite' | 'recycle_duplicate';
  isCrossDrive: boolean;
  isSelected: boolean;
}

export default function FileOrganizerView({
  initialSourceDir = '',
  showToast,
  systemDrives = []
}: FileOrganizerViewProps) {
  const [subTab, setSubTab] = useState<'organize' | 'history' | 'rules' | 'bulk_rename'>('organize');

  // Directory inputs
  const [sourceDir, setSourceDir] = useState<string>(initialSourceDir);
  const [targetDir, setTargetDir] = useState<string>('');
  const [useSameDir, setUseSameDir] = useState<boolean>(true);
  const [isRecursive, setIsRecursive] = useState<boolean>(false);

  // Rule & Template
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('preset_by_type');
  const [customTemplate, setCustomTemplate] = useState<string>('{type}');
  const [conflictStrategy, setConflictStrategy] = useState<'rename' | 'skip' | 'overwrite' | 'recycle_duplicate'>('rename');

  // Preview state
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conflictFilter, setConflictFilter] = useState<string>('all');

  // Execution & Modals
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [resultModal, setResultModal] = useState<any | null>(null);

  // History & Undo Journal
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [undoingBatchId, setUndoingBatchId] = useState<string | null>(null);
  const [expandedBatchIds, setExpandedBatchIds] = useState<{ [key: string]: boolean }>({});

  // Empty Folder Cleanup
  const [emptyFoldersCleaned, setEmptyFoldersCleaned] = useState<string[]>([]);
  const [isCleaningEmpty, setIsCleaningEmpty] = useState<boolean>(false);

  // Watch Folder Recommendation
  const [watchAlert, setWatchAlert] = useState<any | null>(null);

  // Bulk Rename state
  const [bulkRenamePattern, setBulkRenamePattern] = useState<string>('{name}_{counter}');
  const [bulkRenamePreview, setBulkRenamePreview] = useState<any[]>([]);

  // Load rules & history on mount
  useEffect(() => {
    loadRules();
    loadHistory();
    checkWatchFolder();
  }, []);

  // Update source dir if prop changes
  useEffect(() => {
    if (initialSourceDir && initialSourceDir !== sourceDir) {
      setSourceDir(initialSourceDir);
      runPreview(initialSourceDir, targetDir, selectedRuleId, customTemplate);
    }
  }, [initialSourceDir]);

  const loadRules = async () => {
    try {
      const res = await (window as any).electronAPI?.organizerListRules?.();
      if (res && Array.isArray(res)) {
        setRules(res);
      }
    } catch (e) {}
  };

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await (window as any).electronAPI?.organizerGetHistory?.();
      if (res && Array.isArray(res)) {
        setHistory(res);
      }
    } catch (e) {
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const checkWatchFolder = async () => {
    try {
      const res = await (window as any).electronAPI?.organizerCheckWatchFolder?.();
      if (res && res.hasRecommendation) {
        setWatchAlert(res);
      }
    } catch (e) {}
  };

  // Browse source directory
  const handleBrowseSource = async () => {
    try {
      const dir = await (window as any).electronAPI?.chooseFolder?.();
      if (dir) {
        setSourceDir(dir);
        runPreview(dir, useSameDir ? dir : targetDir, selectedRuleId, customTemplate);
      }
    } catch (e) {}
  };

  // Browse target directory
  const handleBrowseTarget = async () => {
    try {
      const dir = await (window as any).electronAPI?.chooseFolder?.();
      if (dir) {
        setTargetDir(dir);
        setUseSameDir(false);
        if (sourceDir) {
          runPreview(sourceDir, dir, selectedRuleId, customTemplate);
        }
      }
    } catch (e) {}
  };

  // Run Dry-run preview
  const runPreview = async (
    src = sourceDir,
    target = useSameDir ? src : targetDir,
    ruleId = selectedRuleId,
    tmpl = customTemplate
  ) => {
    if (!src) {
      showToast('โปรดระบุโฟลเดอร์', 'กรุณาเลือกโฟลเดอร์ต้นทางที่ต้องการจัดระเบียบไฟล์', 'warning');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const res = await (window as any).electronAPI?.organizerPreview?.({
        sourceDir: src,
        targetBaseDir: target || src,
        ruleId,
        customTemplate: tmpl,
        conflictStrategy,
        recursive: isRecursive
      });

      if (res?.success) {
        setPlanItems(res.planItems || []);
        if (res.planItems.length === 0) {
          showToast('ไม่พบไฟล์ที่ตรงกับกฎ', 'ไม่มีไฟล์ในโฟลเดอร์ที่เข้าเกณฑ์การจัดระเบียบของกฎที่เลือก', 'info');
        } else {
          showToast('พรีวิวเสร็จสิ้น', `ตรวจพบ ${res.planItems.length} ไฟล์ พร้อมจัดระเบียบ`, 'success');
        }
      } else {
        showToast('ไม่สามารถสแกนได้', res?.error || 'เกิดข้อผิดพลาดในการตรวจสอบโฟลเดอร์', 'error');
        setPlanItems([]);
      }
    } catch (err: any) {
      showToast('ข้อผิดพลาด', err?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Switch Preset
  const handleSelectRule = (rule: any) => {
    setSelectedRuleId(rule.id);
    setCustomTemplate(rule.targetTemplate || '{type}');
    setConflictStrategy(rule.conflictStrategy || 'rename');
    if (sourceDir) {
      runPreview(sourceDir, useSameDir ? sourceDir : targetDir, rule.id, rule.targetTemplate || '{type}');
    }
  };

  // Insert token to template
  const handleInsertToken = (token: string) => {
    setCustomTemplate(prev => {
      const updated = prev ? `${prev}/${token}` : token;
      return updated;
    });
  };

  // Plan items filter & metrics
  const filteredPlanItems = useMemo(() => {
    return planItems.filter(item => {
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        const matchesName = item.fileName.toLowerCase().includes(query);
        const matchesTarget = item.targetPath.toLowerCase().includes(query);
        if (!matchesName && !matchesTarget) return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (conflictFilter === 'conflicts_only' && item.conflictType === 'none') {
        return false;
      }
      if (conflictFilter === 'duplicates_only' && item.conflictType !== 'identical_duplicate') {
        return false;
      }
      return true;
    });
  }, [planItems, searchFilter, categoryFilter, conflictFilter]);

  const selectedItems = useMemo(() => {
    return planItems.filter(i => i.isSelected);
  }, [planItems]);

  const totalSelectedBytes = useMemo(() => {
    return selectedItems.reduce((acc, i) => acc + (i.sizeBytes || 0), 0);
  }, [selectedItems]);

  const conflictStats = useMemo(() => {
    let nameCollisions = 0;
    let identicalDuplicates = 0;
    let crossDrives = 0;
    for (const item of planItems) {
      if (item.conflictType === 'name_collision') nameCollisions++;
      if (item.conflictType === 'identical_duplicate') identicalDuplicates++;
      if (item.isCrossDrive) crossDrives++;
    }
    return { nameCollisions, identicalDuplicates, crossDrives };
  }, [planItems]);

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setPlanItems(prev => prev.map(i => ({ ...i, isSelected: checked })));
  };

  const handleToggleItem = (id: string) => {
    setPlanItems(prev => prev.map(i => i.id === id ? { ...i, isSelected: !i.isSelected } : i));
  };

  const handleUpdateItemAction = (id: string, action: any) => {
    setPlanItems(prev => prev.map(i => i.id === id ? { ...i, suggestedAction: action } : i));
  };

  // Execute Organize Batch
  const handleExecuteOrganize = async () => {
    if (selectedItems.length === 0) {
      showToast('ไม่มีไฟล์ที่เลือก', 'กรุณาติ๊กเลือกไฟล์อย่างน้อย 1 รายการก่อนดำเนินการ', 'warning');
      return;
    }

    setConfirmModalOpen(false);
    setIsApplying(true);

    try {
      const selectedRule = rules.find(r => r.id === selectedRuleId);
      const res = await (window as any).electronAPI?.organizerApply?.({
        batchId: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ruleId: selectedRuleId,
        ruleName: selectedRule?.name || 'จัดระเบียบไฟล์',
        sourceDir,
        targetBaseDir: useSameDir ? sourceDir : (targetDir || sourceDir),
        items: selectedItems
      });

      if (res?.success) {
        setResultModal(res);
        showToast(
          'จัดระเบียบไฟล์สำเร็จ!',
          `ย้ายสำเร็จ ${res.movedCount} ไฟล์${res.recycledCount ? `, ส่งสำเนาลงถังขยะ ${res.recycledCount} ไฟล์` : ''}`,
          'success'
        );
        loadHistory();
        // Remove moved items from preview
        setPlanItems([]);
      } else {
        showToast('จัดระเบียบไม่สำเร็จ', res?.error || 'เกิดข้อผิดพลาดในการย้ายไฟล์', 'error');
      }
    } catch (err: any) {
      showToast('ข้อผิดพลาด', err?.message || 'เกิดข้อผิดพลาดในการดำเนินการ', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Undo Batch
  const handleUndoBatch = async (batchId: string) => {
    setUndoingBatchId(batchId);
    try {
      const res = await (window as any).electronAPI?.organizerUndo?.(batchId);
      if (res?.success) {
        showToast(
          'ย้อนกลับไฟล์สำเร็จ (Undo Complete)',
          `คืนค่าไฟล์กลับตำแหน่งเดิมสำเร็จ ${res.restoredCount} รายการ`,
          'success'
        );
        loadHistory();
      } else {
        showToast('ย้อนกลับไม่สำเร็จ', res?.error || 'เกิดข้อผิดพลาดในการย้อนกลับไฟล์', 'error');
      }
    } catch (err: any) {
      showToast('ข้อผิดพลาด', err?.message || 'เกิดข้อผิดพลาดในการย้อนกลับ', 'error');
    } finally {
      setUndoingBatchId(null);
    }
  };

  // Clean Empty Folders
  const handleCleanEmptyFolders = async () => {
    if (!sourceDir) return;
    setIsCleaningEmpty(true);
    try {
      const res = await (window as any).electronAPI?.organizerCleanEmptyFolders?.(sourceDir);
      if (res?.success) {
        setEmptyFoldersCleaned(res.deletedFolders || []);
        showToast(
          'ล้างโฟลเดอร์ว่างสำเร็จ',
          `ลบโฟลเดอร์ที่ไม่มีไฟล์หลงเหลือแล้ว ${res.totalCleaned} โฟลเดอร์`,
          'success'
        );
      } else {
        showToast('ไม่สามารถลบได้', res?.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (e: any) {
      showToast('ข้อผิดพลาด', e?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsCleaningEmpty(false);
    }
  };

  const formatSizeDisplay = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
              <FolderInput className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">ระบบจัดระเบียบไฟล์อัจฉริยะ (File Organizer)</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v0.10.3
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Rule Engine & Undo Journal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดระเบียบโฟลเดอร์อัตโนมัติตามกฎ "ถ้า → แล้ว", ตรวจสอบตัวอย่าง Dry-run ก่อนทำจริง, ป้องกันเขียนทับ และกดย้อนกลับ (Undo) ได้ 100%
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navigation pills */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950/60 backdrop-blur border border-slate-800 rounded-2xl shrink-0">
          <button
            onClick={() => setSubTab('organize')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'organize'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            จัดระเบียบ & พรีวิว
          </button>
          <button
            onClick={() => {
              setSubTab('history');
              loadHistory();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            ประวัติ & Undo ({history.length})
          </button>
          <button
            onClick={() => setSubTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            คลังกฎ ({rules.length})
          </button>
        </div>
      </div>

      {/* Watch Folder Recommendation Alert */}
      {watchAlert && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                คำแนะนำจาก Watch Folder
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300">แจ้งเตือนอัตโนมัติ</span>
              </div>
              <div className="text-xs text-slate-300">{watchAlert.message}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSourceDir(watchAlert.folderPath);
                setSelectedRuleId('preset_downloads');
                runPreview(watchAlert.folderPath, watchAlert.folderPath, 'preset_downloads', '{type}/{year}');
                setWatchAlert(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              จัดระเบียบตามคำแนะนำ
            </button>
            <button
              onClick={() => setWatchAlert(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 1: ORGANIZE & PREVIEW
          ========================================================================= */}
      {subTab === 'organize' && (
        <div className="space-y-6">
          {/* Step 1: Directory Selection & Options */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-sm font-bold text-white">เลือกโฟลเดอร์ต้นทางและปลายทาง</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const dl = `C:\\Users\\${sourceDir.split('\\')[2] || 'User'}\\Downloads`;
                    setSourceDir(dl);
                    runPreview(dl, useSameDir ? dl : targetDir, selectedRuleId, customTemplate);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                >
                  📥 Downloads
                </button>
                <button
                  onClick={() => {
                    const dt = `C:\\Users\\${sourceDir.split('\\')[2] || 'User'}\\Desktop`;
                    setSourceDir(dt);
                    runPreview(dt, useSameDir ? dt : targetDir, selectedRuleId, customTemplate);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                >
                  🖥️ Desktop
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Folder */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>โฟลเดอร์ต้นทาง (Source Directory)</span>
                  <span className="text-[10px] text-slate-500">โฟลเดอร์ที่จะนำไฟล์มาจัดระเบียบ</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sourceDir}
                    onChange={e => setSourceDir(e.target.value)}
                    placeholder="เช่น C:\Users\YourUser\Downloads"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleBrowseSource}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    เลือกโฟลเดอร์
                  </button>
                </div>
              </div>

              {/* Target Folder */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">โฟลเดอร์ปลายทางหลัก (Target Base Directory)</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-indigo-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSameDir}
                      onChange={e => setUseSameDir(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    ใช้โฟลเดอร์เดียวกับต้นทาง
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={useSameDir}
                    value={useSameDir ? sourceDir : targetDir}
                    onChange={e => setTargetDir(e.target.value)}
                    placeholder={useSameDir ? 'ใช้โฟลเดอร์เดียวกับต้นทาง' : 'เช่น D:\\Organized_Files'}
                    className={`flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 ${
                      useSameDir ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                  {!useSameDir && (
                    <button
                      onClick={handleBrowseTarget}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      เลือกปลายทาง
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scanning Options */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecursive}
                  onChange={e => setIsRecursive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>สแกนโฟลเดอร์ย่อยลึก (Recursive 3 ชั้น) เพื่อรวบรวมไฟล์ที่กระจายอยู่</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">เมื่อชื่อซ้ำ:</span>
                <select
                  value={conflictStrategy}
                  onChange={e => setConflictStrategy(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="rename">เปลี่ยนชื่ออัตโนมัติ (file (1).ext)</option>
                  <option value="recycle_duplicate">ตรวจ Hash (ถ้าเหมือนเป๊ะส่งลง Recycle Bin)</option>
                  <option value="skip">ข้ามไฟล์เดิม (Skip)</option>
                  <option value="overwrite">เขียนทับ (Overwrite)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Choose Preset / Rule & Template */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-sm font-bold text-white">เลือกกฎการจัดระเบียบ (Rule Presets & Template)</h3>
              </div>
            </div>

            {/* Preset Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {rules.map(rule => {
                const isSelected = selectedRuleId === rule.id;
                return (
                  <button
                    key={rule.id}
                    onClick={() => handleSelectRule(rule)}
                    className={`p-3.5 rounded-xl border text-left transition relative ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-bold text-xs text-white truncate">{rule.name}</div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {rule.description}
                    </div>
                    <div className="mt-2 text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20 inline-block">
                      {rule.targetTemplate || '{type}'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Template Builder Tokens */}
            <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-medium text-slate-300 shrink-0">Template ปลายทาง:</span>
                <input
                  type="text"
                  value={customTemplate}
                  onChange={e => setCustomTemplate(e.target.value)}
                  placeholder="{type}/{year}/{month}"
                  className="flex-1 max-w-sm px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['{type}', '{ext}', '{year}', '{month}', '{day}', '{name}', '{counter}'].map(t => (
                    <button
                      key={t}
                      onClick={() => handleInsertToken(t)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition"
                      title={`แทรกตัวแปร ${t}`}
                    >
                      +{t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Scan Button */}
              <button
                disabled={isPreviewLoading || !sourceDir}
                onClick={() => runPreview()}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-lg shrink-0 ${
                  isPreviewLoading || !sourceDir
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPreviewLoading ? 'animate-spin' : ''}`} />
                {isPreviewLoading ? 'กำลังสแกนและประเมินกฎ...' : 'สแกนและดูตัวอย่าง (Dry-Run Preview)'}
              </button>
            </div>
          </div>

          {/* Step 3: Dry-Run Preview Table */}
          {planItems.length > 0 && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">ไฟล์ที่ตรวจพบ</div>
                  <div className="text-lg font-bold text-white mt-0.5">{planItems.length} ไฟล์</div>
                  <div className="text-[10px] text-indigo-300 mt-0.5">เลือก {selectedItems.length} ไฟล์</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">ขนาดไฟล์รวม</div>
                  <div className="text-lg font-bold text-white mt-0.5">{formatSizeDisplay(totalSelectedBytes)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">พร้อมจัดระเบียบ</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">ชื่อซ้ำที่ปลายทาง</div>
                  <div className={`text-lg font-bold mt-0.5 ${conflictStats.nameCollisions > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {conflictStats.nameCollisions} ไฟล์
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">แก้โดยเปลี่ยนชื่อ (1)</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">สำเนาเนื้อหาซ้ำเป๊ะ (Hash)</div>
                  <div className={`text-lg font-bold mt-0.5 ${conflictStats.identicalDuplicates > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {conflictStats.identicalDuplicates} ไฟล์
                  </div>
                  <div className="text-[10px] text-rose-300/80 mt-0.5">เสนอส่งลง Recycle Bin</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">ย้ายข้ามไดรฟ์</div>
                  <div className={`text-lg font-bold mt-0.5 ${conflictStats.crossDrives > 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {conflictStats.crossDrives} ไฟล์
                  </div>
                  <div className="text-[10px] text-cyan-300/80 mt-0.5">Copy → Verify → Delete</div>
                </div>
              </div>

              {/* Table Filter Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === planItems.length && planItems.length > 0}
                      onChange={e => handleToggleSelectAll(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>เลือกทั้งหมด ({selectedItems.length}/{planItems.length})</span>
                  </label>
                  <span className="text-slate-700">|</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      placeholder="ค้นหาชื่อไฟล์..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={conflictFilter}
                    onChange={e => setConflictFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">แสดงทั้งหมด</option>
                    <option value="conflicts_only">เฉพาะไฟล์ที่มี Conflict</option>
                    <option value="duplicates_only">เฉพาะสำเนาซ้ำ (Hash)</option>
                  </select>

                  <button
                    disabled={selectedItems.length === 0 || isApplying}
                    onClick={() => setConfirmModalOpen(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg ${
                      selectedItems.length === 0 || isApplying
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    🚀 ดำเนินการย้าย {selectedItems.length} ไฟล์ ({formatSizeDisplay(totalSelectedBytes)})
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10">#</th>
                        <th className="py-2.5 px-3">ชื่อไฟล์</th>
                        <th className="py-2.5 px-3">เส้นทางต้นทาง → ปลายทางใหม่</th>
                        <th className="py-2.5 px-3 w-24">ขนาด</th>
                        <th className="py-2.5 px-3 w-32">หมวดหมู่</th>
                        <th className="py-2.5 px-3 w-40">สถานะ & Conflict</th>
                        <th className="py-2.5 px-3 w-36">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredPlanItems.map((item, idx) => {
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-900/60 transition ${
                              !item.isSelected ? 'opacity-40' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <input
                                type="checkbox"
                                checked={item.isSelected}
                                onChange={() => handleToggleItem(item.id)}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-medium text-white max-w-[200px] truncate" title={item.fileName}>
                              {item.fileName}
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              <div className="text-slate-400 truncate max-w-xs" title={item.sourcePath}>
                                {item.sourcePath}
                              </div>
                              <div className="flex items-center gap-1.5 text-indigo-300 font-mono mt-0.5 truncate max-w-xs" title={item.targetPath}>
                                <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">{item.targetPath}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                              {item.formattedSize}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.conflictType === 'identical_duplicate' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  สำเนาซ้ำเป๊ะ (Hash)
                                </span>
                              ) : item.conflictType === 'name_collision' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  ชื่อซ้ำ (เปลี่ยนชื่อ)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                  <Check className="w-3 h-3" />
                                  พร้อมย้าย
                                </span>
                              )}
                              {item.isCrossDrive && (
                                <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-block">
                                  ข้ามไดรฟ์
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.suggestedAction}
                                onChange={e => handleUpdateItemAction(item.id, e.target.value)}
                                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full"
                              >
                                <option value="rename">เปลี่ยนชื่อ (1)</option>
                                <option value="skip">ข้าม (Skip)</option>
                                <option value="overwrite">เขียนทับ</option>
                                {item.conflictType === 'identical_duplicate' && (
                                  <option value="recycle_duplicate">ส่งสำเนาลงถังขยะ</option>
                                )}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: HISTORY & UNDO JOURNAL
          ========================================================================= */}
      {subTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                ประวัติการจัดระเบียบไฟล์ & Undo Journal
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                บันทึกประวัติการย้ายไฟล์ทุกชุด สามารถกดย้อนกลับไฟล์ทั้งหมดกลับตำแหน่งเดิมได้ตลอดเวลา
              </p>
            </div>
            <button
              onClick={loadHistory}
              disabled={isHistoryLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} />
              รีเฟรชประวัติ
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-500 space-y-2">
              <FolderCheck className="w-10 h-10 mx-auto text-slate-600" />
              <div className="font-semibold text-slate-400">ยังไม่มีประวัติการจัดระเบียบไฟล์</div>
              <div className="text-xs">เมื่อดำเนินการจัดระเบียบไฟล์ ระบบจะบันทึกประวัติและรายการย้ายไว้ที่นี่</div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(batch => {
                const isExpanded = !!expandedBatchIds[batch.batchId];
                const isUndoing = undoingBatchId === batch.batchId;
                return (
                  <div
                    key={batch.batchId}
                    className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg transition"
                  >
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{batch.ruleName || 'จัดระเบียบไฟล์'}</span>
                          <span className="text-xs font-mono text-slate-400">({batch.batchId})</span>
                          {batch.isUndone ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              ย้อนกลับแล้ว (Undone)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              เสร็จสมบูรณ์
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                          <span>📅 {batch.formattedDate || new Date(batch.createdAt).toLocaleString('th-TH')}</span>
                          <span>•</span>
                          <span>📄 ย้าย {batch.totalFiles} ไฟล์</span>
                          <span>•</span>
                          <span>💾 ขนาด {formatSizeDisplay(batch.totalBytes || 0)}</span>
                          {batch.recycledDuplicates > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-rose-400">♻️ สำเนาลงถังขยะ {batch.recycledDuplicates} ไฟล์</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-xl">
                          {batch.sourceDirectory} → {batch.targetBaseDirectory}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandedBatchIds(prev => ({ ...prev, [batch.batchId]: !prev[batch.batchId] }))}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {isExpanded ? 'ซ่อนรายการ' : `ดู ${batch.records?.length || 0} ไฟล์`}
                        </button>

                        {!batch.isUndone && (
                          <button
                            disabled={isUndoing}
                            onClick={() => handleUndoBatch(batch.batchId)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                            {isUndoing ? 'กำลังย้อนกลับ...' : '↩️ ย้อนกลับทั้งชุด (Undo)'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded file records */}
                    {isExpanded && batch.records && batch.records.length > 0 && (
                      <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 max-h-72 overflow-y-auto">
                        <div className="space-y-2">
                          {batch.records.map((rec: any, rIdx: number) => (
                            <div
                              key={rec.id || rIdx}
                              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] flex flex-col md:flex-row md:items-center justify-between gap-2"
                            >
                              <div className="truncate flex-1 space-y-0.5">
                                <div className="text-slate-400 truncate">ต้นทาง: {rec.sourcePath}</div>
                                <div className="text-indigo-300 truncate font-mono">ปลายทาง: {rec.destinationPath}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-slate-400">{formatSizeDisplay(rec.fileSize || 0)}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.status === 'restored'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {rec.status === 'restored' ? 'คืนค่าแล้ว' : 'ย้ายแล้ว'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: RULES & PRESETS
          ========================================================================= */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                คลังกฎการจัดระเบียบไฟล์ (Rule Engine)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                กำหนดเงื่อนไข "ถ้า → แล้ว" นามสกุล, ขนาด, วันที่, โฟลเดอร์ เพื่อจัดหมวดหมู่อัตโนมัติ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    {rule.name}
                    {rule.isPreset && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        พรีเซ็ตในตัว
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500">ลำดับ: {rule.priority || 100}</span>
                </div>
                <div className="text-xs text-slate-400">{rule.description}</div>
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Template ปลายทาง:</span>
                    <span className="font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded">
                      {rule.targetTemplate || '{type}'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">การจัดการเมื่อชื่อซ้ำ:</span>
                    <span className="text-slate-300 font-medium">{rule.conflictStrategy || 'rename'}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      handleSelectRule(rule);
                      setSubTab('organize');
                    }}
                    className="w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition"
                  >
                    ใช้กฎนี้ในการจัดระเบียบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการจัดระเบียบไฟล์จริง</h3>
                <p className="text-xs text-slate-400">ระบบพร้อมบันทึกทุกขั้นตอนลง Undo Journal</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">จำนวนไฟล์ที่จะย้าย:</span>
                <span className="font-bold text-white">{selectedItems.length} ไฟล์</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ขนาดไฟล์รวม:</span>
                <span className="font-bold text-indigo-300">{formatSizeDisplay(totalSelectedBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">โฟลเดอร์ต้นทาง:</span>
                <span className="text-slate-300 font-mono truncate max-w-[200px]" title={sourceDir}>{sourceDir}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">โฟลเดอร์ปลายทาง:</span>
                <span className="text-slate-300 font-mono truncate max-w-[200px]" title={useSameDir ? sourceDir : targetDir}>
                  {useSameDir ? sourceDir : targetDir}
                </span>
              </div>
              {conflictStats.identicalDuplicates > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>สำเนาซ้ำเป๊ะ (Hash):</span>
                  <span className="font-bold">{conflictStats.identicalDuplicates} ไฟล์ (ลงถังขยะ)</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                ความปลอดภัย 100%:
              </div>
              <div>
                บันทึกลง Undo Journal เรียบร้อย หากต้องการเปลี่ยนใจ สามารถกดย้อนกลับไฟล์ทั้งหมดกลับตำแหน่งเดิมได้ทันที
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleExecuteOrganize}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/25"
              >
                ยืนยันการจัดระเบียบทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal & Empty Folder Cleanup Prompt */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">จัดระเบียบไฟล์เสร็จสมบูรณ์!</h3>
                <p className="text-xs text-slate-400">ย้ายและจัดหมวดหมู่ไฟล์เข้าที่เรียบร้อย</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">ย้ายสำเร็จ:</span>
                <span className="font-bold text-emerald-400">{resultModal.movedCount} ไฟล์</span>
              </div>
              {resultModal.recycledCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">ส่งสำเนาซ้ำลง Recycle Bin:</span>
                  <span className="font-bold text-rose-400">{resultModal.recycledCount} ไฟล์</span>
                </div>
              )}
              {resultModal.failedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">ข้ามหรือล้มเหลว:</span>
                  <span className="font-bold text-amber-400">{resultModal.failedCount} ไฟล์</span>
                </div>
              )}
            </div>

            {/* Empty Folder Cleanup Prompt */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-indigo-300 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  ล้างโฟลเดอร์ว่างเปล่า (Empty Folder Cleanup)
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                หลังย้ายไฟล์ออก อาจมีโฟลเดอร์ย่อยในโฟลเดอร์ต้นทางที่ไม่มีไฟล์ใดหลงเหลือ คุณต้องการตรวจสอบและลบโฟลเดอร์ว่างเหล่านี้หรือไม่?
              </p>
              <button
                disabled={isCleaningEmpty}
                onClick={handleCleanEmptyFolders}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isCleaningEmpty ? 'animate-spin' : ''}`} />
                {isCleaningEmpty ? 'กำลังตรวจลบโฟลเดอร์ว่าง...' : '🗑️ ตรวจและลบโฟลเดอร์ว่างเปล่าทันที'}
              </button>
              {emptyFoldersCleaned.length > 0 && (
                <div className="text-[11px] text-emerald-400">
                  ลบโฟลเดอร์ว่างสำเร็จแล้ว {emptyFoldersCleaned.length} รายการ
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setResultModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
