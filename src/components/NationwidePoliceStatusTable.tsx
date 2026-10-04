/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppTheme } from '../data/themes';
import {
  NationwideUnitRow,
  UnitManpowerRanks,
  UnitTierLevel,
} from '../types/nationwidePolice';
import { PoliceOfficer } from '../types/personnel';
import {
  getInitialNationwidePoliceData,
  calculateTotalsForNationwideRows,
  enrichNationwideUnitRow,
  getStandardPresetRanks,
  NATIONWIDE_POLICE_TITLE,
} from '../data/nationwidePoliceData';
import { RTP_BUREAUS_DATA, PoliceGroup } from '../data/rtpStructure';
import {
  exportNationwidePoliceWorkbook,
  exportActiveViewToExcel,
  exportNationwidePoliceCSV,
} from '../utils/nationwidePoliceExcelExporter';
import {
  parseNationwidePoliceExcelFile,
  syncNationwideFromOfficersRoster,
  NationwideImportResult,
} from '../utils/nationwidePoliceParser';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';
import { PoliceEmblem } from './PoliceEmblem';
import { ThaiKanokPattern } from './ThaiKanokPattern';
import {
  Building2,
  Building,
  Shield,
  Layers,
  Search,
  Download,
  Upload,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  RotateCcw,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Users,
  Award,
  TrendingUp,
  FolderTree,
  SlidersHorizontal,
} from 'lucide-react';

interface NationwidePoliceStatusTableProps {
  currentTheme: AppTheme;
  officers?: PoliceOfficer[];
  onShowToast?: (msg: string) => void;
}

