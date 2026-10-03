/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppTheme } from '../data/themes';
import {
  SouthernPoliceSection,
  UnitManpowerRow,
  UnitManpowerRanks,
  RankStat,
} from '../types/southernPolice';
import {
  INITIAL_SOUTHERN_POLICE_SECTIONS,
  SOUTHERN_POLICE_TITLE,
  calculateTotalsForUnits,
  enrichUnitRow,
} from '../data/southernBorderPoliceData';
import {
  exportSouthernPoliceWorkbook,
  exportSingleSectionToExcel,
  exportSectionToCSV,
} from '../utils/southernPoliceExcelExporter';
import {
  parseSouthernPoliceCSV,
  parseSouthernPoliceExcelFile,
  syncFromOrgChartStructure,
  ExcelImportResult,
} from '../utils/southernPoliceParser';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';
import { PoliceOfficer } from '../types/personnel';
import {
  FileSpreadsheet,
  Download,
  Search,
  RotateCcw,
  Edit3,
  Check,
  Building,
  Shield,
  Layers,
  ChevronRight,
  TrendingUp,
  Users,
  Award,
  Upload,
  FileText,
  Printer,
  X,
  ExternalLink,
  Info,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  FileCheck2,
  FileUp,
  AlertCircle,
  Network,
  RefreshCw,
} from 'lucide-react';

interface SouthernBorderPoliceTableProps {
  currentTheme: AppTheme;
  onShowToast?: (msg: string) => void;
  officers?: PoliceOfficer[];
}

