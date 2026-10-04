/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppTheme } from '../data/themes';
import { PoliceOfficer } from '../types/personnel';
import {
  NationalPoliceUnitRow,
  NationalPoliceRanks,
  UnitTierLevel,
} from '../types/nationalPoliceStatus';
import {
  INITIAL_NATIONAL_POLICE_UNITS,
  NATIONAL_POLICE_TITLE,
  calculateNationalGrandTotals,
  enrichNationalUnitRow,
  syncNationalStatusFromRoster,
  createEmptyNationalRanks,
} from '../data/nationalPoliceStatusData';
import {
  exportNationalPoliceExcel,
  exportNationalPoliceCSV,
} from '../utils/nationalPoliceExcelExporter';
import {
  parseNationalPoliceCSVText,
  parseNationalPoliceExcelFile,
  NationalPoliceImportResult,
} from '../utils/nationalPoliceParser';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';
import {
  Building2,
  Users,
  Search,
  Plus,
  Trash2,
  Edit3,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Shield,
  Layers,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Award,
  Filter,
  Network,
  FolderTree,
  Building,
} from 'lucide-react';

interface NationalPoliceStatusTableProps {
  currentTheme: AppTheme;
  officers: PoliceOfficer[];
  onShowToast: (msg: string) => void;
}

const STORAGE_KEY = 'national_police_manpower_status_v3_hierarchy';