export const NationwidePoliceStatusTable: React.FC<NationwidePoliceStatusTableProps> = ({
  currentTheme,
  officers = [],
  onShowToast = () => {},
}) => {
  // Load persisted nationwide data or initialize from complete RTP structure
  const [rows, setRows] = useState<NationwideUnitRow[]>(() => {
    const saved = safeLocalStorageGet('nationwide_police_status_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return getInitialNationwidePoliceData();
  });

  // Save to storage on change
  useEffect(() => {
    safeLocalStorageSet('nationwide_police_status_v1', JSON.stringify(rows));
  }, [rows]);

  // Filtering State
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'บช.' | 'บก.' | 'กก.'>('all');
  const [selectedGroup, setSelectedGroup] = useState<PoliceGroup>('all');
  const [selectedBureauId, setSelectedBureauId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Tree expansion state (stores set of expanded unit IDs)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Default: Expand first 3 Bureaus
    const initialExpanded = new Set<string>();
    initialExpanded.add('bureau-สกพ.');
    initialExpanded.add('bureau-บช.น.');
    initialExpanded.add('bureau-ภ.1');
    return initialExpanded;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set(rows.map((r) => r.id));
    setExpandedIds(allIds);
    onShowToast('ขยายผังโครงสร้างหน่วยงานทั้งหมดเรียบร้อยแล้ว');
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
    onShowToast('ยุบผังโครงสร้างหน่วยงานทั้งหมดเรียบร้อยแล้ว');
  };

  // Pagination for large dataset performance
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [selectedRowForEdit, setSelectedRowForEdit] = useState<NationwideUnitRow | null>(null);

  // Selected row IDs for batch actions
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Add Form State
  const [addUnitLevel, setAddUnitLevel] = useState<UnitTierLevel>('กก.');
  const [addBureauId, setAddBureauId] = useState<string>('สกพ.');
  const [addDivisionName, setAddDivisionName] = useState<string>('');
  const [addUnitName, setAddUnitName] = useState<string>('');
  const [addUnitNo, setAddUnitNo] = useState<string>('');
  const [addPreset, setAddPreset] = useState<'station_m' | 'station_l' | 'station_s' | 'division' | 'support_dept' | 'custom'>('station_m');
  const [addRanks, setAddRanks] = useState<UnitManpowerRanks>(() => getStandardPresetRanks('กก.', 'station_m'));

  // Import State
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importResult, setImportResult] = useState<NationwideImportResult | null>(null);
  const [isLoadingImport, setIsLoadingImport] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bureaus list for dropdowns
  const allBureausList = useMemo(() => {
    return RTP_BUREAUS_DATA.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.fullName,
      group: b.group,
    }));
  }, []);

  // Filtered Rows Calculation
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Level filter
      if (selectedLevel !== 'all' && r.unitLevel !== selectedLevel) {
        return false;
      }

      // 2. Group filter
      if (selectedGroup !== 'all' && r.group !== selectedGroup) {
        return false;
      }

      // 3. Bureau filter
      if (selectedBureauId !== 'all' && r.bureauId !== selectedBureauId) {
        return false;
      }

      // 4. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = r.unitName.toLowerCase().includes(q);
        const matchBureau = r.bureauName.toLowerCase().includes(q) || r.bureauId.toLowerCase().includes(q);
        const matchDiv = r.divisionName ? r.divisionName.toLowerCase().includes(q) : false;
        const matchNo = String(r.no).toLowerCase().includes(q);
        if (!matchName && !matchBureau && !matchDiv && !matchNo) {
          return false;
        }
      }

      // 5. Hierarchy visibility (When viewing 'all' levels and not searching)
      if (selectedLevel === 'all' && !searchTerm.trim()) {
        if (r.unitLevel === 'บก.') {
          // If parent บช. is collapsed, hide this บก.
          if (r.parentId && !expandedIds.has(r.parentId)) {
            return false;
          }
        } else if (r.unitLevel === 'กก.') {
          // If parent บก. is collapsed, or grand-parent บช. is collapsed, hide this กก.
          const parentDiv = rows.find((x) => x.id === r.parentId);
          if (r.parentId && !expandedIds.has(r.parentId)) {
            return false;
          }
          if (parentDiv && parentDiv.parentId && !expandedIds.has(parentDiv.parentId)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rows, selectedLevel, selectedGroup, selectedBureauId, searchTerm, expandedIds]);

  // Grand totals across all rows in database
  const nationwideGrandTotals = useMemo(() => {
    // Only count leaf units or aggregate correctly to avoid double counting
    // If we count all rows, we sum Level 'กก.' + standalone units, or sum Level 'บช.'
    const bureauRowsOnly = rows.filter((r) => r.unitLevel === 'บช.');
    return calculateTotalsForNationwideRows(bureauRowsOnly.length > 0 ? bureauRowsOnly : rows);
  }, [rows]);

  // Filtered view totals (calculated dynamically on active set)
  const activeViewTotals = useMemo(() => {
    return calculateTotalsForNationwideRows(filteredRows);
  }, [filteredRows]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows; // Show all
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / (pageSize || 1)) || 1;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLevel, selectedGroup, selectedBureauId, searchTerm, pageSize]);

  // Inline Cell Value Update
  const handleUpdateRankCell = (
    rowId: string,
    rankKey: keyof UnitManpowerRanks,
    field: 'positions' | 'occupied',
    val: string
  ) => {
    const num = Math.max(0, parseInt(val, 10) || 0);

    setRows((prev) => {
      return prev.map((r) => {
        if (r.id !== rowId) return r;
        const newRanks: UnitManpowerRanks = {
          ...r.ranks,
          [rankKey]: {
            ...r.ranks[rankKey],
            [field]: num,
          },
        };
        return enrichNationwideUnitRow({
          ...r,
          ranks: newRanks,
        });
      });
    });
  };

  // Row Delete
  const handleDeleteRow = (row: NationwideUnitRow) => {
    if (window.confirm(`ยืนยันการลบหน่วยงาน "${row.unitName}" (${row.unitLevel}) ออกจากตารางหรือไม่?`)) {
      setRows((prev) => prev.filter((r) => r.id !== row.id && r.parentId !== row.id));
      onShowToast(`ลบหน่วยงาน "${row.unitName}" เรียบร้อยแล้ว`);
    }
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (selectedRowIds.size === 0) return;
    if (window.confirm(`ยืนยันการลบหน่วยงานที่เลือกจำนวน ${selectedRowIds.size} รายการ หรือไม่?`)) {
      setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
      setSelectedRowIds(new Set());
      onShowToast(`ลบหน่วยงานที่เลือกจำนวน ${selectedRowIds.size} รายการ เรียบร้อยแล้ว`);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (row: NationwideUnitRow) => {
    setSelectedRowForEdit(JSON.parse(JSON.stringify(row)));
    setIsEditModalOpen(true);
  };

  // Save Edit Modal
  const handleSaveEditModal = () => {
    if (!selectedRowForEdit) return;
    const enriched = enrichNationwideUnitRow(selectedRowForEdit);
    setRows((prev) => prev.map((r) => (r.id === enriched.id ? enriched : r)));
    setIsEditModalOpen(false);
    setSelectedRowForEdit(null);
    onShowToast(`บันทึกการแก้ไขข้อมูลหน่วยงาน "${enriched.unitName}" เรียบร้อย`);
  };

  // Save Add Modal
  const handleSaveAddModal = () => {
    if (!addUnitName.trim()) {
      alert('กรุณากรอกชื่อหน่วยงาน');
      return;
    }

    const matchedBureau = RTP_BUREAUS_DATA.find((b) => b.id === addBureauId);
    const newId = `unit-${Date.now()}`;
    const newRow = enrichNationwideUnitRow({
      id: newId,
      unitLevel: addUnitLevel,
      bureauId: addBureauId,
      bureauName: matchedBureau ? matchedBureau.fullName : addBureauId,
      divisionName: addDivisionName || undefined,
      no: addUnitNo || `${rows.length + 1}`,
      unitName: addUnitName.trim(),
      shortName: addUnitName.trim(),
      group: matchedBureau ? matchedBureau.group : 'command_support',
      groupName: matchedBureau ? matchedBureau.groupName : 'ส่วนอำนวยการและสนับสนุน',
      ranks: addRanks,
      depth: addUnitLevel === 'บช.' ? 0 : addUnitLevel === 'บก.' ? 1 : 2,
    });

    setRows((prev) => [newRow, ...prev]);
    setIsAddModalOpen(false);
    setAddUnitName('');
    setAddUnitNo('');
    onShowToast(`เพิ่มหน่วยงาน "${newRow.unitName}" (${newRow.unitLevel}) เข้าสู่ตารางเรียบร้อยแล้ว`);
  };

  // Sync from Officers Roster
  const handleSyncFromRoster = () => {
    if (officers.length === 0) {
      alert('ไม่พบข้อมูลข้าราชการตำรวจในระบบ (0 อัตรา) กรุณานำเข้าข้อมูลกำลังพลที่เมนู "อัปเดต / ส่งออก" ก่อน');
      return;
    }

    const res = syncNationwideFromOfficersRoster(rows, officers);
    setRows(res.rows);
    onShowToast(
      `เชื่อมโยงและคำนวณสถานภาพกำลังพลจากข้าราชการตำรวจจริง ${res.matchedOfficersCount} รายการ สำเร็จแล้ว!`
    );
  };

  // Reset to Baseline
  const handleResetToBaseline = () => {
    const initial = getInitialNationwidePoliceData();
    setRows(initial);
    safeLocalStorageSet('nationwide_police_status_v1', JSON.stringify(initial));
    setIsResetConfirmModalOpen(false);
    onShowToast('รีเซ็ตโครงสร้างและสถานภาพกำลังพลทั้งประเทศกลับสู่ค่ามาตรฐาน ตร. เรียบร้อยแล้ว');
  };

  // File Upload Handlers
  const handleFileUpload = async (file: File) => {
    setIsLoadingImport(true);
    setImportErrorMessage(null);
    try {
      const result = await parseNationwidePoliceExcelFile(file, rows);
      if (result.success) {
        setImportResult(result);
      } else {
        setImportErrorMessage(result.message);
      }
    } catch (err: any) {
      setImportErrorMessage(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err?.message || 'รูปแบบไฟล์ไม่ถูกต้อง'}`);
    } finally {
      setIsLoadingImport(false);
    }
  };

  const handleApplyImport = () => {
    if (!importResult) return;
    if (importMode === 'replace') {
      setRows(importResult.rows);
      onShowToast(`แทนที่ข้อมูลสถานภาพกำลังพลทั้งประเทศด้วยไฟล์ "${importResult.fileName}" เรียบร้อยแล้ว (${importResult.rows.length} หน่วยงาน)`);
    } else {
      setRows((prev) => [...prev, ...importResult.rows]);
      onShowToast(`เพิ่มข้อมูล ${importResult.rows.length} หน่วยงาน เข้าสู่ตารางเรียบร้อยแล้ว`);
    }
    setIsImportModalOpen(false);
    setImportResult(null);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Header Banner & Title */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-sm ${
          currentTheme.isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-slate-800 text-white'
            : 'bg-gradient-to-br from-white via-slate-50 to-amber-50/40 border-slate-200/90 text-slate-800'
        }`}
      >
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <PoliceEmblem size={260} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Building2 className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  สำนักงานตำรวจแห่งชาติ (ตร.)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  ครอบคลุมทั้งประเทศ (บช. / บก. / กก.)
                </span>
                {isEditMode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 animate-pulse">
                    โหมดแก้ไขในตารางเปิดอยู่
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-['Chakra_Petch',sans-serif] mt-1 tracking-tight text-slate-900 dark:text-white">
                สถานภาพกำลังพลตำรวจทั้งประเทศ
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-['Prompt',sans-serif] mt-0.5">
                ตารางวิเคราะห์กรอบอัตรากำลังและคนครอง ครบทุกระดับโครงสร้าง กองบัญชาการ (บช.) กองบังคับการ (บก.) และกองกำกับการ/สถานีตำรวจ (กก./สภ.)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
            {/* Sync from Roster */}
            <button
              onClick={handleSyncFromRoster}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 transition-all cursor-pointer shadow-2xs"
              title="ดึงข้อมูลคนครองจากทำเนียบกำลังพลจริง สกพ. ในระบบ"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
              <span>ซิงค์จากกำลังพลจริง ({officers.length})</span>
            </button>

            {/* Toggle Inline Edit */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                isEditMode
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไขในตาราง'}</span>
            </button>

            {/* Add Unit */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มเติมหน่วยงาน</span>
            </button>

            {/* Import / Upload */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>อัปโหลด</span>
            </button>

            {/* Export Dropdown / Download */}
            <div className="flex items-center rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <button
                onClick={() => exportNationwidePoliceWorkbook(rows, filteredRows)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer border-r border-slate-200 dark:border-slate-700"
                title="ดาวน์โหลดสมุดงาน Excel ครบทุกแผ่นงาน (Full Workbook)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>ดาวน์โหลด Excel</span>
              </button>
              <button
                onClick={() => exportNationwidePoliceCSV(filteredRows)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="ดาวน์โหลดเป็นไฟล์ CSV"
              >
                CSV
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={() => setIsResetConfirmModalOpen(true)}
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="รีเซ็ตโครงสร้างเริ่มต้น ตร."
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
          {/* Card 1: Total Units */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building className="w-3 h-3 text-amber-500" />
              จำนวนหน่วยงาน
            </span>
            <div className="text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] mt-0.5 text-slate-800 dark:text-white">
              {rows.length.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">
              บช. {rows.filter((r) => r.unitLevel === 'บช.').length} / บก. {rows.filter((r) => r.unitLevel === 'บก.').length} / กก. {rows.filter((r) => r.unitLevel === 'กก.').length}
            </span>
          </div>

          {/* Card 2: Total Positions */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-500" />
              กรอบอัตรา (ตำแหน่ง)
            </span>
            <div className="text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] mt-0.5 text-blue-600 dark:text-blue-400">
              {nationwideGrandTotals.grandTotal.positions.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">
              สัญญาบัตร {nationwideGrandTotals.totalCommissioned.positions.toLocaleString()}
            </span>
          </div>

          {/* Card 3: Occupied */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              กำลังพลคนครอง
            </span>
            <div className="text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] mt-0.5 text-emerald-600 dark:text-emerald-400">
              {nationwideGrandTotals.grandTotal.occupied.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">
              ประทวน {nationwideGrandTotals.totalNonCommissioned.occupied.toLocaleString()}
            </span>
          </div>

          {/* Card 4: Vacant */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-500" />
              ตำแหน่งว่าง / ขาด
            </span>
            <div className="text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] mt-0.5 text-rose-600 dark:text-rose-400">
              {nationwideGrandTotals.vacant.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-500/80">
              ว่าง {((nationwideGrandTotals.vacant / (nationwideGrandTotals.grandTotal.positions || 1)) * 100).toFixed(1)}%
            </span>
          </div>

          {/* Card 5: Percent Occupancy */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-500" />
              ร้อยละคนครอง
            </span>
            <div className="text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] mt-0.5 text-amber-600 dark:text-amber-400">
              {nationwideGrandTotals.occupancyPercent}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, nationwideGrandTotals.occupancyPercent)}%` }}
              />
            </div>
          </div>

          {/* Card 6: Active Filter Rows Summary */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-indigo-500" />
              แถวที่แสดงผล
            </span>
            <div className="text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] mt-0.5 text-indigo-600 dark:text-indigo-400">
              {filteredRows.length} <span className="text-xs font-normal text-slate-400">/ {rows.length}</span>
            </div>
            <span className="text-[10px] text-slate-400">
              ตามตัวกรองที่เลือก
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Multi-Level Filter Bar */}
      <div
        className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
          currentTheme.isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Level Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5" />
              ระดับ:
            </span>
            {(
              [
                { id: 'all', label: 'ทุกระดับ (บช. ➔ บก. ➔ กก.)' },
                { id: 'บช.', label: 'ระดับ บช. (กองบัญชาการ)' },
                { id: 'บก.', label: 'ระดับ บก. (กองบังคับการ/กอง)' },
                { id: 'กก.', label: 'ระดับ กก. (สภ./สน./ฝ่าย)' },
              ] as const
            ).map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedLevel === lvl.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Tree View Expand/Collapse Tools */}
          {selectedLevel === 'all' && !searchTerm && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="ขยายผังแสดงทุกหน่วยงานย่อย"
              >
                ขยายทั้งหมด
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="ยุบผังแสดงเฉพาะหน่วยหลัก"
              >
                ยุบทั้งหมด
              </button>
            </div>
          )}
        </div>

        {/* Secondary Filters: Group, Bureau, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Mission Group Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">กลุ่มภารกิจ ตร.</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value as PoliceGroup)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">ทุกสายงาน/ภารกิจ (ทั้งหมด)</option>
              <option value="command_support">ส่วนอำนวยการและสนับสนุน (สกพ., สงป., สยศ. ฯลฯ)</option>
              <option value="area_commands">ส่วนป้องกันปราบปรามพื้นที่ (ภ.1 - ภ.9, บช.น.)</option>
              <option value="specialized">ส่วนเฉพาะทาง/ปฏิบัติการพิเศษ (บช.ก., ปส., สตม. ฯลฯ)</option>
              <option value="education">สถาบันการศึกษาและฝึกอบรม (บช.ศ., รร.นรต.)</option>
            </select>
          </div>

          {/* Bureau Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">เลือกกองบัญชาการ (บช.)</label>
            <select
              value={selectedBureauId}
              onChange={(e) => setSelectedBureauId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">ทุกกองบัญชาการทั่วประเทศ (ทั้งหมด)</option>
              {allBureausList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">ค้นหาชื่อหน่วยงาน</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="เช่น สน.ชนะสงคราม, บก.ป., สกพ...."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Page Size & Selection Info */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">แสดงแถวต่อหน้า</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value={25}>25 แถว</option>
                <option value={50}>50 แถว</option>
                <option value={100}>100 แถว</option>
                <option value={200}>200 แถว</option>
                <option value={0}>แสดงทั้งหมด (ไม่แบ่งหน้า)</option>
              </select>
            </div>

            {selectedRowIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบ {selectedRowIds.size}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Nationwide Police Status Table */}
      <div
        className={`rounded-2xl border shadow-sm overflow-hidden ${
          currentTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto max-h-[720px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <table className="w-full text-xs border-collapse text-left whitespace-nowrap">
            {/* Header Tier 1 & 2 */}
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* Row 1 */}
              <tr className="bg-slate-800 text-slate-100 font-bold border-b border-slate-700 text-center">
                <th rowSpan={2} className="px-2.5 py-2.5 w-10 border-r border-slate-700">
                  <input
                    type="checkbox"
                    checked={paginatedRows.length > 0 && paginatedRows.every((r) => selectedRowIds.has(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRowIds(new Set(paginatedRows.map((r) => r.id)));
                      } else {
                        setSelectedRowIds(new Set());
                      }
                    }}
                    className="rounded text-amber-500"
                  />
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-14 border-r border-slate-700">
                  ลำดับ
                </th>
                <th rowSpan={2} className="px-3 py-2.5 text-left min-w-[220px] border-r border-slate-700">
                  หน่วยงาน / สังกัด
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-14 border-r border-slate-700">
                  ระดับ
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  ผบช./ผบก.
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  รอง ผบก.
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  ผกก.
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  รอง ผกก.
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  สว.
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  รอง สว.
                </th>
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-700 bg-blue-900/40 text-blue-200">
                  รวมสัญญาบัตร
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  รอง สว.(ท.)
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  ผบ.หมู่
                </th>
                <th colSpan={2} className="px-1.5 py-1.5 border-r border-slate-700 bg-slate-800/90">
                  รอง ผบ.หมู่
                </th>
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-700 bg-purple-900/40 text-purple-200">
                  รวมประทวน
                </th>
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-700 bg-amber-900/40 text-amber-200">
                  รวมทั้งหมด
                </th>
                <th rowSpan={2} className="px-2.5 py-2.5 w-16 border-r border-slate-700 text-rose-300">
                  ขาด/ว่าง
                </th>
                <th rowSpan={2} className="px-2.5 py-2.5 w-16 border-r border-slate-700 text-amber-300">
                  % ครอง
                </th>
                <th rowSpan={2} className="px-3 py-2.5 w-24">
                  จัดการ
                </th>
              </tr>

              {/* Row 2 (ตำแหน่ง / คนครอง) */}
              <tr className="bg-slate-900 text-[11px] text-slate-300 font-medium border-b border-slate-700 text-center">
                {/* 11 paired columns: ผบก, รองผบก, ผกก, รองผกก, สว, รองสว, รวมสัญญาบัตร, รองสว.ท, ผบ.หมู่, รองผบ.หมู่, รวมประทวน, รวมทั้งหมด */}
                {[
                  'ผบก', 'รองผบก', 'ผกก', 'รองผกก', 'สว', 'รองสว', 'รวมสัญญาบัตร',
                  'รองสว.ท', 'ผบ.หมู่', 'รองผบ.หมู่', 'รวมประทวน', 'รวมทั้งหมด'
                ].map((colName, idx) => (
                  <React.Fragment key={idx}>
                    <th className="px-1 py-1 w-10 border-r border-slate-700/60 font-mono text-[10px]">
                      ตำแหน่ง
                    </th>
                    <th className="px-1 py-1 w-10 border-r border-slate-700 font-mono text-[10px] text-emerald-400">
                      คนครอง
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={32} className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    ไม่พบข้อมูลหน่วยงานตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isBureau = row.unitLevel === 'บช.';
                  const isDivision = row.unitLevel === 'บก.';
                  const isExpanded = expandedIds.has(row.id);
                  const hasChildren = (row.childrenIds && row.childrenIds.length > 0) || isBureau || isDivision;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isBureau
                          ? currentTheme.isDark
                            ? 'bg-slate-800/80 hover:bg-slate-800 font-semibold'
                            : 'bg-amber-50/70 hover:bg-amber-100/70 font-semibold'
                          : isDivision
                          ? currentTheme.isDark
                            ? 'bg-slate-900/50 hover:bg-slate-800/40'
                            : 'bg-slate-50/80 hover:bg-slate-100/80'
                          : currentTheme.isDark
                          ? 'hover:bg-slate-800/30'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2.5 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(row.id)}
                          onChange={(e) => {
                            const next = new Set(selectedRowIds);
                            if (e.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            setSelectedRowIds(next);
                          }}
                          className="rounded text-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* No. */}
                      <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {row.no}
                      </td>

                      {/* Unit Name with Hierarchy indentation */}
                      <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">
                        <div
                          className="flex items-center gap-1.5"
                          style={{
                            paddingLeft:
                              row.unitLevel === 'บช.'
                                ? '0px'
                                : row.unitLevel === 'บก.'
                                ? '16px'
                                : '32px',
                          }}
                        >
                          {/* Tree Chevron */}
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpand(row.id)}
                              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="w-4 inline-block" />
                          )}

                          <span
                            className={`${
                              isBureau
                                ? 'font-bold text-slate-900 dark:text-white'
                                : isDivision
                                ? 'font-medium text-slate-800 dark:text-slate-200'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {row.unitName}
                          </span>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isBureau
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : isDivision
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {row.unitLevel}
                        </span>
                      </td>

                      {/* Rank Pairs Render Helper */}
                      {(
                        [
                          'pbg',
                          'rpbg',
                          'pgk',
                          'rpgk',
                          'sw',
                          'rsw',
                        ] as Array<keyof UnitManpowerRanks>
                      ).map((rankKey) => (
                        <React.Fragment key={rankKey}>
                          {/* Positions */}
                          <td className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-200/60 dark:border-slate-800/60">
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={row.ranks[rankKey].positions}
                                onChange={(e) =>
                                  handleUpdateRankCell(row.id, rankKey, 'positions', e.target.value)
                                }
                                className="w-10 text-center font-mono text-xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-0.5"
                              />
                            ) : (
                              row.ranks[rankKey].positions || '-'
                            )}
                          </td>
                          {/* Occupied */}
                          <td className="px-1 py-1.5 text-center font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-emerald-500/5">
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={row.ranks[rankKey].occupied}
                                onChange={(e) =>
                                  handleUpdateRankCell(row.id, rankKey, 'occupied', e.target.value)
                                }
                                className="w-10 text-center font-mono text-xs rounded bg-white dark:bg-slate-800 border border-emerald-400 text-emerald-600 font-bold p-0.5"
                              />
                            ) : (
                              row.ranks[rankKey].occupied || '-'
                            )}
                          </td>
                        </React.Fragment>
                      ))}

                      {/* Total Commissioned (สัญญาบัตร) */}
                      <td className="px-1.5 py-1.5 text-center font-mono font-bold text-blue-700 dark:text-blue-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-blue-500/10">
                        {row.totalCommissioned.positions}
                      </td>
                      <td className="px-1.5 py-1.5 text-center font-mono font-bold text-blue-800 dark:text-blue-200 border-r border-slate-200 dark:border-slate-800 bg-blue-500/15">
                        {row.totalCommissioned.occupied}
                      </td>

                      {/* Non-commissioned ranks: รอง สว.(ท.), ผบ.หมู่, รอง ผบ.หมู่ */}
                      {(
                        ['rt_dt53', 'pbm', 'rpbm'] as Array<keyof UnitManpowerRanks>
                      ).map((rankKey) => (
                        <React.Fragment key={rankKey}>
                          <td className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-200/60 dark:border-slate-800/60">
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={row.ranks[rankKey].positions}
                                onChange={(e) =>
                                  handleUpdateRankCell(row.id, rankKey, 'positions', e.target.value)
                                }
                                className="w-10 text-center font-mono text-xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-0.5"
                              />
                            ) : (
                              row.ranks[rankKey].positions || '-'
                            )}
                          </td>
                          <td className="px-1 py-1.5 text-center font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-emerald-500/5">
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={row.ranks[rankKey].occupied}
                                onChange={(e) =>
                                  handleUpdateRankCell(row.id, rankKey, 'occupied', e.target.value)
                                }
                                className="w-10 text-center font-mono text-xs rounded bg-white dark:bg-slate-800 border border-emerald-400 text-emerald-600 font-bold p-0.5"
                              />
                            ) : (
                              row.ranks[rankKey].occupied || '-'
                            )}
                          </td>
                        </React.Fragment>
                      ))}

                      {/* Total Non-Commissioned (ประทวน) */}
                      <td className="px-1.5 py-1.5 text-center font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-purple-500/10">
                        {row.totalNonCommissioned.positions}
                      </td>
                      <td className="px-1.5 py-1.5 text-center font-mono font-bold text-purple-800 dark:text-purple-200 border-r border-slate-200 dark:border-slate-800 bg-purple-500/15">
                        {row.totalNonCommissioned.occupied}
                      </td>

                      {/* Grand Total (รวมทั้งหมด) */}
                      <td className="px-2 py-1.5 text-center font-mono font-black text-slate-900 dark:text-white border-r border-slate-200/60 dark:border-slate-800/60 bg-amber-500/15">
                        {row.grandTotal.positions}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-black text-emerald-700 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-800 bg-emerald-500/20">
                        {row.grandTotal.occupied}
                      </td>

                      {/* Vacant */}
                      <td className="px-2 py-1.5 text-center font-mono text-[11px] font-bold border-r border-slate-200 dark:border-slate-800">
                        {row.vacant > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">{row.vacant}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Occupancy % */}
                      <td className="px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-800">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            row.occupancyPercent >= 90
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.occupancyPercent >= 75
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {row.occupancyPercent}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-amber-500 transition-colors"
                            title="แก้ไขข้อมูลอย่างละเอียด"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(row)}
                            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                            title="ลบแถวนี้"
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

            {/* Total Row (Sticky Bottom) */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-bold border-t-2 border-amber-500 shadow-md">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right border-r border-slate-700">
                  <span className="text-amber-400 font-['Chakra_Petch',sans-serif] tracking-wide text-xs">
                    รวมทั้งสิ้นในมุมมองปัจจุบัน ({filteredRows.length} หน่วยงาน):
                  </span>
                </td>
                {/* 6 Commissioned ranks */}
                {[
                  'pbg',
                  'rpbg',
                  'pgk',
                  'rpgk',
                  'sw',
                  'rsw',
                ].map((k) => (
                  <React.Fragment key={k}>
                    <td className="px-1 py-2 text-center font-mono text-[11px] border-r border-slate-700/60">
                      {activeViewTotals.ranks[k as keyof UnitManpowerRanks].positions}
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-[11px] text-emerald-400 border-r border-slate-700">
                      {activeViewTotals.ranks[k as keyof UnitManpowerRanks].occupied}
                    </td>
                  </React.Fragment>
                ))}
                {/* Commissioned total */}
                <td className="px-1.5 py-2 text-center font-mono font-bold text-blue-300 border-r border-slate-700 bg-blue-950/60">
                  {activeViewTotals.totalCommissioned.positions}
                </td>
                <td className="px-1.5 py-2 text-center font-mono font-bold text-blue-200 border-r border-slate-700 bg-blue-950/80">
                  {activeViewTotals.totalCommissioned.occupied}
                </td>
                {/* 3 Non-commissioned ranks */}
                {['rt_dt53', 'pbm', 'rpbm'].map((k) => (
                  <React.Fragment key={k}>
                    <td className="px-1 py-2 text-center font-mono text-[11px] border-r border-slate-700/60">
                      {activeViewTotals.ranks[k as keyof UnitManpowerRanks].positions}
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-[11px] text-emerald-400 border-r border-slate-700">
                      {activeViewTotals.ranks[k as keyof UnitManpowerRanks].occupied}
                    </td>
                  </React.Fragment>
                ))}
                {/* Non-commissioned total */}
                <td className="px-1.5 py-2 text-center font-mono font-bold text-purple-300 border-r border-slate-700 bg-purple-950/60">
                  {activeViewTotals.totalNonCommissioned.positions}
                </td>
                <td className="px-1.5 py-2 text-center font-mono font-bold text-purple-200 border-r border-slate-700 bg-purple-950/80">
                  {activeViewTotals.totalNonCommissioned.occupied}
                </td>
                {/* Grand totals */}
                <td className="px-2 py-2 text-center font-mono font-black text-amber-300 border-r border-slate-700 bg-amber-950/60">
                  {activeViewTotals.grandTotal.positions}
                </td>
                <td className="px-2 py-2 text-center font-mono font-black text-emerald-300 border-r border-slate-700 bg-emerald-950/60">
                  {activeViewTotals.grandTotal.occupied}
                </td>
                {/* Vacant */}
                <td className="px-2 py-2 text-center font-mono text-rose-300 border-r border-slate-700">
                  {activeViewTotals.vacant}
                </td>
                {/* Percent */}
                <td className="px-2 py-2 text-center font-mono text-amber-300 border-r border-slate-700">
                  {activeViewTotals.occupancyPercent}%
                </td>
                <td className="px-2 py-2 text-center text-[10px] text-slate-400">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500">
              แสดงหน้า <strong className="text-slate-800 dark:text-white">{currentPage}</strong> จากทั้งหมด{' '}
              <strong className="text-slate-800 dark:text-white">{totalPages}</strong> หน้า (รวม{' '}
              {filteredRows.length} รายการ)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                ก่อนหน้า
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pNum = currentPage - 2 + i;
                  if (pNum > totalPages) pNum = totalPages - 4 + i;
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                      currentPage === pNum
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          MODALS
      ========================================================= */}

      {/* Modal 1: Add Unit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-xl p-6 overflow-hidden max-h-[90vh] flex flex-col ${
              currentTheme.isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Chakra_Petch',sans-serif]">
                    เพิ่มเติมหน่วยงานในสถานภาพกำลังพล ตร.
                  </h3>
                  <p className="text-xs text-slate-400">
                    กำหนดข้อมูลระดับหน่วยงาน และกรอบอัตรากำลังคนครอง
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ระดับหน่วยงาน</label>
                  <select
                    value={addUnitLevel}
                    onChange={(e) => {
                      const lvl = e.target.value as UnitTierLevel;
                      setAddUnitLevel(lvl);
                      setAddRanks(getStandardPresetRanks(lvl, 'station_m'));
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="กก.">ระดับ กก. (สถานีตำรวจ / ฝ่าย / กองกำกับการ)</option>
                    <option value="บก.">ระดับ บก. (กองบังคับการ / ตำรวจภูธรจังหวัด / กอง)</option>
                    <option value="บช.">ระดับ บช. (กองบัญชาการ / สำนักงาน)</option>
                  </select>
                </div>

                {/* Bureau */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">สังกัด กองบัญชาการ (บช.)</label>
                  <select
                    value={addBureauId}
                    onChange={(e) => setAddBureauId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  >
                    {allBureausList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Name & No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    ชื่อหน่วยงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addUnitName}
                    onChange={(e) => setAddUnitName(e.target.value)}
                    placeholder="เช่น สน.คลองตัน, กก.1 บก.ป., ฝ่ายอำนวยการ..."
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ลำดับในตาราง</label>
                  <input
                    type="text"
                    value={addUnitNo}
                    onChange={(e) => setAddUnitNo(e.target.value)}
                    placeholder="เช่น 1.15 หรือ 42"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Preset Templates */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  เลือกแม่แบบอัตรากำลังมาตรฐาน (Preset)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'station_l', label: 'สภ./สน. ขนาดใหญ่' },
                    { id: 'station_m', label: 'สภ./สน. ขนาดกลาง' },
                    { id: 'station_s', label: 'สภ. ขนาดเล็ก' },
                    { id: 'support_dept', label: 'ฝ่ายอำนวยการ' },
                    { id: 'custom', label: 'กำหนดเอง' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setAddPreset(p.id as any);
                        if (p.id !== 'custom') {
                          setAddRanks(getStandardPresetRanks(addUnitLevel, p.id as any));
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border text-center transition-all ${
                        addPreset === p.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500 font-bold'
                          : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rank Numbers Inputs */}
              <div className="pt-2">
                <span className="block text-xs font-bold text-slate-300 mb-2">
                  กรอบอัตรากำลังและคนครองแยกตามระดับยศ:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: 'pbg', label: 'ผบช./ผบก.' },
                      { key: 'rpbg', label: 'รอง ผบก.' },
                      { key: 'pgk', label: 'ผกก.' },
                      { key: 'rpgk', label: 'รอง ผกก.' },
                      { key: 'sw', label: 'สว.' },
                      { key: 'rsw', label: 'รอง สว.' },
                      { key: 'rt_dt53', label: 'รอง สว.(ท.)' },
                      { key: 'pbm', label: 'ผบ.หมู่' },
                      { key: 'rpbm', label: 'รอง ผบ.หมู่' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        {label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={addRanks[key].positions}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setAddRanks((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], positions: val },
                            }));
                          }}
                          placeholder="ตำแหน่ง"
                          className="w-1/2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1"
                        />
                        <input
                          type="number"
                          min="0"
                          value={addRanks[key].occupied}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setAddRanks((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], occupied: val },
                            }));
                          }}
                          placeholder="คนครอง"
                          className="w-1/2 text-xs font-mono rounded-lg border border-emerald-400 bg-white dark:bg-slate-900 text-emerald-500 font-bold px-2 py-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveAddModal}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs"
              >
                บันทึกและเพิ่มเข้าสู่ตาราง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Row Modal */}
      {isEditModalOpen && selectedRowForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-xl p-6 overflow-hidden max-h-[90vh] flex flex-col ${
              currentTheme.isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Chakra_Petch',sans-serif]">
                    แก้ไขข้อมูล: {selectedRowForEdit.unitName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ระดับ {selectedRowForEdit.unitLevel} • สังกัด {selectedRowForEdit.bureauName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ชื่อหน่วยงาน</label>
                  <input
                    type="text"
                    value={selectedRowForEdit.unitName}
                    onChange={(e) =>
                      setSelectedRowForEdit({ ...selectedRowForEdit, unitName: e.target.value })
                    }
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ลำดับ</label>
                  <input
                    type="text"
                    value={selectedRowForEdit.no}
                    onChange={(e) =>
                      setSelectedRowForEdit({ ...selectedRowForEdit, no: e.target.value })
                    }
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Rank Numbers Inputs */}
              <div>
                <span className="block text-xs font-bold text-slate-300 mb-2">
                  กรอบอัตรากำลังและคนครอง:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: 'pbg', label: 'ผบช./ผบก.' },
                      { key: 'rpbg', label: 'รอง ผบก.' },
                      { key: 'pgk', label: 'ผกก.' },
                      { key: 'rpgk', label: 'รอง ผกก.' },
                      { key: 'sw', label: 'สว.' },
                      { key: 'rsw', label: 'รอง สว.' },
                      { key: 'rt_dt53', label: 'รอง สว.(ท.)' },
                      { key: 'pbm', label: 'ผบ.หมู่' },
                      { key: 'rpbm', label: 'รอง ผบ.หมู่' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        {label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div>
                          <label className="text-[9px] text-slate-400 block">ตำแหน่ง</label>
                          <input
                            type="number"
                            min="0"
                            value={selectedRowForEdit.ranks[key].positions}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setSelectedRowForEdit({
                                ...selectedRowForEdit,
                                ranks: {
                                  ...selectedRowForEdit.ranks,
                                  [key]: {
                                    ...selectedRowForEdit.ranks[key],
                                    positions: val,
                                  },
                                },
                              });
                            }}
                            className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-emerald-400 block font-bold">คนครอง</label>
                          <input
                            type="number"
                            min="0"
                            value={selectedRowForEdit.ranks[key].occupied}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setSelectedRowForEdit({
                                ...selectedRowForEdit,
                                ranks: {
                                  ...selectedRowForEdit.ranks,
                                  [key]: {
                                    ...selectedRowForEdit.ranks[key],
                                    occupied: val,
                                  },
                                },
                              });
                            }}
                            className="w-full text-xs font-mono rounded-lg border border-emerald-400 bg-white dark:bg-slate-900 text-emerald-500 font-bold px-2 py-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Upload / Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-xl p-6 overflow-hidden ${
              currentTheme.isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Chakra_Petch',sans-serif]">
                    อัปโหลดไฟล์สถานภาพกำลังพลตำรวจ
                  </h3>
                  <p className="text-xs text-slate-400">
                    รองรับไฟล์ Excel (.xlsx, .xls) หรือ CSV
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                  setImportErrorMessage(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingFile
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet className="w-10 h-10 mx-auto text-blue-500 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  ไฟล์แบบฟอร์มสถานภาพกำลังพล ตร. ทั้งประเทศ (.xlsx, .xls, .csv)
                </p>
              </div>

              {isLoadingImport && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center animate-pulse text-xs text-blue-400">
                  กำลังวิเคราะห์และอ่านโครงสร้างหน่วยงานจากไฟล์...
                </div>
              )}

              {importErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importErrorMessage}</span>
                </div>
              )}

              {/* Preview Result */}
              {importResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>วิเคราะห์ไฟล์สำเร็จ: {importResult.fileName} ({importResult.fileSize})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <span className="text-[10px] text-slate-400 block">จำนวนแถว</span>
                      <strong className="text-sm font-mono text-emerald-400">{importResult.totalUnits}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <span className="text-[10px] text-slate-400 block">กรอบอัตรา</span>
                      <strong className="text-sm font-mono text-emerald-400">{importResult.totalPositions.toLocaleString()}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <span className="text-[10px] text-slate-400 block">คนครอง</span>
                      <strong className="text-sm font-mono text-emerald-400">{importResult.totalOccupied.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Mode select */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">ลักษณะการนำเข้า:</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-amber-500"
                        />
                        <span>แทนที่ทั้งหมด</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="text-amber-500"
                        />
                        <span>เพิ่มต่อท้าย</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!importResult}
                onClick={handleApplyImport}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-xs cursor-pointer"
              >
                ยืนยันการนำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Reset Confirmation Modal */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl p-6 ${
              currentTheme.isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-['Chakra_Petch',sans-serif]">
              ยืนยันการรีเซ็ตโครงสร้างสถานภาพกำลังพล ตร.
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              การรีเซ็ตจะคืนค่าตารางสถานภาพกำลังพลทั้งหมดกลับสู่โครงสร้างมาตรฐานสำนักงานตำรวจแห่งชาติ (30+ กองบัญชาการ, ครบทุก บก. และ กก. ตัวอย่าง) ข้อมูลที่เพิ่มหรือแก้ไขด้วยตนเองจะถูกแทนที่
            </p>
            <div className="pt-5 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResetToBaseline}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs"
              >
                ยืนยันรีเซ็ตกลับสู่ค่าเริ่มต้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