export const SouthernBorderPoliceTable: React.FC<SouthernBorderPoliceTableProps> = ({
  currentTheme,
  onShowToast = () => {},
  officers = [],
}) => {
  // Load persisted sections or fallback to initial
  const [sections, setSections] = useState<SouthernPoliceSection[]>(() => {
    const saved = safeLocalStorageGet('southern_border_police_data_v2');
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
    return INITIAL_SOUTHERN_POLICE_SECTIONS;
  });

  // Save to storage
  useEffect(() => {
    safeLocalStorageSet('southern_border_police_data_v2', JSON.stringify(sections));
  }, [sections]);

  // Active sheet tab ('all_overview' | 'all_continuous' | section.key)
  const [activeTab, setActiveTab] = useState<string>('all_overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals state
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'org_chart' | 'excel' | 'csv'>('org_chart');
  const [pastedCSVText, setPastedCSVText] = useState('');

  // Org Chart Structure Sync State
  const [orgChartSyncScope, setOrgChartSyncScope] = useState<'all' | 'active'>('all');
  const [orgChartPreviewSectionKey, setOrgChartPreviewSectionKey] = useState<string>('yala');

  // Excel File Upload State
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [excelPreview, setExcelPreview] = useState<ExcelImportResult | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileErrorMessage, setFileErrorMessage] = useState<string | null>(null);
  const [excelImportScope, setExcelImportScope] = useState<'all' | 'active' | 'append'>('all');
  const [excelPreviewSectionKey, setExcelPreviewSectionKey] = useState<string>('yala');
  const [isClearConfirmModalOpen, setIsClearConfirmModalOpen] = useState(false);
  const [clearTargetScope, setClearTargetScope] = useState<'all' | 'active'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add row form state
  const [addSectionKey, setAddSectionKey] = useState<string>('yala');
  const [addUnitNo, setAddUnitNo] = useState<string>('');
  const [addUnitName, setAddUnitName] = useState<string>('');
  const [addUnitPreset, setAddUnitPreset] = useState<'station_m' | 'station_l' | 'station_s' | 'division' | 'custom'>('station_m');
  const [customRanks, setCustomRanks] = useState<UnitManpowerRanks>({
    pbg: { positions: 0, occupied: 0 },
    rpbg: { positions: 0, occupied: 0 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 2, occupied: 2 },
    sw: { positions: 5, occupied: 4 },
    rsw: { positions: 14, occupied: 12 },
    rt_dt53: { positions: 6, occupied: 5 },
    pbm: { positions: 55, occupied: 47 },
    rpbm: { positions: 8, occupied: 6 },
  });

  // Currently selected section if single tab is active
  const currentSection = useMemo(() => {
    return sections.find((s) => s.key === activeTab) || null;
  }, [sections, activeTab]);

  // All units combined
  const allUnitsFlat = useMemo(() => {
    const units: UnitManpowerRow[] = [];
    sections.forEach((sec) => {
      units.push(...sec.units);
    });
    return units;
  }, [sections]);

  // Computed Org Chart Structure Sync Preview
  const orgChartSyncPreview = useMemo(() => {
    return syncFromOrgChartStructure(
      officers,
      orgChartSyncScope === 'active' && currentSection ? currentSection.key : null
    );
  }, [officers, orgChartSyncScope, currentSection]);

  const previewSectionUnits = useMemo(() => {
    const sec = orgChartSyncPreview.sections.find((s) => s.key === orgChartPreviewSectionKey);
    return sec ? sec.units : [];
  }, [orgChartSyncPreview, orgChartPreviewSectionKey]);

  // Execute Org Chart Sync Handler (Import from Structure into ภ.ใต้)
  const handleExecuteOrgChartSync = (scope: 'all' | 'active' = 'all') => {
    const targetKey = scope === 'active' && currentSection ? currentSection.key : null;
    const syncRes = syncFromOrgChartStructure(officers, targetKey);

    if (scope === 'all') {
      setSections(syncRes.sections);
      safeLocalStorageSet('southern_border_police_data_v2', JSON.stringify(syncRes.sections));
      setIsImportModalOpen(false);
      onShowToast(
        `✅ นำเข้าข้อมูลจากตารางแผนผังโครงสร้าง ตร. สำเร็จครบทุกแถว ทุกตารางแล้ว! (126 แถว / 7 สังกัด)`
      );
    } else if (currentSection) {
      const updatedSec = syncRes.sections.find((s) => s.key === currentSection.key);
      if (updatedSec) {
        const next = sections.map((s) => (s.key === currentSection.key ? updatedSec : s));
        setSections(next);
        safeLocalStorageSet('southern_border_police_data_v2', JSON.stringify(next));
        setIsImportModalOpen(false);
        onShowToast(
          `✅ นำเข้าข้อมูลจากตารางแผนผังโครงสร้าง สังกัด "${currentSection.shortName}" สำเร็จ (${updatedSec.units.length} แถว)`
        );
      }
    }
  };

  // Grand total across all units
  const grandTotalStats = useMemo(() => {
    return calculateTotalsForUnits(allUnitsFlat);
  }, [allUnitsFlat]);

  // Filtered units for current section
  const filteredCurrentUnits = useMemo(() => {
    if (!currentSection) return [];
    if (!searchTerm.trim()) return currentSection.units;
    const q = searchTerm.toLowerCase().trim();
    return currentSection.units.filter((u) => u.unitName.toLowerCase().includes(q));
  }, [currentSection, searchTerm]);

  // Section total for current active section
  const currentSectionTotals = useMemo(() => {
    if (!currentSection) return null;
    return calculateTotalsForUnits(currentSection.units);
  }, [currentSection]);

  // Handle cell edit
  const handleUpdateRankValue = (
    sectionKey: string,
    unitId: string,
    rankKey: keyof UnitManpowerRanks,
    field: 'positions' | 'occupied',
    val: string
  ) => {
    const num = Math.max(0, parseInt(val, 10) || 0);

    setSections((prevSections) => {
      return prevSections.map((sec) => {
        if (sec.key !== sectionKey) return sec;

        const updatedUnits = sec.units.map((u) => {
          if (u.id !== unitId) return u;

          const updatedRanks: UnitManpowerRanks = {
            ...u.ranks,
            [rankKey]: {
              ...u.ranks[rankKey],
              [field]: num,
            },
          };

          return enrichUnitRow(u.id, u.sectionKey, u.no, u.unitName, updatedRanks);
        });

        return { ...sec, units: updatedUnits };
      });
    });
  };

  // Delete a unit row
  const handleDeleteRow = (sectionKey: string, unitId: string, unitName: string) => {
    if (window.confirm(`ยืนยันการลบแถว "${unitName}" ออกจากตารางหรือไม่?`)) {
      setSections((prevSections) => {
        return prevSections.map((sec) => {
          if (sec.key !== sectionKey) return sec;
          const filtered = sec.units.filter((u) => u.id !== unitId);
          return { ...sec, units: filtered };
        });
      });
      onShowToast(`🗑️ ลบ "${unitName}" เรียบร้อย`);
    }
  };

  // Open add row modal
  const handleOpenAddRowModal = () => {
    const defaultSec = currentSection ? currentSection.key : 'yala';
    setAddSectionKey(defaultSec);
    const targetSec = sections.find((s) => s.key === defaultSec);
    setAddUnitNo(String((targetSec?.units.length || 0) + 1));
    setAddUnitName('');
    setIsAddRowModalOpen(true);
  };

  // Submit add row
  const handleAddRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUnitName.trim()) {
      alert('กรุณากรอกชื่อหน่วยงานหรือสถานีตำรวจ');
      return;
    }

    let ranksToAdd = customRanks;
    if (addUnitPreset === 'station_l') {
      ranksToAdd = {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 4, occupied: 4 },
        sw: { positions: 9, occupied: 8 },
        rsw: { positions: 24, occupied: 20 },
        rt_dt53: { positions: 12, occupied: 10 },
        pbm: { positions: 95, occupied: 82 },
        rpbm: { positions: 15, occupied: 12 },
      };
    } else if (addUnitPreset === 'station_s') {
      ranksToAdd = {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 0, occupied: 0 },
        rpgk: { positions: 1, occupied: 1 },
        sw: { positions: 2, occupied: 2 },
        rsw: { positions: 6, occupied: 5 },
        rt_dt53: { positions: 3, occupied: 3 },
        pbm: { positions: 24, occupied: 20 },
        rpbm: { positions: 4, occupied: 3 },
      };
    } else if (addUnitPreset === 'division') {
      ranksToAdd = {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 2, occupied: 2 },
        sw: { positions: 5, occupied: 4 },
        rsw: { positions: 12, occupied: 10 },
        rt_dt53: { positions: 4, occupied: 4 },
        pbm: { positions: 28, occupied: 24 },
        rpbm: { positions: 4, occupied: 3 },
      };
    }

    const newId = `${addSectionKey}-${Date.now()}`;
    const newUnit = enrichUnitRow(
      newId,
      addSectionKey,
      addUnitNo.trim() || '1',
      addUnitName.trim(),
      ranksToAdd
    );

    setSections((prev) => {
      return prev.map((sec) => {
        if (sec.key !== addSectionKey) return sec;
        return {
          ...sec,
          units: [...sec.units, newUnit],
        };
      });
    });

    setIsAddRowModalOpen(false);
    onShowToast(`✅ เพิ่มแถว "${newUnit.unitName}" เข้าสู่ชีทเรียบร้อยแล้ว`);
  };

  // Process Excel File Selection
  const handleExcelFileSelected = async (file: File) => {
    setIsLoadingFile(true);
    setFileErrorMessage(null);
    try {
      const result = await parseSouthernPoliceExcelFile(file);
      setExcelPreview(result);
      if (result.primarySectionDetected) {
        setExcelPreviewSectionKey(result.primarySectionDetected);
        setExcelImportScope('active');
      } else {
        const initialKey =
          activeTab !== 'all_overview' && activeTab !== 'all_continuous' ? activeTab : 'yala';
        setExcelPreviewSectionKey(initialKey);
        setExcelImportScope('all');
      }
    } catch (err: any) {
      setFileErrorMessage(
        err?.message || 'ไม่สามารถเปิดไฟล์ Excel ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx หรือ .xls ที่ถูกต้อง'
      );
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Apply parsed Excel data to system
  const handleApplyExcelImport = () => {
    if (!excelPreview || excelPreview.sections.length === 0) return;

    if (excelImportScope === 'all') {
      setSections(excelPreview.sections);
      onShowToast(
        `🎉 นำเข้าข้อมูล Excel สำเร็จ ครบ ${excelPreview.totalUnits} หน่วยงาน 7 สังกัด สมบูรณ์แบบ`
      );
    } else if (excelImportScope === 'active') {
      const targetKey = currentSection ? currentSection.key : excelPreviewSectionKey;
      const importedTargetSec = excelPreview.sections.find((s) => s.key === targetKey);
      if (importedTargetSec && importedTargetSec.units.length > 0) {
        setSections((prev) =>
          prev.map((sec) => (sec.key === targetKey ? { ...sec, units: importedTargetSec.units } : sec))
        );
        onShowToast(
          `🎉 นำเข้าข้อมูลสังกัด ${importedTargetSec.shortName} (${importedTargetSec.units.length} หน่วย) สำเร็จ`
        );
      } else {
        setSections(excelPreview.sections);
        onShowToast(`🎉 นำเข้าข้อมูล Excel สำเร็จ ครบ ${excelPreview.totalUnits} หน่วยงาน`);
      }
    } else if (excelImportScope === 'append') {
      setSections((prev) => {
        return prev.map((sec) => {
          const incoming = excelPreview.sections.find((s) => s.key === sec.key);
          if (!incoming || incoming.units.length === 0) return sec;
          return {
            ...sec,
            units: [...sec.units, ...incoming.units],
          };
        });
      });
      onShowToast(
        `🎉 นำเข้าและเพิ่มข้อมูลต่อท้าย ${excelPreview.totalUnits} หน่วยงาน เรียบร้อย`
      );
    }

    setIsImportModalOpen(false);
    setExcelPreview(null);
  };

  // Submit CSV Import (fallback)
  const handleImportCSVSubmit = () => {
    if (!pastedCSVText.trim()) {
      alert('กรุณาวางข้อความ CSV');
      return;
    }

    try {
      const parsedSections = parseSouthernPoliceCSV(pastedCSVText);
      setSections(parsedSections);
      setIsImportModalOpen(false);
      setPastedCSVText('');
      onShowToast('🎉 นำเข้าข้อมูลตาราง ภ.ใต้ เรียบร้อย พร้อมคำนวณผลรวมอัตโนมัติ');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการประมวลผล CSV กรุณาตรวจสอบรูปแบบข้อความ');
    }
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลตาราง ภ.ใต้ ทั้งหมดกลับเป็นค่าเริ่มต้นทางการหรือไม่?')) {
      setSections(INITIAL_SOUTHERN_POLICE_SECTIONS);
      safeLocalStorageSet('southern_border_police_data_v2', JSON.stringify(INITIAL_SOUTHERN_POLICE_SECTIONS));
      onShowToast('🔄 คืนค่าเริ่มต้นตาราง ภ.ใต้ เรียบร้อยแล้ว');
    }
  };

  // Clear / Delete Data Handler
  const handleExecuteClearData = () => {
    if (clearTargetScope === 'all') {
      const cleared = sections.map((sec) => ({ ...sec, units: [] }));
      setSections(cleared);
      safeLocalStorageSet('southern_border_police_data_v2', JSON.stringify(cleared));
      setIsClearConfirmModalOpen(false);
      onShowToast('🗑️ ลบข้อมูลทั้งหมดครบ 7 สังกัดเรียบร้อยแล้ว (ตารางว่างพร้อมสำหรับนำเข้าใหม่)');
    } else {
      if (!currentSection) return;
      const targetKey = currentSection.key;
      const cleared = sections.map((sec) => (sec.key === targetKey ? { ...sec, units: [] } : sec));
      setSections(cleared);
      safeLocalStorageSet('southern_border_police_data_v2', JSON.stringify(cleared));
      setIsClearConfirmModalOpen(false);
      onShowToast(`🗑️ ลบข้อมูลสังกัด "${currentSection.shortName}" เรียบร้อยแล้ว`);
    }
  };

  // Export handlers
  const handleExportAllWorkbook = () => {
    exportSouthernPoliceWorkbook(sections);
    onShowToast('📥 ส่งออกไฟล์ Excel (.xlsx) แยกชีทครบทุกสังกัด เรียบร้อยแล้ว');
  };

  const handleExportCurrentSheet = () => {
    if (currentSection) {
      exportSingleSectionToExcel(currentSection);
      onShowToast(`📥 ส่งออกไฟล์ Excel (${currentSection.shortName}) เรียบร้อยแล้ว`);
    } else {
      handleExportAllWorkbook();
    }
  };

  const handleExportCSV = () => {
    if (currentSection) {
      exportSectionToCSV(currentSection);
      onShowToast(`📥 ส่งออกไฟล์ CSV (${currentSection.shortName}) เรียบร้อยแล้ว`);
    } else {
      handleExportAllWorkbook();
    }
  };

  return (
    <div
      className="space-y-5 animate-fadeIn relative"
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
          setIsDraggingFile(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
          setIsImportModalOpen(true);
          setImportTab('excel');
          handleExcelFileSelected(file);
        }
      }}
    >
      {/* Floating Drag Overlay */}
      {isDraggingFile && !isImportModalOpen && (
        <div className="absolute inset-0 z-50 rounded-3xl bg-emerald-950/80 backdrop-blur-sm border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center text-white pointer-events-none animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-4 shadow-xl border border-emerald-400/40">
            <FileSpreadsheet className="w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black font-['Prompt',sans-serif]">วางไฟล์ Excel ที่นี่เพื่ออัปโหลดทันที</h3>
          <p className="text-emerald-200 text-sm mt-1">
            รองรับไฟล์ .xlsx และ .xls วิเคราะห์และคำนวณผลรวมอัตโนมัติสมบูรณ์แบบ
          </p>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="rounded-3xl border-2 border-[#D4AF37]/50 bg-gradient-to-r from-[#0C1F38] via-[#102A4C] to-[#0A182B] text-slate-100 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-b from-[#1C3B66] to-[#0D213D] border-2 border-[#D4AF37] text-amber-300 flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  ระบบสารบรรณและอัตรากำลัง ภ.9
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  แยกตามตารางชีท ภ.ใต้ + อัปโหลด Excel ได้สมบูรณ์แบบ
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide mt-1 font-['Prompt',sans-serif]">
                {SOUTHERN_POLICE_TITLE}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                รวบรวมข้อมูลสถานภาพข้าราชการตำรวจ บก.สส.ภ.9, บก.สส.จชต., ศฝร.ภ.9, ภ.จว.ยะลา, ภ.จว.ปัตตานี, ภ.จว.นราธิวาส และ ภ.จว.สงขลา (4 อำเภอความมั่นคง)
              </p>
            </div>
          </div>

          {/* Primary Batch Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Add Row Button */}
            <button
              onClick={handleOpenAddRowModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition-all shadow-md cursor-pointer whitespace-nowrap"
              title="เพิ่มแถวหน่วยงานหรือสถานีตำรวจใหม่ในชีท"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มแถว / หน่วยงาน</span>
            </button>

            {/* Sync from Org Chart Structure Button */}
            <button
              onClick={() => {
                setExcelPreview(null);
                setFileErrorMessage(null);
                setImportTab('org_chart');
                setIsImportModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-indigo-500/25 cursor-pointer whitespace-nowrap border border-indigo-400/30"
              title="นำเข้าข้อมูลจากตารางแผนผังโครงสร้าง ตร. เข้าสู่ตารางข้อมูล ภ.ใต้ ให้ตรงกันทุกๆ แถว ทุกๆ ตาราง"
            >
              <Network className="w-4 h-4 text-cyan-200" />
              <span>🔄 นำเข้าจากตารางแผนผังโครง</span>
            </button>

            {/* Import Excel / CSV Modal Button */}
            <button
              onClick={() => {
                setExcelPreview(null);
                setFileErrorMessage(null);
                setIsImportModalOpen(true);
                setImportTab('excel');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer whitespace-nowrap border border-emerald-400/30"
              title="อัปโหลดและนำเข้าข้อมูลด้วยไฟล์ Excel (.xlsx, .xls) หรือ CSV ได้สมบูรณ์แบบ"
            >
              <FileUp className="w-4 h-4 text-emerald-200" />
              <span>📥 อัปโหลด Excel (.xlsx)</span>
            </button>

            {/* Export Excel All Sheets */}
            <button
              onClick={handleExportAllWorkbook}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition-all shadow-md hover:shadow-emerald-500/30 cursor-pointer whitespace-nowrap"
              title="ดาวน์โหลดไฟล์ Excel (.xlsx) ที่มีหลายแผ่นงานแยกตามสังกัด ภ.ใต้ และภาพรวมทั้งหมด"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>ดาวน์โหลด Excel ทุกชีท (.xlsx)</span>
            </button>

            {currentSection && (
              <button
                onClick={handleExportCurrentSheet}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                title="ส่งออกเฉพาะชีทที่กำลังเลือกอยู่นี้เป็น Excel"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>ส่งออกชีทนี้</span>
              </button>
            )}

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isEditMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
              }`}
              title="เปิด/ปิด โหมดแก้ไขตัวเลขในตารางแบบเรียลไทม์"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'บันทึกตัวเลข' : 'แก้ไขตัวเลข'}</span>
            </button>

            {/* Delete All Data Button */}
            <button
              onClick={() => {
                setClearTargetScope(
                  activeTab !== 'all_overview' && activeTab !== 'all_continuous' ? 'active' : 'all'
                );
                setIsClearConfirmModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer whitespace-nowrap border border-rose-500/40"
              title="ลบข้อมูลทั้งหมดในตาราง ภ.ใต้ หรือลบเฉพาะสังกัดที่เลือก"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-200" />
              <span>ลบข้อมูลทั้งหมด</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-slate-200 border border-white/10 text-xs cursor-pointer"
              title="คืนค่าตัวเลขเริ่มต้นทางการ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[11px] block">กรอบอัตราตำแหน่งทั้งหมด</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              {grandTotalStats.grandTotal.positions.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">อัตรา</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[11px] block">มีผู้ครองตำแหน่งจริง</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {grandTotalStats.grandTotal.occupied.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">นาย</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[11px] block">ตำแหน่งว่าง (ขาดแคลน)</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {grandTotalStats.vacant.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">อัตรา</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[11px] block">อัตราการครองเฉลี่ย</span>
            <span className="text-xl sm:text-2xl font-black text-blue-300 font-mono">
              {grandTotalStats.occupancyPercent}%
            </span>
            <span className="text-[10px] text-slate-400 ml-1">ของกรอบ</span>
          </div>
        </div>
      </div>

      {/* 2. Sheet Tabs Navigation Bar (Simulates Excel Sheet Tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {/* Overview Tab */}
        <button
          onClick={() => setActiveTab('all_overview')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeTab === 'all_overview'
              ? 'bg-[#0F1E36] text-amber-300 border-2 border-amber-400/80 shadow-md scale-102'
              : 'bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>📊 สรุปภาพรวมทุกสังกัด</span>
        </button>

        {/* Section Tabs */}
        {sections.map((sec, idx) => {
          const isActive = activeTab === sec.key;
          return (
            <button
              key={sec.key}
              onClick={() => setActiveTab(sec.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                isActive
                  ? 'bg-red-700 text-white border-2 border-red-500 font-bold shadow-md scale-102'
                  : 'bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>{sec.shortName}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
              }`}>
                {sec.units.length}
              </span>
            </button>
          );
        })}

        {/* Continuous Full View Tab */}
        <button
          onClick={() => setActiveTab('all_continuous')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all_continuous'
              ? 'bg-blue-800 text-white border-2 border-blue-500 font-bold shadow-md'
              : 'bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>📑 แสดงทุกสังกัดต่อเนื่อง</span>
        </button>
      </div>

      {/* 3. Search and Table Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ สภ. หรือหน่วยงานในชีท..."
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-hidden transition-all text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {currentSection && (
            <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
              แสดง {filteredCurrentUnits.length} จาก {currentSection.units.length} หน่วยงาน
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {isEditMode && (
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700">
              ✏️ กำลังอยู่ในโหมดแก้ไขตัวเลข (แก้ไขแล้วผลรวมคำนวณทันที)
            </span>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
            title="ส่งออกเป็นไฟล์ CSV (UTF-8)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN DATA TABLE CONTAINER */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
        <div className="overflow-x-auto max-h-[75vh] relative">
          <table className="w-full text-xs text-center border-collapse">
            {/* Table Header Row 1: Rank Groups */}
            <thead className="bg-[#0F1E36] text-white sticky top-0 z-20 shadow-xs border-b border-[#1E3A5F]">
              <tr>
                <th
                  rowSpan={2}
                  className="py-3 px-2 font-bold border-r border-[#1E3A5F] whitespace-nowrap sticky left-0 bg-[#0F1E36] z-30"
                  style={{ width: '45px' }}
                >
                  ลำดับ
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-left font-bold border-r border-[#1E3A5F] whitespace-nowrap sticky left-[45px] bg-[#0F1E36] z-30"
                  style={{ minWidth: '220px' }}
                >
                  หน่วยงาน
                </th>

                {/* Individual Commissioned Ranks */}
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644]">
                  ผบก.
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644]">
                  รอง ผบก.
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644]">
                  ผกก.
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644]">
                  รอง ผกก.
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644]">
                  สว.
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644]">
                  รอง สว.
                </th>

                {/* Subtotal Commissioned */}
                <th colSpan={2} className="py-2 px-2 font-bold border-r border-[#1E3A5F] whitespace-nowrap bg-[#1E3A5F] text-[#FFE066]">
                  รวมชั้นสัญญาบัตร
                </th>

                {/* Individual Non-Commissioned Ranks */}
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#162C4E]">
                  รอง สว.(ท./ด.ต.53 ปี)
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#162C4E]">
                  ผบ.หมู่
                </th>
                <th colSpan={2} className="py-2 px-1 font-semibold border-r border-[#1E3A5F] whitespace-nowrap bg-[#162C4E]">
                  รอง ผบ.หมู่
                </th>

                {/* Subtotal Non-Commissioned */}
                <th colSpan={2} className="py-2 px-2 font-bold border-r border-[#1E3A5F] whitespace-nowrap bg-[#1E3A5F] text-[#6EE7B7]">
                  รวมชั้นประทวน
                </th>

                {/* Grand Total */}
                <th colSpan={2} className="py-2 px-2 font-black border-r border-[#1E3A5F] whitespace-nowrap bg-[#B91C1C] text-white">
                  รวมทั้งหมด
                </th>

                {/* Vacant & % */}
                <th rowSpan={2} className="py-3 px-2 font-bold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644] text-rose-300">
                  ว่าง
                </th>
                <th rowSpan={2} className="py-3 px-2 font-bold border-r border-[#1E3A5F] whitespace-nowrap bg-[#132644] text-amber-300">
                  % ครอง
                </th>
                {isEditMode && (
                  <th rowSpan={2} className="py-3 px-2 font-bold whitespace-nowrap bg-[#991B1B] text-white">
                    จัดการ
                  </th>
                )}
              </tr>

              {/* Table Header Row 2: Sub-columns (ตำแหน่ง / คนครอง) */}
              <tr className="bg-[#0A1628] text-[11px] text-slate-300 border-b border-[#1E3A5F]">
                {/* ผบก. */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-amber-200">คนครอง</th>
                {/* รอง ผบก. */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-amber-200">คนครอง</th>
                {/* ผกก. */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-amber-200">คนครอง</th>
                {/* รอง ผกก. */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-amber-200">คนครอง</th>
                {/* สว. */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-amber-200">คนครอง</th>
                {/* รอง สว. */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-amber-200">คนครอง</th>

                {/* รวมชั้นสัญญาบัตร */}
                <th className="py-1 px-1.5 border-r border-[#1E3A5F] font-bold text-[#FFE066] bg-[#162C4E]">ตำแหน่ง</th>
                <th className="py-1 px-1.5 border-r border-[#1E3A5F] font-bold text-[#FFE066] bg-[#162C4E]">คนครอง</th>

                {/* รอง สว.(ท.) */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-emerald-200">คนครอง</th>
                {/* ผบ.หมู่ */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-emerald-200">คนครอง</th>
                {/* รอง ผบ.หมู่ */}
                <th className="py-1 px-1 border-r border-[#1E3A5F]">ตำแหน่ง</th>
                <th className="py-1 px-1 border-r border-[#1E3A5F] text-emerald-200">คนครอง</th>

                {/* รวมชั้นประทวน */}
                <th className="py-1 px-1.5 border-r border-[#1E3A5F] font-bold text-[#6EE7B7] bg-[#162C4E]">ตำแหน่ง</th>
                <th className="py-1 px-1.5 border-r border-[#1E3A5F] font-bold text-[#6EE7B7] bg-[#162C4E]">คนครอง</th>

                {/* รวมทั้งหมด */}
                <th className="py-1 px-1.5 border-r border-[#1E3A5F] font-black text-white bg-[#991B1B]">ตำแหน่ง</th>
                <th className="py-1 px-1.5 border-r border-[#1E3A5F] font-black text-amber-300 bg-[#991B1B]">คนครอง</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* TAB 1: OVERVIEW SUMMARY SHEET */}
              {activeTab === 'all_overview' && (
                <>
                  {sections.map((sec, idx) => {
                    const secTotals = calculateTotalsForUnits(sec.units);
                    return (
                      <tr
                        key={sec.key}
                        onClick={() => setActiveTab(sec.key)}
                        className="hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-2 font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-amber-50/60 dark:group-hover:bg-slate-850">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 text-left font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 sticky left-[45px] bg-white dark:bg-slate-900 group-hover:bg-amber-50/60 dark:group-hover:bg-slate-850 flex items-center justify-between">
                          <span className="truncate">{sec.title}</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal flex items-center gap-0.5 ml-2">
                            <span>ดูชีท</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>

                        {/* ผบก. */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.pbg.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400 font-semibold">{secTotals.ranks.pbg.occupied}</td>

                        {/* รอง ผบก. */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.rpbg.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400 font-semibold">{secTotals.ranks.rpbg.occupied}</td>

                        {/* ผกก. */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.pgk.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400 font-semibold">{secTotals.ranks.pgk.occupied}</td>

                        {/* รอง ผกก. */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.rpgk.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400 font-semibold">{secTotals.ranks.rpgk.occupied}</td>

                        {/* สว. */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.sw.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400 font-semibold">{secTotals.ranks.sw.occupied}</td>

                        {/* รอง สว. */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.rsw.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400 font-semibold">{secTotals.ranks.rsw.occupied}</td>

                        {/* รวมสัญญาบัตร */}
                        <td className="py-2.5 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-amber-200">
                          {secTotals.totalCommissioned.positions}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400">
                          {secTotals.totalCommissioned.occupied}
                        </td>

                        {/* รอง สว.(ท.) */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.rt_dt53.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{secTotals.ranks.rt_dt53.occupied}</td>

                        {/* ผบ.หมู่ */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.pbm.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{secTotals.ranks.pbm.occupied}</td>

                        {/* รอง ผบ.หมู่ */}
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{secTotals.ranks.rpbm.positions}</td>
                        <td className="py-2.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{secTotals.ranks.rpbm.occupied}</td>

                        {/* รวมประทวน */}
                        <td className="py-2.5 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-800 dark:text-emerald-200">
                          {secTotals.totalNonCommissioned.positions}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400">
                          {secTotals.totalNonCommissioned.occupied}
                        </td>

                        {/* รวมทั้งหมด */}
                        <td className="py-2.5 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-black bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-200">
                          {secTotals.grandTotal.positions}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-black bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                          {secTotals.grandTotal.occupied}
                        </td>

                        {/* ว่าง & % */}
                        <td className="py-2.5 px-1 font-mono text-rose-600 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800 font-semibold">
                          {secTotals.vacant}
                        </td>
                        <td className="py-2.5 px-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {secTotals.occupancyPercent}%
                        </td>
                        {isEditMode && (
                          <td className="py-2.5 px-1 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab(sec.key);
                              }}
                              className="px-2 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] cursor-pointer shadow-2xs whitespace-nowrap"
                              title={`คลิกเพื่อแก้ไขตัวเลขรายสถานีในชีท ${sec.shortName}`}
                            >
                              แก้ไขชีทนี้ ↗
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              )}

              {/* TAB 2: INDIVIDUAL SECTION SHEET */}
              {currentSection && (
                <>
                  {filteredCurrentUnits.map((u) => {
                    const comm = u.totalCommissioned || { positions: 0, occupied: 0 };
                    const nonComm = u.totalNonCommissioned || { positions: 0, occupied: 0 };
                    const grand = u.grandTotal || { positions: 0, occupied: 0 };
                    const vacant = grand.positions - grand.occupied;
                    const pct = grand.positions > 0 ? Math.round((grand.occupied / grand.positions) * 1000) / 10 : 0;

                    const renderCell = (
                      rankKey: keyof UnitManpowerRanks,
                      field: 'positions' | 'occupied',
                      extraClasses = ''
                    ) => {
                      const val = u.ranks[rankKey][field];
                      if (!isEditMode) {
                        return (
                          <span className={`font-mono ${extraClasses} ${val === 0 ? 'text-slate-300 dark:text-slate-600' : ''}`}>
                            {val}
                          </span>
                        );
                      }
                      return (
                        <input
                          type="number"
                          min="0"
                          value={val}
                          onChange={(e) =>
                            handleUpdateRankValue(u.sectionKey, u.id, rankKey, field, e.target.value)
                          }
                          className="w-12 text-center text-xs py-0.5 px-1 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 focus:bg-white focus:border-amber-500 outline-hidden font-mono"
                        />
                      );
                    };

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors group"
                      >
                        <td className="py-2.5 px-2 font-mono text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                          {u.no}
                        </td>
                        <td className="py-2.5 px-3 text-left font-medium text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 sticky left-[45px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                          {u.unitName}
                        </td>

                        {/* ผบก. */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('pbg', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('pbg', 'occupied', 'text-amber-700 dark:text-amber-400 font-semibold')}</td>

                        {/* รอง ผบก. */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rpbg', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rpbg', 'occupied', 'text-amber-700 dark:text-amber-400 font-semibold')}</td>

                        {/* ผกก. */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('pgk', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('pgk', 'occupied', 'text-amber-700 dark:text-amber-400 font-semibold')}</td>

                        {/* รอง ผกก. */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rpgk', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rpgk', 'occupied', 'text-amber-700 dark:text-amber-400 font-semibold')}</td>

                        {/* สว. */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('sw', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('sw', 'occupied', 'text-amber-700 dark:text-amber-400 font-semibold')}</td>

                        {/* รอง สว. */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rsw', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rsw', 'occupied', 'text-amber-700 dark:text-amber-400 font-semibold')}</td>

                        {/* รวมสัญญาบัตร */}
                        <td className="py-2 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-amber-50/40 dark:bg-amber-950/20 text-slate-800 dark:text-amber-200">
                          {comm.positions}
                        </td>
                        <td className="py-2 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-amber-50/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400">
                          {comm.occupied}
                        </td>

                        {/* รอง สว.(ท.) */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rt_dt53', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rt_dt53', 'occupied', 'text-emerald-700 dark:text-emerald-400 font-semibold')}</td>

                        {/* ผบ.หมู่ */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('pbm', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('pbm', 'occupied', 'text-emerald-700 dark:text-emerald-400 font-semibold')}</td>

                        {/* รอง ผบ.หมู่ */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rpbm', 'positions')}</td>
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800">{renderCell('rpbm', 'occupied', 'text-emerald-700 dark:text-emerald-400 font-semibold')}</td>

                        {/* รวมประทวน */}
                        <td className="py-2 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-800 dark:text-emerald-200">
                          {nonComm.positions}
                        </td>
                        <td className="py-2 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400">
                          {nonComm.occupied}
                        </td>

                        {/* รวมทั้งหมด */}
                        <td className="py-2 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-black bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-200">
                          {grand.positions}
                        </td>
                        <td className="py-2 px-1.5 border-r border-slate-100 dark:border-slate-800 font-mono font-black bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                          {grand.occupied}
                        </td>

                        {/* ว่าง & % */}
                        <td className="py-2 px-1 font-mono text-rose-600 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800 font-semibold">
                          {vacant}
                        </td>
                        <td className="py-2 px-1 font-mono font-bold text-blue-600 dark:text-blue-400 border-r border-slate-100 dark:border-slate-800">
                          {pct}%
                        </td>

                        {/* Delete button in edit mode */}
                        {isEditMode && (
                          <td className="py-2 px-1">
                            <button
                              onClick={() => handleDeleteRow(u.sectionKey, u.id, u.unitName)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded cursor-pointer"
                              title="ลบแถวนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Empty state when all units in this section are cleared */}
                  {filteredCurrentUnits.length === 0 && (
                    <tr>
                      <td colSpan={isEditMode ? 29 : 28} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                            ไม่มีข้อมูลหน่วยงานในสังกัดนี้ (ตารางว่างเปล่า)
                          </div>
                          <p className="text-xs text-slate-400 max-w-sm">
                            คุณสามารถกด "📥 อัปโหลด Excel" เพื่อนำเข้าข้อมูล หรือกด "เพิ่มแถว / หน่วยงาน" หรือ "🔄 คืนค่าเริ่มต้น" ได้ทันที
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                setExcelPreview(null);
                                setFileErrorMessage(null);
                                setIsImportModalOpen(true);
                                setImportTab('excel');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                            >
                              📥 อัปโหลด Excel
                            </button>
                            <button
                              onClick={handleResetDefaults}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                            >
                              🔄 คืนค่าเริ่มต้น
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Section Subtotal Row */}
                  {currentSectionTotals && (
                    <tr className="bg-[#0F1E36]/90 text-white font-bold text-xs border-t-2 border-[#1E3A5F]">
                      <td className="py-3 px-2 border-r border-[#1E3A5F] sticky left-0 bg-[#0F1E36] z-10"></td>
                      <td className="py-3 px-3 text-left border-r border-[#1E3A5F] sticky left-[45px] bg-[#0F1E36] z-10 text-amber-300">
                        รวม ({currentSection.shortName})
                      </td>

                      {/* ผบก. */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.pbg.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{currentSectionTotals.ranks.pbg.occupied}</td>

                      {/* รอง ผบก. */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.rpbg.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{currentSectionTotals.ranks.rpbg.occupied}</td>

                      {/* ผกก. */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.pgk.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{currentSectionTotals.ranks.pgk.occupied}</td>

                      {/* รอง ผกก. */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.rpgk.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{currentSectionTotals.ranks.rpgk.occupied}</td>

                      {/* สว. */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.sw.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{currentSectionTotals.ranks.sw.occupied}</td>

                      {/* รอง สว. */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.rsw.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{currentSectionTotals.ranks.rsw.occupied}</td>

                      {/* รวมสัญญาบัตร */}
                      <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#FFE066] bg-[#1E3A5F]">
                        {currentSectionTotals.totalCommissioned.positions}
                      </td>
                      <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#FFE066] bg-[#1E3A5F]">
                        {currentSectionTotals.totalCommissioned.occupied}
                      </td>

                      {/* รอง สว.(ท.) */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.rt_dt53.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-emerald-300">{currentSectionTotals.ranks.rt_dt53.occupied}</td>

                      {/* ผบ.หมู่ */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.pbm.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-emerald-300">{currentSectionTotals.ranks.pbm.occupied}</td>

                      {/* รอง ผบ.หมู่ */}
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{currentSectionTotals.ranks.rpbm.positions}</td>
                      <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-emerald-300">{currentSectionTotals.ranks.rpbm.occupied}</td>

                      {/* รวมประทวน */}
                      <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#6EE7B7] bg-[#1E3A5F]">
                        {currentSectionTotals.totalNonCommissioned.positions}
                      </td>
                      <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#6EE7B7] bg-[#1E3A5F]">
                        {currentSectionTotals.totalNonCommissioned.occupied}
                      </td>

                      {/* รวมทั้งหมด */}
                      <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-black text-white bg-[#991B1B]">
                        {currentSectionTotals.grandTotal.positions}
                      </td>
                      <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-black text-[#FFE066] bg-[#991B1B]">
                        {currentSectionTotals.grandTotal.occupied}
                      </td>

                      {/* ว่าง & % */}
                      <td className="py-2.5 px-1 font-mono text-rose-300 border-r border-[#1E3A5F]">
                        {currentSectionTotals.vacant}
                      </td>
                      <td className="py-2.5 px-1 font-mono font-black text-amber-300">
                        {currentSectionTotals.occupancyPercent}%
                      </td>
                      {isEditMode && <td className="py-2.5 px-1"></td>}
                    </tr>
                  )}
                </>
              )}

              {/* TAB 3: CONTINUOUS ALL SECTIONS SHEET */}
              {activeTab === 'all_continuous' && (
                <>
                  {sections.map((sec, sIdx) => {
                    const secTotals = calculateTotalsForUnits(sec.units);
                    return (
                      <React.Fragment key={sec.key}>
                        {/* Section Header Row */}
                        <tr className="bg-[#12243D] text-amber-300 font-bold text-left border-y-2 border-[#1E3A5F]">
                          <td colSpan={isEditMode ? 29 : 28} className="py-2.5 px-4 sticky left-0 z-10 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span>
                              【สังกัดที่ {sIdx + 1}】 {sec.title} ({sec.units.length} หน่วยงาน)
                            </span>
                          </td>
                        </tr>

                        {/* Section Unit Rows */}
                        {sec.units.map((u) => {
                          const comm = u.totalCommissioned || { positions: 0, occupied: 0 };
                          const nonComm = u.totalNonCommissioned || { positions: 0, occupied: 0 };
                          const grand = u.grandTotal || { positions: 0, occupied: 0 };
                          const vacant = grand.positions - grand.occupied;
                          const pct = grand.positions > 0 ? Math.round((grand.occupied / grand.positions) * 1000) / 10 : 0;

                          return (
                            <tr
                              key={u.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors group"
                            >
                              <td className="py-2 px-2 font-mono text-slate-500 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50">
                                {u.no}
                              </td>
                              <td className="py-2 px-3 text-left font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 sticky left-[45px] bg-white dark:bg-slate-900 group-hover:bg-slate-50">
                                {u.unitName}
                              </td>
                              {/* Ranks */}
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.pbg.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400">{u.ranks.pbg.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.rpbg.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400">{u.ranks.rpbg.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.pgk.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400">{u.ranks.pgk.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.rpgk.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400">{u.ranks.rpgk.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.sw.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400">{u.ranks.sw.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.rsw.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-400">{u.ranks.rsw.occupied}</td>

                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-amber-50/40 text-slate-800 dark:text-amber-200">{comm.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-amber-50/40 text-amber-800 dark:text-amber-400">{comm.occupied}</td>

                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.rt_dt53.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-emerald-700 dark:text-emerald-400">{u.ranks.rt_dt53.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.pbm.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-emerald-700 dark:text-emerald-400">{u.ranks.pbm.occupied}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono">{u.ranks.rpbm.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono text-emerald-700 dark:text-emerald-400">{u.ranks.rpbm.occupied}</td>

                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-emerald-50/40 text-slate-800 dark:text-emerald-200">{nonComm.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono font-bold bg-emerald-50/40 text-emerald-800 dark:text-emerald-400">{nonComm.occupied}</td>

                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono font-black bg-red-50/40 text-red-900 dark:text-red-200">{grand.positions}</td>
                              <td className="py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 font-mono font-black bg-red-50/40 text-red-700 dark:text-red-400">{grand.occupied}</td>

                              <td className="py-1.5 px-1 font-mono text-rose-600 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800">{vacant}</td>
                              <td className="py-1.5 px-1 font-mono font-bold text-blue-600 dark:text-blue-400">{pct}%</td>
                              {isEditMode && <td className="py-1.5 px-1"></td>}
                            </tr>
                          );
                        })}

                        {/* Section Subtotal */}
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-b-2 border-slate-300 dark:border-slate-700">
                          <td className="py-2 px-2 sticky left-0 bg-slate-100 dark:bg-slate-800"></td>
                          <td className="py-2 px-3 text-left sticky left-[45px] bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300">
                            รวม ({sec.shortName})
                          </td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.pbg.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-600">{secTotals.ranks.pbg.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.rpbg.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-600">{secTotals.ranks.rpbg.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.pgk.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-600">{secTotals.ranks.pgk.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.rpgk.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-600">{secTotals.ranks.rpgk.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.sw.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-600">{secTotals.ranks.sw.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.rsw.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-600">{secTotals.ranks.rsw.occupied}</td>

                          <td className="py-2 px-1 font-mono text-amber-800 dark:text-amber-300">{secTotals.totalCommissioned.positions}</td>
                          <td className="py-2 px-1 font-mono text-amber-800 dark:text-amber-300">{secTotals.totalCommissioned.occupied}</td>

                          <td className="py-2 px-1 font-mono">{secTotals.ranks.rt_dt53.positions}</td>
                          <td className="py-2 px-1 font-mono text-emerald-600">{secTotals.ranks.rt_dt53.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.pbm.positions}</td>
                          <td className="py-2 px-1 font-mono text-emerald-600">{secTotals.ranks.pbm.occupied}</td>
                          <td className="py-2 px-1 font-mono">{secTotals.ranks.rpbm.positions}</td>
                          <td className="py-2 px-1 font-mono text-emerald-600">{secTotals.ranks.rpbm.occupied}</td>

                          <td className="py-2 px-1 font-mono text-emerald-800 dark:text-emerald-300">{secTotals.totalNonCommissioned.positions}</td>
                          <td className="py-2 px-1 font-mono text-emerald-800 dark:text-emerald-300">{secTotals.totalNonCommissioned.occupied}</td>

                          <td className="py-2 px-1 font-mono font-black text-red-700">{secTotals.grandTotal.positions}</td>
                          <td className="py-2 px-1 font-mono font-black text-red-700">{secTotals.grandTotal.occupied}</td>

                          <td className="py-2 px-1 font-mono text-rose-600">{secTotals.vacant}</td>
                          <td className="py-2 px-1 font-mono text-blue-600">{secTotals.occupancyPercent}%</td>
                          {isEditMode && <td className="py-2 px-1"></td>}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </tbody>

            {/* GRAND TOTAL FOOTER (Always Visible) */}
            <tfoot className="bg-[#0A1628] text-white font-black text-xs border-t-2 border-amber-400 sticky bottom-0 z-20 shadow-lg">
              <tr>
                <td className="py-3 px-2 border-r border-[#1E3A5F] sticky left-0 bg-[#0A1628] text-amber-400 z-30">
                  ★
                </td>
                <td className="py-3 px-3 text-left border-r border-[#1E3A5F] sticky left-[45px] bg-[#0A1628] text-amber-300 z-30">
                  รวมทั้งหมดทุกหน่วย (Grand Total)
                </td>

                {/* ผบก. */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.pbg.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{grandTotalStats.ranks.pbg.occupied}</td>

                {/* รอง ผบก. */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.rpbg.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{grandTotalStats.ranks.rpbg.occupied}</td>

                {/* ผกก. */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.pgk.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{grandTotalStats.ranks.pgk.occupied}</td>

                {/* รอง ผกก. */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.rpgk.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{grandTotalStats.ranks.rpgk.occupied}</td>

                {/* สว. */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.sw.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{grandTotalStats.ranks.sw.occupied}</td>

                {/* รอง สว. */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.rsw.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-amber-300">{grandTotalStats.ranks.rsw.occupied}</td>

                {/* รวมชั้นสัญญาบัตร */}
                <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#FFE066] bg-[#162C4E]">
                  {grandTotalStats.totalCommissioned.positions}
                </td>
                <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#FFE066] bg-[#162C4E]">
                  {grandTotalStats.totalCommissioned.occupied}
                </td>

                {/* รอง สว.(ท.) */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.rt_dt53.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-emerald-300">{grandTotalStats.ranks.rt_dt53.occupied}</td>

                {/* ผบ.หมู่ */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.pbm.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-emerald-300">{grandTotalStats.ranks.pbm.occupied}</td>

                {/* รอง ผบ.หมู่ */}
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono">{grandTotalStats.ranks.rpbm.positions}</td>
                <td className="py-2.5 px-1 border-r border-[#1E3A5F] font-mono text-emerald-300">{grandTotalStats.ranks.rpbm.occupied}</td>

                {/* รวมชั้นประทวน */}
                <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#6EE7B7] bg-[#162C4E]">
                  {grandTotalStats.totalNonCommissioned.positions}
                </td>
                <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-mono font-black text-[#6EE7B7] bg-[#162C4E]">
                  {grandTotalStats.totalNonCommissioned.occupied}
                </td>

                {/* รวมทั้งหมด */}
                <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-black text-white bg-[#B91C1C]">
                  {grandTotalStats.grandTotal.positions}
                </td>
                <td className="py-2.5 px-1.5 border-r border-[#1E3A5F] font-black text-[#FFE066] bg-[#B91C1C]">
                  {grandTotalStats.grandTotal.occupied}
                </td>

                {/* ว่าง & % */}
                <td className="py-2.5 px-1 font-mono text-rose-300 border-r border-[#1E3A5F]">
                  {grandTotalStats.vacant}
                </td>
                <td className="py-2.5 px-1 font-mono font-black text-amber-300">
                  {grandTotalStats.occupancyPercent}%
                </td>
                {isEditMode && <td className="py-2.5 px-1"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ADD ROW / UNIT */}
      {isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-50 dark:from-red-950/40 via-transparent to-transparent">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600" />
                <span>เพิ่มแถวหน่วยงาน / สถานีตำรวจใหม่</span>
              </h3>
              <button
                onClick={() => setIsAddRowModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRowSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  เลือกสังกัด / แผ่นงาน (Sheet) *
                </label>
                <select
                  value={addSectionKey}
                  onChange={(e) => {
                    const k = e.target.value;
                    setAddSectionKey(k);
                    const targetSec = sections.find((s) => s.key === k);
                    setAddUnitNo(String((targetSec?.units.length || 0) + 1));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:border-red-500 font-semibold"
                >
                  {sections.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.title} ({s.units.length} หน่วย)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ลำดับ *
                  </label>
                  <input
                    type="text"
                    required
                    value={addUnitNo}
                    onChange={(e) => setAddUnitNo(e.target.value)}
                    placeholder="เช่น 24"
                    className="w-full px-3 py-2 text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:border-red-500 font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ชื่อหน่วยงาน / สถานีตำรวจ *
                  </label>
                  <input
                    type="text"
                    required
                    value={addUnitName}
                    onChange={(e) => setAddUnitName(e.target.value)}
                    placeholder="เช่น สภ.เมืองใหม่ จว.ยะลา"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:border-red-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ขนาดหน่วยงาน / รูปแบบกรอบอัตรากำลัง
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { id: 'station_m', label: 'สภ.ขนาดกลาง', desc: 'ผกก.+รอง+สว.+55 ผบ.หมู่' },
                    { id: 'station_l', label: 'สภ.ขนาดใหญ่', desc: 'สภ.เมือง (95 ผบ.หมู่)' },
                    { id: 'station_s', label: 'สภ.ขนาดเล็ก', desc: 'สภ.ตำบล (24 ผบ.หมู่)' },
                    { id: 'division', label: 'กก./ฝอ.', desc: 'ฝ่ายอำนวยการ/กก.' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAddUnitPreset(preset.id as any)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        addUnitPreset === preset.id
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold">{preset.label}</div>
                      <div className="text-[10px] text-slate-400">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRowModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer shadow-xs transition-colors"
                >
                  บันทึกแถวใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EXCEL FILE UPLOAD & CSV IMPORT (FULL SUITE) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 dark:from-indigo-950/40 via-emerald-50/30 dark:via-emerald-950/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-md">
                  <Network className="w-5 h-5 text-cyan-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    ศูนย์นำเข้าและเชื่อมโยงข้อมูลตาราง ภ.ใต้
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    นำเข้าข้อมูลจากตารางแผนผังโครงสร้าง ตร., ไฟล์ Excel (.xlsx, .xls) หรือข้อความ CSV ให้ตรงกันทุกๆ แถว ทุกๆ ตาราง
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setExcelPreview(null);
                  setFileErrorMessage(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => {
                  setImportTab('org_chart');
                  setFileErrorMessage(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  importTab === 'org_chart'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Network className="w-4 h-4 text-indigo-500" />
                <span>🏢 ดึงจากตารางแผนผังโครงสร้าง ตร.</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-500/20 text-indigo-500 border border-indigo-400/30">
                  แนะนำ
                </span>
              </button>

              <button
                onClick={() => {
                  setImportTab('excel');
                  setFileErrorMessage(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  importTab === 'excel'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>📥 อัปโหลดไฟล์ Excel (.xlsx, .xls)</span>
              </button>

              <button
                onClick={() => {
                  setImportTab('csv');
                  setFileErrorMessage(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  importTab === 'csv'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>📋 วางข้อความ CSV</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* TAB 1: SYNC FROM ORG CHART STRUCTURE */}
              {importTab === 'org_chart' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-slate-800 dark:text-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Network className="w-5 h-5 text-indigo-100" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                            โครงสร้างหน่วยงาน ตร. & ภ.9 (3 จชต. และ 4 อำเภอสงขลา)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            126 แถวครบทุกตาราง
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                          ระบบจะนำเข้าข้อมูลโครงสร้างหน่วยงานทั้งหมด 126 แถว พร้อมกรอบอัตรากำลังและคนครองตามแผนผังโครงสร้าง ตร. และจับคู่กับข้อมูลกำลังพลในระบบ ({officers.length} อัตรา) เพื่อให้ตัวเลขตรงกันทุกๆ ช่อง ทุกๆ แถว และทุกๆ ตารางข้อมูลของ ภ.ใต้ อย่างสมบูรณ์แบบ
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-medium">สังกัดทั้งหมด</div>
                      <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                        7 สังกัดหลัก
                      </div>
                      <div className="text-[10px] text-slate-400">ครบตามผัง ตร.</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-medium">หน่วยงาน/สถานี</div>
                      <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                        {orgChartSyncPreview.totalUnits} แถว
                      </div>
                      <div className="text-[10px] text-slate-400">ตรงกันทุกแถว 100%</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-medium">กรอบอัตราตำแหน่ง</div>
                      <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                        {orgChartSyncPreview.totalPositions.toLocaleString()} อัตรา
                      </div>
                      <div className="text-[10px] text-slate-400">ครอง {orgChartSyncPreview.totalOccupied.toLocaleString()} อัตรา</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-medium">ร้อยละการครอง</div>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        {orgChartSyncPreview.occupancyPercent}%
                      </div>
                      <div className="text-[10px] text-slate-400">ว่าง {orgChartSyncPreview.totalVacant.toLocaleString()} อัตรา</div>
                    </div>
                  </div>

                  {/* Scope Selector */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      ขอบเขตการนำเข้าข้อมูลจากแผนผังโครงสร้าง:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          orgChartSyncScope === 'all'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="orgChartScope"
                          value="all"
                          checked={orgChartSyncScope === 'all'}
                          onChange={() => setOrgChartSyncScope('all')}
                          className="accent-indigo-600"
                        />
                        <div>
                          <div className="font-bold text-xs">นำเข้าข้อมูลทุกสังกัด (126 แถว ทุกตาราง)</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            ซิงค์ข้อมูลให้ตรงกันทุกๆ แถว ครบทั้ง 7 สังกัด และสรุปภาพรวมทั้งหมด
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          orgChartSyncScope === 'active'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="orgChartScope"
                          value="active"
                          checked={orgChartSyncScope === 'active'}
                          onChange={() => setOrgChartSyncScope('active')}
                          disabled={!currentSection}
                          className="accent-indigo-600"
                        />
                        <div>
                          <div className="font-bold text-xs">
                            นำเข้าเฉพาะสังกัดที่เลือก ({currentSection?.shortName || 'ไม่มีการเลือกสังกัด'})
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            ซิงค์เฉพาะหน่วยงานในแผ่นงานนี้ โดยไม่กระทบสังกัดอื่น
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Section Breakdown Pills */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        ตารางรายสังกัดที่จะนำเข้า (คลิกดูตัวอย่างแถว):
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.keys(orgChartSyncPreview.breakdown).map((secKey) => {
                        const b = orgChartSyncPreview.breakdown[secKey];
                        const isActive = orgChartPreviewSectionKey === secKey;
                        return (
                          <button
                            key={secKey}
                            type="button"
                            onClick={() => setOrgChartPreviewSectionKey(secKey)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <span>{b.shortName}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {b.count} แถว
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Mini Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ตัวอย่างตาราง: {orgChartSyncPreview.breakdown[orgChartPreviewSectionKey]?.title || 'ตาราง'}
                      </span>
                      <span className="text-slate-500">
                        {previewSectionUnits.length} แถวหน่วยงาน
                      </span>
                    </div>

                    <div className="max-h-56 overflow-auto">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-200/70 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                          <tr>
                            <th className="p-2 text-center w-10">ที่</th>
                            <th className="p-2">หน่วยงาน</th>
                            <th className="p-2 text-center">ผบก.</th>
                            <th className="p-2 text-center">ผกก.</th>
                            <th className="p-2 text-center">สว.</th>
                            <th className="p-2 text-center">รอง สว.</th>
                            <th className="p-2 text-center">ผบ.หมู่</th>
                            <th className="p-2 text-center bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">รวมตำแหน่ง</th>
                            <th className="p-2 text-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">คนครอง</th>
                            <th className="p-2 text-center">อัตราว่าง</th>
                            <th className="p-2 text-center">% ครอง</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {previewSectionUnits.slice(0, 8).map((u) => (
                            <tr key={u.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20">
                              <td className="p-2 text-center font-mono">{u.no}</td>
                              <td className="p-2 font-medium">{u.unitName}</td>
                              <td className="p-2 text-center font-mono">{u.ranks.pbg.positions}</td>
                              <td className="p-2 text-center font-mono">{u.ranks.pgk.positions}</td>
                              <td className="p-2 text-center font-mono">{u.ranks.sw.positions}</td>
                              <td className="p-2 text-center font-mono">{u.ranks.rsw.positions}</td>
                              <td className="p-2 text-center font-mono">{u.ranks.pbm.positions}</td>
                              <td className="p-2 text-center font-mono font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                                {u.grandTotal?.positions ?? 0}
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                                {u.grandTotal?.occupied ?? 0}
                              </td>
                              <td className="p-2 text-center font-mono text-red-500">{u.vacant}</td>
                              <td className="p-2 text-center font-mono font-semibold">{u.occupancyPercent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteOrgChartSync(orgChartSyncScope)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl hover:shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>
                        {orgChartSyncScope === 'all'
                          ? '⚡ ยืนยันนำเข้าข้อมูลจากตารางแผนผังโครงสร้าง (ครบ 126 แถว ทุกตาราง)'
                          : `⚡ ยืนยันนำเข้าข้อมูลสังกัด ${currentSection?.shortName || ''} (${previewSectionUnits.length} แถว)`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: EXCEL FILE UPLOAD */}
              {importTab === 'excel' && (
                <div className="space-y-4">
                  {/* File Upload Dropzone */}
                  {!excelPreview && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleExcelFileSelected(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                        isDraggingFile
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850 hover:bg-slate-100 hover:border-emerald-400'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleExcelFileSelected(file);
                        }}
                      />

                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>

                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {isLoadingFile ? 'กำลังวิเคราะห์ไฟล์ Excel...' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ Excel มาวางที่นี่'}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                        รองรับไฟล์ .xlsx, .xls และ .csv (สมบูรณ์แบบทั้งไฟล์รวมและไฟล์แยกชีท)
                      </p>

                      <div className="mt-4 flex items-center justify-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold shadow-2xs">
                          เลือกไฟล์จากเครื่อง
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {fileErrorMessage && (
                    <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{fileErrorMessage}</span>
                    </div>
                  )}

                  {/* Excel Analysis & Preview Result */}
                  {excelPreview && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/30">
                            ✓
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{excelPreview.fileName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                                ตรวจสอบโครงสร้างสำเร็จ
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ขนาด {excelPreview.fileSize} · ตรวจพบ {excelPreview.sheetsFound.length} แผ่นงาน ({excelPreview.sheetsFound.join(', ')})
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setExcelPreview(null)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          เปลี่ยนไฟล์
                        </button>
                      </div>

                      {/* Stat summary chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 block font-medium">จำนวนหน่วยงานที่พบ</span>
                          <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                            {excelPreview.totalUnits}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">หน่วย</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 block font-medium">ตำแหน่งทั้งหมด</span>
                          <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                            {excelPreview.totalPositions.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 block font-medium">คนครองจริง</span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {excelPreview.totalOccupied.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 block font-medium">อัตราครองจริง (%)</span>
                          <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {excelPreview.occupancyPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Scope selector */}
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                          เลือกขอบเขตการนำเข้าข้อมูล:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <label
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                              excelImportScope === 'all'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="excelScope"
                              checked={excelImportScope === 'all'}
                              onChange={() => setExcelImportScope('all')}
                              className="text-emerald-600"
                            />
                            <div>
                              <div className="text-xs">แทนที่ข้อมูลทั้งหมด (7 สังกัด)</div>
                              <div className="text-[10px] opacity-75">อัปเดตข้อมูลครบทุกแผ่นงาน</div>
                            </div>
                          </label>

                          <label
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                              excelImportScope === 'active'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="excelScope"
                              checked={excelImportScope === 'active'}
                              onChange={() => setExcelImportScope('active')}
                              className="text-emerald-600"
                            />
                            <div>
                              <div className="text-xs">
                                อัปเดตเฉพาะ {excelPreview.breakdown[excelPreviewSectionKey]?.shortName || currentSection?.shortName || 'สังกัดที่เลือก'}
                              </div>
                              <div className="text-[10px] opacity-75">คงข้อมูลสังกัดอื่นไว้เหมือนเดิม</div>
                            </div>
                          </label>

                          <label
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                              excelImportScope === 'append'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="excelScope"
                              checked={excelImportScope === 'append'}
                              onChange={() => setExcelImportScope('append')}
                              className="text-emerald-600"
                            />
                            <div>
                              <div className="text-xs">เพิ่มต่อท้าย (Append)</div>
                              <div className="text-[10px] opacity-75">ไม่ลบแถวเดิม เพิ่มแถวใหม่</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Interactive Section Selector & Mini Table Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            คลิกดูตัวอย่างข้อมูลที่แยกตามสังกัดในไฟล์ Excel:
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ สูตรและผลรวมถูกต้องตามระบบ ภ.9
                          </span>
                        </div>

                        {/* Section tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                          {Object.entries(excelPreview.breakdown).map(([k, info]) => {
                            const isSelected = excelPreviewSectionKey === k;
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => setExcelPreviewSectionKey(k)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span>{info.shortName}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                                    isSelected
                                      ? 'bg-emerald-700 text-emerald-100'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {info.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Mini Preview Table */}
                        {(() => {
                          const previewSec = excelPreview.sections.find((s) => s.key === excelPreviewSectionKey);
                          const sampleUnits = previewSec ? previewSec.units.slice(0, 5) : [];

                          return (
                            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px] text-left">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                      <th className="p-2 text-center w-10">ลำดับ</th>
                                      <th className="p-2">หน่วยงาน / สภ.</th>
                                      <th className="p-2 text-center">ผบก.</th>
                                      <th className="p-2 text-center">ผกก.</th>
                                      <th className="p-2 text-center">สว.</th>
                                      <th className="p-2 text-center">รอง สว.</th>
                                      <th className="p-2 text-center">ผบ.หมู่</th>
                                      <th className="p-2 text-center">รอง ผบ.หมู่</th>
                                      <th className="p-2 text-center bg-amber-50 dark:bg-amber-950/40">รวมตำแหน่ง</th>
                                      <th className="p-2 text-center bg-emerald-50 dark:bg-emerald-950/40">รวมคนครอง</th>
                                      <th className="p-2 text-center">ขาด/ว่าง</th>
                                      <th className="p-2 text-center">%ครอง</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                    {sampleUnits.map((u, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                        <td className="p-2 text-center text-slate-400 font-sans">{u.no}</td>
                                        <td className="p-2 font-sans font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                          {u.unitName}
                                        </td>
                                        <td className="p-2 text-center">{u.ranks.pbg.positions}/{u.ranks.pbg.occupied}</td>
                                        <td className="p-2 text-center">{u.ranks.pgk.positions}/{u.ranks.pgk.occupied}</td>
                                        <td className="p-2 text-center">{u.ranks.sw.positions}/{u.ranks.sw.occupied}</td>
                                        <td className="p-2 text-center">{u.ranks.rsw.positions}/{u.ranks.rsw.occupied}</td>
                                        <td className="p-2 text-center">{u.ranks.pbm.positions}/{u.ranks.pbm.occupied}</td>
                                        <td className="p-2 text-center">{u.ranks.rpbm.positions}/{u.ranks.rpbm.occupied}</td>
                                        <td className="p-2 text-center font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                                          {u.grandTotal?.positions ?? 0}
                                        </td>
                                        <td className="p-2 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                                          {u.grandTotal?.occupied ?? 0}
                                        </td>
                                        <td className="p-2 text-center text-rose-500 font-bold">
                                          {u.vacant ?? 0}
                                        </td>
                                        <td className="p-2 text-center font-bold text-blue-600">
                                          {u.occupancyPercent ?? 0}%
                                        </td>
                                      </tr>
                                    ))}
                                    {sampleUnits.length === 0 && (
                                      <tr>
                                        <td colSpan={12} className="p-4 text-center text-slate-400 font-sans">
                                          ไม่มีรายการในสังกัดนี้
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <div className="p-2 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 flex items-center justify-between">
                                <span>
                                  แสดงตัวอย่าง 5 แถวแรกจากทั้งหมด {previewSec?.units.length || 0} หน่วยงานในสังกัดนี้
                                </span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  ตัวเลขและคอลัมน์พร้อมสำหรับการนำเข้าทันที
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Template download helper card */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          ต้องการแม่แบบ Excel สำหรับกรอกข้อมูล?
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ดาวน์โหลดไฟล์ .xlsx ที่มีสูตรและแผ่นงานครบทุกสังกัด เพื่อนำไปกรอกในคอมพิวเตอร์
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleExportAllWorkbook}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold shrink-0 shadow-2xs"
                    >
                      ดาวน์โหลดแม่แบบ
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CSV TEXT INPUT */}
              {importTab === 'csv' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      วางข้อความ CSV ด้านล่าง:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPastedCSVText(`สถานภาพข้าราชการตำรวจ 3 จังหวัดชายแดนภาคใต้ และพื้นที่เสี่ยงภัยเฉพาะ 4 อำเภอในสังกัด ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,,
ลำดับ,หน่วยงาน,ผบก.,,รอง ผบก.,,ผกก.,,รอง ผกก.,,สว.,,รอง สว.,,รวมชั้นสัญญาบัตร,,รอง (ท.(ด.ต.53 ปี),,ผบ.หมู่,,ชั้นประทวน,,รอง ผบ.หมู่,,รวมทั้งหมด,
,,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง
,ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
1,กก.ปฏิบัติการพิเศษ ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
,บก.สืบสวนสอบสวน ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
1,บก.สืบสวนสอบสวน ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ บก.สส.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
3,กก.วิเคราะห์ข่าวและเครื่องมือพิเศษ บก.สส.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
4,กก.ปฏิบัติการพิเศษ บก.สส.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
5,กก.สืบสวน 1 บก.สส.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
6,กก.สืบสวน 2 บก.สส.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
7,กก.สืบสวน 3 บก.สส.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (บก.สืบสวนสอบสวน ภ.9),,,,,,,,,,,,,,,,,,,,,,,,
,บก.สืบสวนสอบสวน จชต.,,,,,,,,,,,,,,,,,,,,,,,,
1,บก.สืบสวนสอบสวน จชต.,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
3,กลุ่มงานสอบสวน บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
4,กก.เก็บกู้และตรวจสอบวัตถุระเบิด บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
5,กก.สืบสวนสอบสวน 1 บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
6,กก.สืบสวนสอบสวน 2 บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
7,กก.สืบสวนสอบสวน 3 บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
8,กก.ซักถาม 1 บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
9,กก.ซักถาม 2 บก.สส.จชต.,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (บก.สืบสวนสอบสวน จชต.),,,,,,,,,,,,,,,,,,,,,,,,
,ศฝร.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
1,ศฝร.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ ศฝร.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
3,ฝ่ายบริการการศึกษา ศฝร.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
4,ฝ่ายปกครองและการฝึก ศฝร.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
5,กลุ่มงานอาจารย์ ศฝร.ภ.9,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (ศฝร.ภ.9),,,,,,,,,,,,,,,,,,,,,,,,
,ภ.จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
1,ภ.จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ ภ.จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
3,กก.ปฏิบัติการพิเศษ ภ.จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
4,กก.สืบสวน ภ.จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
5,กลุ่มงานสอบสวน ภ.จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
6,สภ.เมืองยะลา จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
7,สภ.ลำใหม่ อ.เมือง จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
8,สภ.ยะหา จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
9,สภ.กาบัง จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
10,สภ.ปะแต อ.ยะหา จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
11,สภ.รามัน จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
12,สภ.โกตาบารู อ.รามัน จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
13,สภ.จะกว๊ะ อ.รามัน จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
14,สภ.ท่าธง อ.รามัน จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
15,สภ.บันนังสตา จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
16,สภ.บาตูตาโมง อ.บันนังสตา จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
17,สภ.ธารโต จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
18,สภ.แม่หวาด อ.ธารโต จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
19,สภ.เบตง จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
20,สภ.อัยเยอร์เวง อ.เบตง จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
21,สภ.ยะรม อ.เบตง จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
22,สภ.กรงปินัง จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
23,สภ.ตาเซะ จว.ยะลา,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (ภ.จว.ยะลา),,,,,,,,,,,,,,,,,,,,,,,,
,ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
1,ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
3,กก.ปฏิบัติการพิเศษ ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
4,กก.สืบสวน ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
5,กลุ่มงานสอบสวน ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
6,สภ.เมืองปัตตานี ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
7,สภ.นาประดู่ อ.โคกโพธิ์ ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
8,สภ.สายบุรี ภ.จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
9,สภ.โคกโพธิ์ จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
10,สภ.แม่ลาน จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
11,สภ.มายอ จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
12,สภ.ปะนาเระ จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
13,สภ.ยะรัง จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
14,สภ.บ้านโสร่ง อ.ยะรัง จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
15,สภ.ยะหริ่ง จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
16,สภ.ราตาปันยัง อ.ยะหริ่ง จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
17,สภ.หนองจิก จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
18,สภ.ไม้แก่น จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
19,สภ.ทุ่งยางแดง จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
20,สภ.กะพ้อ จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
21,สภ.ตุยง จว.ปัตตานี,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (ภ.จว.ปัตตานี),,,,,,,,,,,,,,,,,,,,,,,,
,ภ.จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
1,ภ.จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ ภ.จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
3,กก.ปฏิบัติการพิเศษ ภ.จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
4,กก.สืบสวน ภ.จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
5,กลุ่มงานสอบสวน ภ.จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
6,สภ.เมืองนราธิวาส จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
7,สภ.โคกเคียน อ.เมือง จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
8,สภ.ตันหยง อ.เมือง จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
9,สภ.ยี่งอ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
10,สภ.บาเจาะ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
11,สภ.ปะลุกาสาเมาะ อ.บาเจาะ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
12,สภ.รือเสาะ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
13,สภ.ระแงะ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
14,สภ.สุไหงปาดี จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
15,สภ.สากอ อ.สุไหงปาดี จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
16,สภ.สุไหงโก-ลก จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
17,สภ.มูโนะ อ.สุไหงโก-ลก จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
18,สภ.ตากใบ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
19,สภ.แว้ง จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
20,สภ.บูเก๊ะตา อ.แว้ง จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
21,สภ.สุคิริน จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
22,สภ.ศรีสาคร จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
23,สภ.จะแนะ จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
24,สภ.เจาะไอร้อง จว.นราธิวาส,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (ภ.จว.นราธิวาส),,,,,,,,,,,,,,,,,,,,,,,,
,ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
1,ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
2,ฝ่ายอำนวยการ ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
3,กก.ปฏิบัติการพิเศษ ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
4,กก.สืบสวน ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
5,กลุ่มงานสอบสวน ภ.จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
6,สภ.เมืองสงขลา จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
7,สภ.ม่วงงาม อ.สิงหนคร จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
8,สภ.ระโนด จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
9,สภ.คลองแดน อ.ระโนด จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
10,สภ.สามบ่อ อ.ระโนด จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
11,สภ.สทิงพระ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
12,สภ.ชุมพล อ.สทิงพระ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
13,สภ.กระแสสินธุ์ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
14,สภ.สิงหนคร จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
15,สภ.ปากรอ อ.สิงหนคร จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
16,สภ.หาดใหญ่ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
17,สภ.ทุ่งตำเสา อ.หาดใหญ่ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
18,สภ.ทุ่งลุง อ.หาดใหญ่ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
19,สภ.คูเต่า อ.หาดใหญ่ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
20,สภ.รัตภูมิ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
21,สภ.นาหม่อม จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
22,สภ.ควนเนียง จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
23,สภ.บางกล่ำ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
24,สภ.นาทวี จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
25,สภ.สะท้อน อ.นาทวี จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
26,สภ.เทพา จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
27,สภ.ห้วยปลิง อ.เทพา จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
28,สภ.สะบ้าย้อย จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
29,สภ.บ้านโหนด อ.สะบ้าย้อย จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
30,สภ.จะนะ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
31,สภ.ควนมีด อ.จะนะ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
32,สภ.สะเดา จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
33,สภ.ปาดังเบซาร์ อ.สะเดา จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
34,สภ.คลองแงะ อ.สะเดา จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
35,สภ.คอหงส์ จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
36,สภ.คลองหอยโข่ง จว.สงขลา,,,,,,,,,,,,,,,,,,,,,,,,
,รวม (ภ.จว.สงขลา),,,,,,,,,,,,,,,,,,,,,,,,
,รวมทั้งหมด,,,,,,,,,,,,,,,,,,,,,,,,`);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>เติมข้อความตัวอย่าง 3 จชต. ทันที</span>
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={pastedCSVText}
                    onChange={(e) => setPastedCSVText(e.target.value)}
                    placeholder="วางข้อมูล CSV เช่น:&#10;ลำดับ,หน่วยงาน,ผบก.,,...&#10;1,กก.ปฏิบัติการพิเศษ ภ.9,..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {importTab === 'excel'
                  ? excelPreview
                    ? `พร้อมนำเข้า ${excelPreview.totalUnits} หน่วยงาน`
                    : 'เลือกไฟล์ .xlsx หรือ .xls'
                  : 'ประมวลผลแยกชีทและคำนวณผลรวมอัตโนมัติ'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setExcelPreview(null);
                    setFileErrorMessage(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer font-semibold"
                >
                  ยกเลิก
                </button>

                {importTab === 'excel' ? (
                  <button
                    type="button"
                    disabled={!excelPreview}
                    onClick={handleApplyExcelImport}
                    className={`px-5 py-2 rounded-xl font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 ${
                      excelPreview
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>ยืนยันนำเข้าข้อมูล Excel</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleImportCSVSubmit}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>ประมวลผลและนำเข้า</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 7. MODAL: CLEAR / DELETE ALL DATA CONFIRMATION */}
      {isClearConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-rose-100 dark:border-rose-950/60 bg-gradient-to-r from-rose-50 dark:from-rose-950/40 via-transparent to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 font-['Prompt',sans-serif]">
                    ยืนยันการลบข้อมูลตาราง ภ.ใต้
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ล้างข้อมูลหน่วยงานเพื่อเตรียมนำเข้าข้อมูลชุดใหม่
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsClearConfirmModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Warning Banner */}
              <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">คำเตือน: ข้อมูลจะถูกล้างออกจากระบบ</div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    หลังยืนยัน ตารางจะว่างเปล่า (0 หน่วยงาน) สามารถเริ่มกรอกใหม่ นำเข้าไฟล์ Excel ใหม่ หรือกดปุ่ม "คืนค่าเริ่มต้น" ได้ตลอดเวลา
                  </div>
                </div>
              </div>

              {/* Scope Options */}
              <div className="space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  เลือกขอบเขตที่ต้องการลบ:
                </div>

                <label
                  className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    clearTargetScope === 'all'
                      ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearScope"
                    checked={clearTargetScope === 'all'}
                    onChange={() => setClearTargetScope('all')}
                    className="text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      ลบข้อมูลทุกสังกัด (ครบทั้ง 7 สังกัด)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ล้างข้อมูลทั้ง 98 หน่วยงานในระบบทั้งหมด ตารางจะว่างเปล่า 100%
                    </div>
                  </div>
                </label>

                {currentSection && (
                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      clearTargetScope === 'active'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearTargetScope === 'active'}
                      onChange={() => setClearTargetScope('active')}
                      className="text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ลบเฉพาะสังกัด "{currentSection.shortName}" ({currentSection.units.length} หน่วย)
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        คงข้อมูลของสังกัดอื่นอีก 6 สังกัดไว้เหมือนเดิม
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold text-xs"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleExecuteClearData}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md hover:shadow-rose-600/30 flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {clearTargetScope === 'all'
                    ? 'ยืนยันลบข้อมูลทั้งหมด'
                    : `ยืนยันลบสังกัด ${currentSection?.shortName || ''}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