export const NationalPoliceStatusTable: React.FC<NationalPoliceStatusTableProps> = ({
  currentTheme,
  officers,
  onShowToast,
}) => {
  // Load persisted units or initialize with 3-tier national baseline
  const [units, setUnits] = useState<NationalPoliceUnitRow[]>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEY);
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
    return INITIAL_NATIONAL_POLICE_UNITS;
  });

  // Save to localStorage on change
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(units));
  }, [units]);

  // Active Tier View: 'tree' | 'bureau' | 'division' | 'subdivision'
  const [activeTierView, setActiveTierView] = useState<'tree' | 'bureau' | 'division' | 'subdivision'>('tree');

  // Expanded Tree Nodes: set of unit IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({
    'bureau-skp': true,
    'div-skp-ot': true,
    'bureau-bchn': true,
    'div-bchn-d1': true,
  });

  const toggleExpandNode = (nodeId: string) => {
    setExpandedNodeIds((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const expandAllNodes = () => {
    const allIds: Record<string, boolean> = {};
    units.forEach((u) => {
      allIds[u.id] = true;
    });
    setExpandedNodeIds(allIds);
  };

  const collapseAllNodes = () => {
    setExpandedNodeIds({});
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [parentBureauFilter, setParentBureauFilter] = useState<string>('all');
  const [parentDivisionFilter, setParentDivisionFilter] = useState<string>('all');
  const [isInlineEditMode, setIsInlineEditMode] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  // Unique Bureaus and Divisions for dropdown filters
  const bureauList = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.level === 'bureau') set.add(u.unitName);
      if (u.parentBureauId) set.add(u.parentBureauId);
      if (u.bureauCode) set.add(u.bureauCode);
    });
    return Array.from(set).filter(Boolean);
  }, [units]);

  const divisionList = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.level === 'division') set.add(u.unitName);
      if (u.parentDivisionId) set.add(u.parentDivisionId);
    });
    return Array.from(set).filter(Boolean);
  }, [units]);

  // Counts by tier
  const tierCounts = useMemo(() => {
    let bureaus = 0;
    let divisions = 0;
    let subdivisions = 0;
    units.forEach((u) => {
      if (u.level === 'bureau') bureaus++;
      else if (u.level === 'division') divisions++;
      else if (u.level === 'subdivision') subdivisions++;
    });
    return { bureaus, divisions, subdivisions };
  }, [units]);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<NationalPoliceUnitRow | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadImportScope, setUploadImportScope] = useState<'replace' | 'append'>('replace');
  const [uploadPreviewResult, setUploadPreviewResult] = useState<NationalPoliceImportResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Form State for Add / Edit Modal
  const [formLevel, setFormLevel] = useState<UnitTierLevel>('bureau');
  const [formUnitName, setFormUnitName] = useState('');
  const [formParentBureau, setFormParentBureau] = useState('');
  const [formParentDivision, setFormParentDivision] = useState('');
  const [formCategory, setFormCategory] = useState<'area_commands' | 'command_support' | 'specialized' | 'education' | 'other'>('area_commands');
  const [formNotes, setFormNotes] = useState('');
  const [formRanks, setFormRanks] = useState<NationalPoliceRanks>(createEmptyNationalRanks());

  // Filtered units based on tier and search
  const displayedUnits = useMemo(() => {
    let result = units;

    // Filter by tier if not in tree mode
    if (activeTierView !== 'tree') {
      result = result.filter((u) => u.level === activeTierView);
    }

    // Filter by Parent Bureau
    if (parentBureauFilter !== 'all') {
      result = result.filter(
        (u) =>
          u.unitName === parentBureauFilter ||
          u.parentBureauId === parentBureauFilter ||
          u.bureauCode === parentBureauFilter
      );
    }

    // Filter by Parent Division
    if (parentDivisionFilter !== 'all') {
      result = result.filter(
        (u) =>
          u.unitName === parentDivisionFilter ||
          u.parentDivisionId === parentDivisionFilter
      );
    }

    // Filter by Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.unitName.toLowerCase().includes(q) ||
          (u.parentBureauId && u.parentBureauId.toLowerCase().includes(q)) ||
          (u.parentDivisionId && u.parentDivisionId.toLowerCase().includes(q)) ||
          (u.notes && u.notes.toLowerCase().includes(q))
      );
    }

    // If in Tree mode and no search filter, structure as hierarchical view with parent-child collapse
    if (activeTierView === 'tree' && !searchTerm.trim() && parentBureauFilter === 'all' && parentDivisionFilter === 'all') {
      const treeRows: (NationalPoliceUnitRow & { depth: number; hasChildren: boolean; isExpanded: boolean })[] = [];

      // Find all top-level bureaus
      const bureaus = units.filter((u) => u.level === 'bureau');
      bureaus.forEach((bureau) => {
        const bureauDivisions = units.filter(
          (u) =>
            u.level === 'division' &&
            (u.parentBureauId === bureau.unitName ||
              u.parentBureauId === bureau.bureauCode ||
              u.bureauCode === bureau.bureauCode)
        );
        const hasChildren = bureauDivisions.length > 0;
        const isExpanded = !!expandedNodeIds[bureau.id];

        treeRows.push({
          ...bureau,
          depth: 0,
          hasChildren,
          isExpanded,
        });

        if (isExpanded) {
          bureauDivisions.forEach((division) => {
            const divisionSubdivisions = units.filter(
              (u) =>
                u.level === 'subdivision' &&
                (u.parentDivisionId === division.unitName ||
                  u.parentDivisionId?.includes(division.unitName) ||
                  division.unitName.includes(u.parentDivisionId || '---'))
            );
            const divHasChildren = divisionSubdivisions.length > 0;
            const divIsExpanded = !!expandedNodeIds[division.id];

            treeRows.push({
              ...division,
              depth: 1,
              hasChildren: divHasChildren,
              isExpanded: divIsExpanded,
            });

            if (divIsExpanded) {
              divisionSubdivisions.forEach((subdivision) => {
                treeRows.push({
                  ...subdivision,
                  depth: 2,
                  hasChildren: false,
                  isExpanded: false,
                });
              });
            }
          });
        }
      });

      // Also append any orphan divisions or subdivisions not caught in the tree
      const includedIds = new Set(treeRows.map((r) => r.id));
      const orphans = units.filter((u) => !includedIds.has(u.id));
      orphans.forEach((orphan) => {
        treeRows.push({
          ...orphan,
          depth: orphan.level === 'subdivision' ? 2 : orphan.level === 'division' ? 1 : 0,
          hasChildren: false,
          isExpanded: false,
        });
      });

      return treeRows;
    }

    return result.map((u) => ({
      ...u,
      depth: u.level === 'subdivision' ? 2 : u.level === 'division' ? 1 : 0,
      hasChildren: false,
      isExpanded: false,
    }));
  }, [units, activeTierView, parentBureauFilter, parentDivisionFilter, searchTerm, expandedNodeIds]);

  // Grand totals across all units
  const grandTotals = useMemo(() => {
    // If in bureau view or tree view, calculate from bureaus to avoid duplicate counts in rollup
    const targetUnits =
      activeTierView === 'division'
        ? units.filter((u) => u.level === 'division')
        : activeTierView === 'subdivision'
        ? units.filter((u) => u.level === 'subdivision')
        : units.filter((u) => u.level === 'bureau');

    return calculateNationalGrandTotals(targetUnits.length > 0 ? targetUnits : units);
  }, [units, activeTierView]);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedUnitIds.length === displayedUnits.length) {
      setSelectedUnitIds([]);
    } else {
      setSelectedUnitIds(displayedUnits.map((u) => u.id));
    }
  };

  const toggleSelectUnit = (id: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Add Modal
  const handleOpenAddModal = (presetLevel?: UnitTierLevel) => {
    setEditingUnit(null);
    setFormLevel(presetLevel || (activeTierView === 'tree' ? 'bureau' : activeTierView));
    setFormUnitName('');
    setFormParentBureau(bureauList[0] || 'สกพ.');
    setFormParentDivision(divisionList[0] || 'กองอัตรากำลัง (อต.)');
    setFormCategory('area_commands');
    setFormNotes('');
    setFormRanks(createEmptyNationalRanks());
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (unit: NationalPoliceUnitRow) => {
    setEditingUnit(unit);
    setFormLevel(unit.level || 'bureau');
    setFormUnitName(unit.unitName);
    setFormParentBureau(unit.parentBureauId || bureauList[0] || '');
    setFormParentDivision(unit.parentDivisionId || divisionList[0] || '');
    setFormCategory(unit.category || 'area_commands');
    setFormNotes(unit.notes || '');
    setFormRanks(JSON.parse(JSON.stringify(unit.ranks)));
    setIsAddEditModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUnitName.trim()) {
      alert('กรุณากรอกชื่อหน่วยงาน');
      return;
    }

    if (editingUnit) {
      // Update existing
      const updated = enrichNationalUnitRow(
        editingUnit.id,
        editingUnit.no,
        formUnitName.trim(),
        formRanks,
        formLevel,
        formLevel !== 'bureau' ? formParentBureau : undefined,
        formLevel === 'subdivision' ? formParentDivision : undefined,
        formParentBureau || undefined,
        formCategory,
        formNotes.trim() || undefined
      );

      setUnits((prev) => prev.map((u) => (u.id === editingUnit.id ? updated : u)));
      onShowToast(`บันทึกการแก้ไขหน่วยงาน "${formUnitName}" สำเร็จ`);
    } else {
      // Add new
      const newUnit = enrichNationalUnitRow(
        `unit-${formLevel}-${Date.now()}`,
        units.length + 1,
        formUnitName.trim(),
        formRanks,
        formLevel,
        formLevel !== 'bureau' ? formParentBureau : undefined,
        formLevel === 'subdivision' ? formParentDivision : undefined,
        formParentBureau || undefined,
        formCategory,
        formNotes.trim() || undefined
      );

      setUnits((prev) => [...prev, newUnit]);
      onShowToast(`เพิ่มหน่วยงาน "${formUnitName}" (${formLevel.toUpperCase()}) เรียบร้อยแล้ว`);
    }

    setIsAddEditModalOpen(false);
  };

  // Delete single unit
  const handleDeleteUnit = (id: string, name: string) => {
    if (window.confirm(`ยืนยันการลบหน่วยงาน "${name}" ออกจากตารางหรือไม่?`)) {
      setUnits((prev) => {
        const filtered = prev.filter((u) => u.id !== id);
        return filtered.map((u, idx) => ({ ...u, no: idx + 1 }));
      });
      setSelectedUnitIds((prev) => prev.filter((i) => i !== id));
      onShowToast(`ลบข้อมูลหน่วยงาน "${name}" เรียบร้อยแล้ว`);
    }
  };

  // Delete selected units
  const handleDeleteSelected = () => {
    if (selectedUnitIds.length === 0) return;
    if (window.confirm(`ยืนยันการลบหน่วยงานที่เลือกจำนวน ${selectedUnitIds.length} รายการ หรือไม่?`)) {
      setUnits((prev) => {
        const filtered = prev.filter((u) => !selectedUnitIds.includes(u.id));
        return filtered.map((u, idx) => ({ ...u, no: idx + 1 }));
      });
      setSelectedUnitIds([]);
      onShowToast(`ลบหน่วยงานที่เลือกเรียบร้อยแล้ว`);
    }
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('⚠️ ยืนยันการล้างข้อมูลทั้งหมดในตารางสถานภาพตำรวจทั้งประเทศหรือไม่?')) {
      setUnits([]);
      setSelectedUnitIds([]);
      onShowToast('ล้างข้อมูลทั้งหมดในตารางเรียบร้อยแล้ว');
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('ยืนยันการคืนค่าข้อมูลเริ่มต้นของโครงสร้างตำรวจทั้งประเทศ (บช. บก. กก.) หรือไม่?')) {
      setUnits(INITIAL_NATIONAL_POLICE_UNITS);
      setSelectedUnitIds([]);
      onShowToast('คืนค่าข้อมูลเริ่มต้นทั่วประเทศ (บช. บก. กก.) เรียบร้อยแล้ว');
    }
  };

  // Inline cell edit handler
  const handleInlineRankChange = (
    unitId: string,
    rankKey: keyof NationalPoliceRanks,
    field: 'positions' | 'occupied',
    valStr: string
  ) => {
    const val = Math.max(0, parseInt(valStr, 10) || 0);
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const newRanks: NationalPoliceRanks = {
          ...u.ranks,
          [rankKey]: {
            ...u.ranks[rankKey],
            [field]: val,
          },
        };
        return enrichNationalUnitRow(
          u.id,
          u.no,
          u.unitName,
          newRanks,
          u.level,
          u.parentBureauId,
          u.parentDivisionId,
          u.bureauCode,
          u.category,
          u.notes
        );
      })
    );
  };

  // Sync from Personnel Roster (ทำเนียบกำลังพล)
  const handleExecuteSyncFromRoster = () => {
    const res = syncNationalStatusFromRoster(officers, units);
    setUnits(res.updatedUnits);
    setIsSyncModalOpen(false);
    onShowToast(
      `✅ ซิงค์ข้อมูลเข้าสู่โครงสร้าง บช. บก. กก. สำเร็จ! (บช.: ${res.summary.bureausCount}, บก.: ${res.summary.divisionsCount}, กก.: ${res.summary.subdivisionsCount}, ประมวลผล ${res.summary.totalOfficersProcessed} อัตรา)`
    );
  };

  // File upload handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    try {
      let result: NationalPoliceImportResult;
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        result = parseNationalPoliceCSVText(text);
      } else {
        result = await parseNationalPoliceExcelFile(file);
      }

      if (result.units.length === 0) {
        throw new Error('ไม่พบข้อมูลหน่วยงานในไฟล์ กรุณาตรวจสอบรูปแบบตาราง');
      }

      setUploadPreviewResult(result);
    } catch (err: any) {
      setUploadError(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirm Upload Import
  const handleConfirmUploadImport = () => {
    if (!uploadPreviewResult || uploadPreviewResult.units.length === 0) return;

    if (uploadImportScope === 'replace') {
      setUnits(uploadPreviewResult.units);
      onShowToast(`นำเข้าและแทนที่ข้อมูลเรียบร้อยแล้ว (${uploadPreviewResult.units.length} หน่วยงาน)`);
    } else {
      setUnits((prev) => {
        const combined = [...prev, ...uploadPreviewResult.units];
        return combined.map((u, idx) => ({ ...u, no: idx + 1 }));
      });
      onShowToast(`เพิ่มข้อมูลต่อท้ายเรียบร้อยแล้ว (${uploadPreviewResult.units.length} หน่วยงาน)`);
    }

    setIsUploadModalOpen(false);
    setUploadPreviewResult(null);
  };

  // Computed live stats for the Add/Edit form preview
  const formComputedStats = useMemo(() => {
    const commPos =
      formRanks.pbg.positions +
      formRanks.rpbg.positions +
      formRanks.pgk.positions +
      formRanks.rpgk.positions +
      formRanks.sw.positions +
      formRanks.rsw.positions;
    const commOcc =
      formRanks.pbg.occupied +
      formRanks.rpbg.occupied +
      formRanks.pgk.occupied +
      formRanks.rpgk.occupied +
      formRanks.sw.occupied +
      formRanks.rsw.occupied;

    const nonCommPos = formRanks.rsw_star.positions + formRanks.pbm.positions;
    const nonCommOcc = formRanks.rsw_star.occupied + formRanks.pbm.occupied;

    const grandPos = commPos + nonCommPos + formRanks.rpbm.positions;
    const grandOcc = commOcc + nonCommOcc + formRanks.rpbm.occupied;

    return {
      commPos,
      commOcc,
      nonCommPos,
      nonCommOcc,
      grandPos,
      grandOcc,
      vacant: Math.max(0, grandPos - grandOcc),
      pct: grandPos > 0 ? Math.round((grandOcc / grandPos) * 1000) / 10 : 0,
    };
  }, [formRanks]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-['Chakra_Petch',sans-serif] tracking-tight text-slate-900 dark:text-white">
                สถานภาพข้าราชการตำรวจทั้งประเทศ
              </h1>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300">
                  บช. ({tierCounts.bureaus})
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300">
                  บก. ({tierCounts.divisions})
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300">
                  กก. ({tierCounts.subdivisions})
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ตารางสถานภาพอัตรากำลังพลตำรวจทั้งประเทศ ครบทั้ง 3 ระดับโครงสร้าง (ระดับ บช. / ระดับ บก. / ระดับ กก.) พร้อมระบบค้นหา แก้ไข เพิ่มเติม ลบ ดาวน์โหลด และอัปโหลด
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Sync from Roster Button */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            title="ดึงข้อมูลจากทำเนียบกำลังพลทั้งหมดเข้าสู่ตารางอัตโนมัติ (บช. บก. กก.)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ซิงค์จากทำเนียบกำลังพล ({officers.length})</span>
          </button>

          {/* Add Row Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 shadow-sm shadow-amber-400/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มเติม</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => {
              setUploadPreviewResult(null);
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>อัปโหลด</span>
          </button>

          {/* Download Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>ดาวน์โหลด</span>
            </button>
            <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-30 hidden group-hover:block animate-fadeIn">
              <button
                onClick={() => exportNationalPoliceExcel(units)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ดาวน์โหลด Excel (.xlsx) ทุกระดับ</span>
              </button>
              <button
                onClick={() => exportNationalPoliceExcel(displayedUnits, `สถานภาพกำลังพล_${activeTierView}.xlsx`)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ดาวน์โหลดเฉพาะมุมมองปัจจุบัน (.xlsx)</span>
              </button>
              <button
                onClick={() => exportNationalPoliceCSV(displayedUnits)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>ดาวน์โหลด CSV (.csv)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Tier Level Selector Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTierView('tree')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${
              activeTierView === 'tree'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>โครงสร้างลำดับชั้น (บช. ➔ บก. ➔ กก.)</span>
          </button>

          <button
            onClick={() => setActiveTierView('bureau')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
              activeTierView === 'bureau'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>ระดับ บช. ({tierCounts.bureaus})</span>
          </button>

          <button
            onClick={() => setActiveTierView('division')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
              activeTierView === 'division'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>ระดับ บก. ({tierCounts.divisions})</span>
          </button>

          <button
            onClick={() => setActiveTierView('subdivision')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
              activeTierView === 'subdivision'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>ระดับ กก. / ฝ่าย / สภ. ({tierCounts.subdivisions})</span>
          </button>
        </div>

        {activeTierView === 'tree' && (
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <button
              onClick={expandAllNodes}
              className="px-2.5 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              ขยายทั้งหมด [+]
            </button>
            <button
              onClick={collapseAllNodes}
              className="px-2.5 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              ย่อทั้งหมด [-]
            </button>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>รวมตำแหน่ง</span>
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {grandTotals.grandTotal.positions.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">กรอบอัตราอนุมัติ</div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>คนครองจริง</span>
            <Users className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {grandTotals.grandTotal.occupied.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            ครองแล้ว {grandTotals.occupancyPercent}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>ตำแหน่งว่าง</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {grandTotals.vacant.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">อัตราว่างรอการบรรจุ</div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>รวมสัญญาบัตร</span>
            <Award className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {grandTotals.totalCommissioned.occupied.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            จาก {grandTotals.totalCommissioned.positions.toLocaleString()} อัตรา
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>รวมประทวน</span>
            <Shield className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
            {grandTotals.totalNonCommissioned.occupied.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            จาก {grandTotals.totalNonCommissioned.positions.toLocaleString()} อัตรา
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>รอง ผบ.หมู่</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {grandTotals.ranks.rpbm.occupied.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            จาก {grandTotals.ranks.rpbm.positions.toLocaleString()} อัตรา
          </div>
        </div>
      </div>

      {/* Control & Search Bar with Parent Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหน่วยงาน บช. บก. กก. หรือ สน./สภ...."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Parent Bureau */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 whitespace-nowrap hidden sm:inline">สังกัด บช.:</span>
            <select
              value={parentBureauFilter}
              onChange={(e) => setParentBureauFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="all">ทุก บช.</option>
              {bureauList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Parent Division if selected */}
          {parentBureauFilter !== 'all' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">สังกัด บก.:</span>
              <select
                value={parentDivisionFilter}
                onChange={(e) => setParentDivisionFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="all">ทุก บก.</option>
                {divisionList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Inline Edit Toggle */}
          <button
            onClick={() => setIsInlineEditMode(!isInlineEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isInlineEditMode
                ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="สลับโหมดพิมพ์แก้ไขตัวเลขในตารางได้โดยตรง"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            <span>{isInlineEditMode ? 'บันทึกแก้ไขด่วน' : 'แก้ไขด่วนในตาราง'}</span>
          </button>

          {/* Delete Selected Button */}
          {selectedUnitIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบที่เลือก ({selectedUnitIds.length})</span>
            </button>
          )}

          {/* Reset Baseline Button */}
          <button
            onClick={handleResetToDefault}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="คืนค่าข้อมูลเริ่มต้นของตำรวจทั้งประเทศ (บช. บก. กก.)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Clear Table Button */}
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            title="ล้างข้อมูลทั้งหมดในตาราง (0 อัตรา)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The Master 3-Tier National Police Manpower Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[750px] relative scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse border-slate-200 dark:border-slate-800">
            {/* 2-Tier Sticky Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold select-none shadow-xs">
              {/* Header Row 1 */}
              <tr className="border-b border-slate-300 dark:border-slate-700 text-center">
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-800 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={displayedUnits.length > 0 && selectedUnitIds.length === displayedUnits.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-400 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                </th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-800 w-12 text-center">
                  ลำดับ
                </th>
                <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-800 text-left min-w-[260px] sm:min-w-[320px]">
                  หน่วยงาน (บช. / บก. / กก.)
                </th>

                {/* ผบก. */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  ผบก.
                </th>

                {/* รอง ผบก. */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  รอง ผบก.
                </th>

                {/* ผกก. */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  ผกก.
                </th>

                {/* รอง ผกก. */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  รอง ผกก.
                </th>

                {/* สว. */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  สว.
                </th>

                {/* รอง สว. */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  รอง สว.
                </th>

                {/* รวมชั้นสัญญาบัตร */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold">
                  รวมชั้นสัญญาบัตร
                </th>

                {/* รอง สว.* */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                  รอง สว.*
                </th>

                {/* ผบ.หมู่ */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                  ผบ.หมู่
                </th>

                {/* รวมชั้นประทวน */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-teal-100/70 dark:bg-teal-950/50 text-teal-950 dark:text-teal-200 font-bold">
                  รวมชั้นประทวน
                </th>

                {/* รอง ผบ.หมู่ */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                  รอง ผบ.หมู่
                </th>

                {/* รวมทั้งหมด */}
                <th colSpan={2} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 bg-amber-200/80 dark:bg-amber-900/60 text-slate-950 dark:text-amber-100 font-bold">
                  รวมทั้งหมด
                </th>

                {/* จัดการ (Actions) */}
                <th rowSpan={2} className="px-2 py-2 text-center w-24">
                  จัดการ
                </th>
              </tr>

              {/* Header Row 2: ตำแหน่ง / คนครอง */}
              <tr className="border-b border-slate-300 dark:border-slate-700 text-[11px] text-center">
                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                {/* รวมสัญญาบัตร */}
                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-indigo-100/50 dark:bg-indigo-950/30 font-bold">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-indigo-100/50 dark:bg-indigo-950/30 text-emerald-700 dark:text-emerald-400 font-bold">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                {/* รวมประทวน */}
                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-teal-100/50 dark:bg-teal-950/30 font-bold">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-teal-100/50 dark:bg-teal-950/30 text-emerald-700 dark:text-emerald-400 font-bold">คนครอง</th>

                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 text-emerald-700 dark:text-emerald-400">คนครอง</th>

                {/* รวมทั้งหมด */}
                <th className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 bg-amber-200/50 dark:bg-amber-900/40 font-bold">ตำแหน่ง</th>
                <th className="px-1.5 py-1 border-r border-slate-300 dark:border-slate-800 bg-amber-200/50 dark:bg-amber-900/40 text-emerald-700 dark:text-emerald-400 font-bold">คนครอง</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {displayedUnits.length === 0 ? (
                <tr>
                  <td colSpan={27} className="text-center py-12 text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">ไม่พบข้อมูลหน่วยงานในมุมมองนี้</p>
                    <p className="text-xs mt-1">กดปุ่ม "เพิ่มเติม" เพื่อเพิ่ม หรือ "ซิงค์จากทำเนียบกำลังพล" เพื่อนำข้อมูลเข้าสู่ตาราง</p>
                  </td>
                </tr>
              ) : (
                displayedUnits.map((unit: any, index) => {
                  const isSelected = selectedUnitIds.includes(unit.id);
                  const isBureau = unit.level === 'bureau';
                  const isDivision = unit.level === 'division';
                  const isSubdivision = unit.level === 'subdivision';

                  // Row background style based on level
                  const rowBg = isBureau
                    ? 'bg-purple-50/30 dark:bg-purple-950/20 font-semibold'
                    : isDivision
                    ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                    : '';

                  return (
                    <tr
                      key={unit.id}
                      className={`hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors ${rowBg} ${
                        isSelected ? 'bg-amber-100/50 dark:bg-amber-950/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUnit(unit.id)}
                          className="rounded border-slate-400 text-amber-500 focus:ring-amber-400 cursor-pointer"
                        />
                      </td>

                      {/* ลำดับ */}
                      <td className="px-2 py-2 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                        {unit.no}
                      </td>

                      {/* หน่วยงาน with Tier Badge and Indentation */}
                      <td className="px-3 py-2 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${(unit.depth || 0) * 18}px` }}
                        >
                          {/* Tree Expand/Collapse Button */}
                          {unit.hasChildren ? (
                            <button
                              onClick={() => toggleExpandNode(unit.id)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                              title={unit.isExpanded ? 'ย่อซ่อนหน่วยงานย่อย' : 'ขยายดูหน่วยงานย่อย'}
                            >
                              {unit.isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="w-5 inline-block" />
                          )}

                          {/* Tier Badge */}
                          {isBureau && (
                            <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 shrink-0">
                              บช.
                            </span>
                          )}
                          {isDivision && (
                            <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 shrink-0">
                              บก.
                            </span>
                          )}
                          {isSubdivision && (
                            <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 shrink-0">
                              กก.
                            </span>
                          )}

                          {/* Unit Name */}
                          <span
                            className={`${
                              isBureau
                                ? 'font-bold text-slate-900 dark:text-white text-xs'
                                : isDivision
                                ? 'font-semibold text-slate-800 dark:text-slate-100 text-xs'
                                : 'text-slate-700 dark:text-slate-300 text-[11px]'
                            }`}
                          >
                            {unit.unitName}
                          </span>

                          {unit.notes && (
                            <span className="text-[9px] px-1 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              {unit.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rank Columns: If inline edit mode is active, render number inputs, else text */}
                      {/* ผบก. */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.pbg?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'pbg', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.pbg?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'pbg', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.pbg?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.pbg?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* รอง ผบก. */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rpbg?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rpbg', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rpbg?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rpbg', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.rpbg?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.rpbg?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* ผกก. */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.pgk?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'pgk', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.pgk?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'pgk', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.pgk?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.pgk?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* รอง ผกก. */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rpgk?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rpgk', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rpgk?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rpgk', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.rpgk?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.rpgk?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* สว. */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.sw?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'sw', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.sw?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'sw', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.sw?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.sw?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* รอง สว. */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rsw?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rsw', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rsw?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rsw', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.rsw?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.rsw?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* รวมชั้นสัญญาบัตร (Computed) */}
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 border-r border-slate-200 dark:border-slate-800">
                        {unit.totalCommissioned.positions}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-indigo-50/40 dark:bg-indigo-950/20 text-emerald-600 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-800">
                        {unit.totalCommissioned.occupied}
                      </td>

                      {/* รอง สว.* */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rsw_star?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rsw_star', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rsw_star?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rsw_star', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.rsw_star?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.rsw_star?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* ผบ.หมู่ */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.pbm?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'pbm', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.pbm?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'pbm', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.pbm?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.pbm?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* รวมชั้นประทวน (Computed) */}
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-teal-50/40 dark:bg-teal-950/20 text-teal-950 dark:text-teal-200 border-r border-slate-200 dark:border-slate-800">
                        {unit.totalNonCommissioned.positions}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-teal-50/40 dark:bg-teal-950/20 text-emerald-600 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-800">
                        {unit.totalNonCommissioned.occupied}
                      </td>

                      {/* รอง ผบ.หมู่ */}
                      {isInlineEditMode ? (
                        <>
                          <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rpbm?.positions || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rpbm', 'positions', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs focus:bg-amber-100"
                            />
                          </td>
                          <td className="p-0 border-r border-slate-300 dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={unit.ranks.rpbm?.occupied || 0}
                              onChange={(e) => handleInlineRankChange(unit.id, 'rpbm', 'occupied', e.target.value)}
                              className="w-12 text-center py-1 bg-transparent font-mono text-xs text-emerald-600 focus:bg-amber-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                            {unit.ranks.rpbm?.positions || 0}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-slate-300 dark:border-slate-800">
                            {unit.ranks.rpbm?.occupied || 0}
                          </td>
                        </>
                      )}

                      {/* รวมทั้งหมด (Grand Total for unit) */}
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-amber-100/50 dark:bg-amber-950/40 text-slate-950 dark:text-amber-200 border-r border-slate-200 dark:border-slate-800">
                        {unit.grandTotal.positions}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-amber-100/50 dark:bg-amber-950/40 text-emerald-600 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-800">
                        {unit.grandTotal.occupied}
                      </td>

                      {/* จัดการ (Actions) */}
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(unit)}
                            className="p-1 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลหน่วยงานและตัวเลขกำลังพล"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(unit.id, unit.unitName)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="ลบแถวนี้ออกจากตาราง"
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

            {/* Sticky Bottom Grand Total Summary Row */}
            <tfoot className="sticky bottom-0 z-10 bg-slate-900 text-slate-100 font-bold border-t-2 border-amber-400 shadow-xl">
              <tr className="text-center text-xs">
                <td colSpan={3} className="px-3 py-2.5 text-left border-r border-slate-700 bg-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="font-['Chakra_Petch',sans-serif] text-amber-300 tracking-wide">
                      ยอดรวมทั้งสิ้น ({activeTierView === 'tree' ? 'ระดับ บช. รวม' : `ระดับ ${activeTierView.toUpperCase()}`})
                    </span>
                    <span className="text-[11px] font-normal text-slate-400 font-mono">
                      {displayedUnits.length} รายการ
                    </span>
                  </div>
                </td>

                {/* ผบก. */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-blue-200">
                  {grandTotals.ranks.pbg.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.pbg.occupied.toLocaleString()}
                </td>

                {/* รอง ผบก. */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-blue-200">
                  {grandTotals.ranks.rpbg.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.rpbg.occupied.toLocaleString()}
                </td>

                {/* ผกก. */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-blue-200">
                  {grandTotals.ranks.pgk.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.pgk.occupied.toLocaleString()}
                </td>

                {/* รอง ผกก. */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-blue-200">
                  {grandTotals.ranks.rpgk.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.rpgk.occupied.toLocaleString()}
                </td>

                {/* สว. */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-blue-200">
                  {grandTotals.ranks.sw.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.sw.occupied.toLocaleString()}
                </td>

                {/* รอง สว. */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-blue-200">
                  {grandTotals.ranks.rsw.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.rsw.occupied.toLocaleString()}
                </td>

                {/* รวมชั้นสัญญาบัตร */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 bg-indigo-950 text-indigo-200">
                  {grandTotals.totalCommissioned.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 bg-indigo-950 text-emerald-400">
                  {grandTotals.totalCommissioned.occupied.toLocaleString()}
                </td>

                {/* รอง สว.* */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-emerald-200">
                  {grandTotals.ranks.rsw_star.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.rsw_star.occupied.toLocaleString()}
                </td>

                {/* ผบ.หมู่ */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-emerald-200">
                  {grandTotals.ranks.pbm.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.pbm.occupied.toLocaleString()}
                </td>

                {/* รวมชั้นประทวน */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 bg-teal-950 text-teal-200">
                  {grandTotals.totalNonCommissioned.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 bg-teal-950 text-emerald-400">
                  {grandTotals.totalNonCommissioned.occupied.toLocaleString()}
                </td>

                {/* รอง ผบ.หมู่ */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 text-amber-200">
                  {grandTotals.ranks.rpbm.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 text-emerald-400">
                  {grandTotals.ranks.rpbm.occupied.toLocaleString()}
                </td>

                {/* รวมทั้งหมด */}
                <td className="px-2 py-2 font-mono border-r border-slate-800 bg-amber-950 text-amber-300">
                  {grandTotals.grandTotal.positions.toLocaleString()}
                </td>
                <td className="px-2 py-2 font-mono border-r border-slate-700 bg-amber-950 text-emerald-300 font-extrabold">
                  {grandTotals.grandTotal.occupied.toLocaleString()}
                </td>

                {/* Actions column spacer */}
                <td className="px-2 py-2 bg-slate-950 text-center text-slate-500 font-normal">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. Modal: เพิ่มเติม / แก้ไข ข้อมูลหน่วยงาน (บช. บก. กก.) */}
      {/* ========================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingUnit ? `แก้ไขข้อมูล: ${editingUnit.unitName}` : 'เพิ่มเติมหน่วยงานใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddEdit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Level Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ระดับโครงสร้างหน่วยงาน <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormLevel('bureau')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      formLevel === 'bureau'
                        ? 'bg-purple-100 text-purple-900 border-purple-500 dark:bg-purple-950 dark:text-purple-200'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ระดับ บช. (กองบัญชาการ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLevel('division')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      formLevel === 'division'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ระดับ บก. (กองบังคับการ/ภ.จว.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLevel('subdivision')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      formLevel === 'subdivision'
                        ? 'bg-amber-100 text-amber-900 border-amber-500 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ระดับ กก. (กองกำกับการ/ฝ่าย/สภ.)
                  </button>
                </div>
              </div>

              {/* Unit Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อหน่วยงาน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnitName}
                    onChange={(e) => setFormUnitName(e.target.value)}
                    placeholder="เช่น กองอัตรากำลัง (อต.), สน.ดุสิต, สภ.เมืองนนทบุรี..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Parent Bureau if Division or SubDivision */}
                {formLevel !== 'bureau' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      สังกัด บช. (กองบัญชาการ) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formParentBureau}
                      onChange={(e) => setFormParentBureau(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {bureauList.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Parent Division if SubDivision */}
                {formLevel === 'subdivision' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      สังกัด บก. (กองบังคับการ / กอง) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formParentDivision}
                      onChange={(e) => setFormParentDivision(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {divisionList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    กลุ่มภารกิจ
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="area_commands">บช.น. / ภ.1-9 (พื้นที่)</option>
                    <option value="specialized">กองบัญชาการเฉพาะทาง (บช.ก., สตม. ฯลฯ)</option>
                    <option value="command_support">อำนวยการและสนับสนุน (สกพ., สงป. ฯลฯ)</option>
                    <option value="education">การศึกษา (บช.ศ., รร.นรต.)</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Rank Statistics Input Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>กรอกยอดตำแหน่งและคนครองในแต่ละระดับตำแหน่ง</span>
                </h4>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2 text-left">ระดับตำแหน่ง</th>
                        <th className="px-3 py-2 text-center w-32">จำนวนตำแหน่ง</th>
                        <th className="px-3 py-2 text-center w-32 text-emerald-600 dark:text-emerald-400">คนครองจริง</th>
                        <th className="px-3 py-2 text-center w-24 text-amber-600 dark:text-amber-400">ว่าง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {[
                        { key: 'pbg', label: 'ผบก.' },
                        { key: 'rpbg', label: 'รอง ผบก.' },
                        { key: 'pgk', label: 'ผกก.' },
                        { key: 'rpgk', label: 'รอง ผกก.' },
                        { key: 'sw', label: 'สว.' },
                        { key: 'rsw', label: 'รอง สว.' },
                        { key: 'rsw_star', label: 'รอง สว.* (ด.ต.53 ปี)' },
                        { key: 'pbm', label: 'ผบ.หมู่' },
                        { key: 'rpbm', label: 'รอง ผบ.หมู่' },
                      ].map(({ key, label }) => {
                        const rankKey = key as keyof NationalPoliceRanks;
                        const pos = formRanks[rankKey]?.positions || 0;
                        const occ = formRanks[rankKey]?.occupied || 0;
                        const vac = Math.max(0, pos - occ);

                        return (
                          <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                              {label}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <input
                                type="number"
                                min="0"
                                value={pos}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setFormRanks((prev) => ({
                                    ...prev,
                                    [rankKey]: { ...prev[rankKey], positions: val },
                                  }));
                                }}
                                className="w-24 px-2 py-1 text-center font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <input
                                type="number"
                                min="0"
                                value={occ}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setFormRanks((prev) => ({
                                    ...prev,
                                    [rankKey]: { ...prev[rankKey], occupied: val },
                                  }));
                                }}
                                className="w-24 px-2 py-1 text-center font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-semibold"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono text-slate-500">
                              {vac}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real-time Computed Summary Cards */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500">รวมชั้นสัญญาบัตร</div>
                  <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {formComputedStats.commOcc} / {formComputedStats.commPos}
                  </div>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500">รวมชั้นประทวน</div>
                  <div className="text-sm font-bold font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                    {formComputedStats.nonCommOcc} / {formComputedStats.nonCommPos}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500">รวมทั้งหมด (% ครอง)</div>
                  <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {formComputedStats.grandOcc} / {formComputedStats.grandPos} ({formComputedStats.pct}%)
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm cursor-pointer"
                >
                  {editingUnit ? 'บันทึกการแก้ไข' : 'เพิ่มหน่วยงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. Modal: อัปโหลดไฟล์ Excel / CSV */}
      {/* ========================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  อัปโหลดไฟล์ข้อมูลสถานภาพกำลังพล บช. บก. กก. (Excel / CSV)
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-all hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  รองรับไฟล์ Excel (.xlsx, .xls) หรือ CSV (.csv) ตามแบบฟอร์มสถานภาพกำลังพล
                </p>
              </div>

              {uploadLoading && (
                <div className="text-center py-4 text-xs text-amber-600 font-semibold animate-pulse">
                  กำลังประมวลผลไฟล์...
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadPreviewResult && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      อ่านข้อมูลสำเร็จพบ {uploadPreviewResult.units.length} หน่วยงาน
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importScope"
                        value="replace"
                        checked={uploadImportScope === 'replace'}
                        onChange={() => setUploadImportScope('replace')}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>แทนที่ข้อมูลเดิมทั้งหมด (Replace All)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importScope"
                        value="append"
                        checked={uploadImportScope === 'append'}
                        onChange={() => setUploadImportScope('append')}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>เพิ่มต่อท้ายข้อมูลเดิม (Append)</span>
                    </label>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-2 py-1 text-left">ลำดับ</th>
                          <th className="px-2 py-1 text-left">หน่วยงาน</th>
                          <th className="px-2 py-1 text-center">ระดับ</th>
                          <th className="px-2 py-1 text-center">รวมตำแหน่ง</th>
                          <th className="px-2 py-1 text-center">รวมคนครอง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {uploadPreviewResult.units.slice(0, 10).map((u, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-1 font-medium">{u.unitName}</td>
                            <td className="px-2 py-1 text-center uppercase font-bold text-amber-600">{u.level}</td>
                            <td className="px-2 py-1 text-center font-mono">{u.grandTotal.positions}</td>
                            <td className="px-2 py-1 text-center font-mono text-emerald-600">{u.grandTotal.occupied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!uploadPreviewResult || uploadPreviewResult.units.length === 0}
                  onClick={handleConfirmUploadImport}
                  className="px-5 py-2 text-xs font-bold rounded-xl text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  ยืนยันนำเข้าข้อมูลลงสู่ตาราง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. Modal: ซิงค์ข้อมูลอัตโนมัติจากทำเนียบกำลังพล บช. บก. กก. */}
      {/* ========================================================= */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin-beam" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  นำข้อมูลจากทำเนียบกำลังพลเข้าสู่ตาราง (บช. บก. กก.)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ระบบจะสแกนและประมวลผลข้อมูลกำลังพลทั้งหมดในฐานข้อมูล
                </p>
              </div>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between font-semibold">
                <span>จำนวนอัตรากำลังพลในทำเนียบ:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{officers.length} อัตรา</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                ระบบจะวิเคราะห์ความสัมพันธ์ทั้ง 3 ลำดับชั้น:
              </p>
              <ul className="list-disc pl-4 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                <li><strong className="text-purple-600">ระดับ บช.</strong> (เช่น สกพ., บช.น., ภ.1 - ภ.9)</li>
                <li><strong className="text-emerald-600">ระดับ บก.</strong> (เช่น กองอัตรากำลัง, กองทะเบียนพล, บก.น.1, ภ.จว.)</li>
                <li><strong className="text-amber-600">ระดับ กก.</strong> (เช่น ฝ่ายแต่งตั้ง, ฝ่ายอัตรากำลัง, สน., สภ.)</li>
              </ul>
              <p className="text-[11px] text-slate-500">
                พร้อมนับจำนวนตำแหน่งและคนครองจริงในแต่ละระดับตำแหน่ง (ผบก. ถึง ผบ.หมู่) อัปเดตลงในตารางให้ทันที
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteSyncFromRoster}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-500/30 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ยืนยันซิงค์ข้อมูลเข้าสู่ตาราง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
