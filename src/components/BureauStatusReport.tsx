/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PoliceOfficer } from '../types/personnel';
import { AppTheme } from '../data/themes';
import { MatrixDisplayMode, BureauMatrixRow, MatrixCellData } from '../types/bureauReport';
import {
  buildBureauStatusReport,
  generateBureauMatrixTSV,
  exportBureauMatrixToExcel,
  createEmptyCell,
} from '../utils/bureauReportGenerator';
import { generateRealisticBureauData } from '../data/bureauSampleData';
import { BureauMatrixCellModal } from './BureauMatrixCellModal';
import { OfficialBureauPrintModal } from './OfficialBureauPrintModal';
import {
  Shield,
  Building2,
  FileSpreadsheet,
  Printer,
  Copy,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Info,
  ChevronDown,
  Eye,
  SlidersHorizontal,
  FolderTree,
  Activity,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

interface BureauStatusReportProps {
  officers: PoliceOfficer[];
  onViewOfficer: (officer: PoliceOfficer) => void;
  onEditOfficer: (officer: PoliceOfficer) => void;
  onAddOfficerPreset?: (preset: Partial<PoliceOfficer>) => void;
  onImportSampleOfficers?: (sampleOfficers: PoliceOfficer[]) => void;
  currentTheme: AppTheme;
  isPastelTheme?: boolean;
  onShowToast: (msg: string) => void;
}

export const BureauStatusReport: React.FC<BureauStatusReportProps> = ({
  officers,
  onViewOfficer,
  onEditOfficer,
  onAddOfficerPreset,
  onImportSampleOfficers,
  currentTheme,
  isPastelTheme = false,
  onShowToast,
}) => {
  // State filters
  const [selectedBureau, setSelectedBureau] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedJobGroup, setSelectedJobGroup] = useState<string>('all');
  const [commissionFilter, setCommissionFilter] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<MatrixDisplayMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyVacantRows, setOnlyVacantRows] = useState(false);

  // Drilldown modal state
  const [inspectedCell, setInspectedCell] = useState<{
    title: string;
    subtitle: string;
    data: MatrixCellData;
    preset?: Partial<PoliceOfficer>;
  } | null>(null);

  // Official print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Auto-detect default bureau if only 1 bureau exists
  const detectedBureaus = useMemo(() => {
    const s = new Set<string>();
    officers.forEach((o) => {
      if (o.bureau) s.add(o.bureau.trim());
    });
    return Array.from(s).sort();
  }, [officers]);

  // Compute report data
  const reportData = useMemo(() => {
    return buildBureauStatusReport(officers, {
      bureau: selectedBureau,
      division: selectedDivision,
      jobGroup: selectedJobGroup,
      commissionType: commissionFilter,
    });
  }, [officers, selectedBureau, selectedDivision, selectedJobGroup, commissionFilter]);

  // Filter rows based on search query or vacant filter
  const displayedRows = useMemo(() => {
    return reportData.rows.filter((row) => {
      if (onlyVacantRows && row.rowTotal.vacant === 0) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.jobLine.toLowerCase().includes(q) ||
        row.jobGroup.toLowerCase().includes(q)
      );
    });
  }, [reportData.rows, searchQuery, onlyVacantRows]);

  // Rank position levels by vacancies for analytical insights
  const topVacancyLevels = useMemo(() => {
    return reportData.levels
      .map((lvl) => ({
        level: lvl,
        vacant: reportData.colTotals[lvl]?.vacant || 0,
        authorized: reportData.colTotals[lvl]?.authorized || 0,
        rate: reportData.colTotals[lvl]?.authorized
          ? Math.round(
              ((reportData.colTotals[lvl].vacant || 0) /
                reportData.colTotals[lvl].authorized) *
                100
            )
          : 0,
      }))
      .filter((x) => x.authorized > 0)
      .sort((a, b) => b.vacant - a.vacant);
  }, [reportData]);

  // Handler for Excel Export
  const handleExportExcel = () => {
    const title =
      selectedBureau === 'all'
        ? 'ภาพรวมทุก บช.'
        : `กองบัญชาการ ${selectedBureau}`;
    exportBureauMatrixToExcel(reportData, title);
    onShowToast(`📥 ดาวน์โหลดรายงานสถานภาพ Excel (${title}) สำเร็จ`);
  };

  // Handler for Clipboard copy
  const handleCopyTSV = () => {
    try {
      const tsv = generateBureauMatrixTSV(reportData, displayMode);
      navigator.clipboard.writeText(tsv);
      onShowToast('📋 คัดลอกตารางเมทริกซ์สถานภาพลงคลิปบอร์ดแล้ว (นำไปวางใน Excel ได้ทันที)');
    } catch (e) {
      onShowToast('เกิดข้อผิดพลาดในการคัดลอกตาราง');
    }
  };

  // Handler for loading sample bureau data
  const handleLoadSampleData = () => {
    const sample = generateRealisticBureauData();
    if (onImportSampleOfficers) {
      onImportSampleOfficers(sample);
      onShowToast(`✨ นำเข้าชุดข้อมูลจำลองระดับ บช. (${sample.length} อัตรา 4 บช.) เรียบร้อย`);
    }
  };

  // Label for current Bureau selection
  const currentBureauTitle =
    selectedBureau === 'all'
      ? 'ทุกกองบัญชาการ (ภาพรวม ตร.)'
      : `กองบัญชาการ ${selectedBureau}`;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header Banner & Title */}
      <div className={`p-6 rounded-2xl border ${
        isPastelTheme
          ? 'bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-amber-50/80 border-slate-200 shadow-sm'
          : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-lg'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-2xl shadow-md shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-500 border border-amber-400/40">
                  ระบบรายงานกำลังพลระดับ บช.
                </span>
                <span className={`text-xs ${isPastelTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                  (Cross-Tabulation Matrix: สายงาน × ระดับตำแหน่ง)
                </span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold font-['Chakra_Petch',sans-serif] mt-1 ${currentTheme.textMain}`}>
                รายงานสถานภาพแยกสายงาน - ระดับตำแหน่ง ({currentBureauTitle})
              </h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${currentTheme.textMuted}`}>
                วิเคราะห์และตรวจสอบกรอบอัตรากำลัง คนครอง อัตราว่าง และร้อยละการครองตำแหน่ง จำแนกตามสายงานและระดับตำแหน่งของกองบัญชาการ
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={handleCopyTSV}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                isPastelTheme
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
              }`}
              title="คัดลอกตารางไปวางในโปรแกรม Excel หรือ Word"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>คัดลอกตาราง</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 rounded-xl shadow-xs transition-all cursor-pointer"
              title="ส่งออกรายงานในรูปแบบ Microsoft Excel พร้อมตารางสรุปและบัญชีรายชื่อ"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ส่งออก Excel</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl shadow-xs transition-all cursor-pointer"
              title="เปิดมุมมองพิมพ์รายงานทางการ (A4 แนวนอน พร้อมตราโล่เขน ตร.)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงานราชการ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Authorized */}
        <div className={`p-4 rounded-xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>กรอบอัตราอนุมัติ</span>
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {reportData.grandTotal.authorized.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ตำแหน่งตามกรอบ</div>
        </div>

        {/* Total Occupied */}
        <div className={`p-4 rounded-xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-emerald-400 font-semibold">คนครองจริง</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {reportData.grandTotal.occupied.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-500 mt-1">
            {reportData.grandTotal.fillRate}% ของกรอบ
          </div>
        </div>

        {/* Total Vacant */}
        <div className={`p-4 rounded-xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-red-400 font-semibold">ตำแหน่งว่าง</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-red-400">
            {reportData.grandTotal.vacant.toLocaleString()}
          </div>
          <div className="text-[11px] text-red-400/80 mt-1">
            {reportData.grandTotal.authorized > 0
              ? `${Math.round((reportData.grandTotal.vacant / reportData.grandTotal.authorized) * 1000) / 10}% ของกรอบ`
              : '0%'}
          </div>
        </div>

        {/* Fill Percentage */}
        <div className={`p-4 rounded-xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>% การครองตำแหน่ง</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
            {reportData.grandTotal.fillRate}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(reportData.grandTotal.fillRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Commissioned Ratio */}
        <div className={`p-4 rounded-xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>สัญญาบัตร</span>
            <span className="text-[10px] px-1.5 rounded bg-blue-500/20 text-blue-300">ร.ต.ต. ขึ้นไป</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-200">
            {reportData.grandTotal.commissioned.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ครอง {reportData.grandTotal.commissioned} นาย
          </div>
        </div>

        {/* Non-Commissioned Ratio */}
        <div className={`p-4 rounded-xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>ชั้นประทวน</span>
            <span className="text-[10px] px-1.5 rounded bg-emerald-500/20 text-emerald-300">ผบ.หมู่ / ด.ต.</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-200">
            {reportData.grandTotal.nonCommissioned.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ครอง {reportData.grandTotal.nonCommissioned} นาย
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Filters & View Controls Bar */}
      <div className={`p-4 rounded-2xl border ${
        isPastelTheme ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left: Bureau & Hierarchy Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bureau Selector (ระดับ บช.) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 whitespace-nowrap flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                ระดับ บช.:
              </span>
              <select
                value={selectedBureau}
                onChange={(e) => {
                  setSelectedBureau(e.target.value);
                  setSelectedDivision('all');
                }}
                className={`text-xs font-semibold py-1.5 px-3 rounded-xl border focus:outline-hidden focus:border-amber-400 cursor-pointer ${
                  isPastelTheme
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-slate-800 border-slate-700 text-slate-100'
                }`}
              >
                <option value="all">🌐 ทุกกองบัญชาการ (ภาพรวม ตร.)</option>
                {reportData.allBureaus.map((b) => (
                  <option key={b} value={b}>
                    🏛️ กองบัญชาการ {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Division Selector (ระดับ บก.) */}
            {reportData.allDivisions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                  บก./กอง:
                </span>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className={`text-xs py-1.5 px-3 rounded-xl border focus:outline-hidden focus:border-amber-400 cursor-pointer ${
                    isPastelTheme
                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <option value="all">ทุก บก. / หน่วยงานในสังกัด</option>
                  {reportData.allDivisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Commission Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                ชั้นยศ:
              </span>
              <select
                value={commissionFilter}
                onChange={(e) => setCommissionFilter(e.target.value)}
                className={`text-xs py-1.5 px-3 rounded-xl border focus:outline-hidden focus:border-amber-400 cursor-pointer ${
                  isPastelTheme
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">สัญญาบัตร & ประทวน</option>
                <option value="สัญญาบัตร">เฉพาะสัญญาบัตร</option>
                <option value="ประทวน">เฉพาะประทวน</option>
              </select>
            </div>
          </div>

          {/* Right: Display Mode Selector & Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Display Mode Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setDisplayMode('all')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'all'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงครบ: กรอบ / ครอง / ว่าง"
              >
                กรอบ/ครอง/ว่าง
              </button>
              <button
                onClick={() => setDisplayMode('occupied')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'occupied'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงเฉพาะจำนวนคนครอง"
              >
                คนครอง
              </button>
              <button
                onClick={() => setDisplayMode('vacant')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'vacant'
                    ? 'bg-red-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงเฉพาะตำแหน่งว่าง"
              >
                ตำแหน่งว่าง
              </button>
              <button
                onClick={() => setDisplayMode('percentage')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'percentage'
                    ? 'bg-blue-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงร้อยละการครองตำแหน่ง"
              >
                % การครอง
              </button>
              <button
                onClick={() => setDisplayMode('compact')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'compact'
                    ? 'bg-purple-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงกล่องสถิติย่อย"
              >
                กล่องย่อย
              </button>
            </div>

            {/* Search Job Line */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาสายงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`text-xs pl-8 pr-3 py-1.5 rounded-xl border focus:outline-hidden focus:border-amber-400 w-36 sm:w-44 ${
                  isPastelTheme
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              />
            </div>

            {/* Toggle Only Vacant */}
            <button
              onClick={() => setOnlyVacantRows(!onlyVacantRows)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-colors cursor-pointer ${
                onlyVacantRows
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span>เฉพาะสายงานที่มีอัตราว่าง</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Empty State with Sample Data Generator */}
      {officers.length === 0 ? (
        <div className={`p-10 text-center rounded-2xl border ${
          isPastelTheme ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-['Chakra_Petch',sans-serif] text-slate-100">
            ยังไม่มีข้อมูลกำลังพลในระบบ
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-2 mb-6">
            คุณสามารถกดโหลดชุดข้อมูลตัวอย่างระดับกองบัญชาการ (สกพ. / บช.น. / ภ.1 / บช.ก.)
            เพื่อทดสอบการทำงานของฟังก์ชันรายงานสถานภาพแยกสายงาน-ระดับตำแหน่งได้ทันที หรือนำเข้าข้อมูลจริงจากเมนูอัปเดต/ส่งออก
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleLoadSampleData}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 hover:from-amber-300 hover:to-amber-200 shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>โหลดข้อมูลตัวอย่างระดับ บช. อัตโนมัติ</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 5. The 2D Pivot Matrix Table */}
          <div className={`rounded-2xl border overflow-hidden shadow-lg ${
            isPastelTheme ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {/* Table Header Bar */}
            <div className="px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="font-bold text-sm text-slate-200 font-['Chakra_Petch',sans-serif]">
                  ตารางเมทริกซ์สถานภาพอัตรากำลังพล: สายงาน × ระดับตำแหน่ง ({currentBureauTitle})
                </h3>
                <span className="text-xs text-slate-400">
                  · {displayedRows.length} สายงาน · {reportData.levels.length} ระดับตำแหน่ง
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">คลิกที่ช่องใดๆ ในตารางเพื่อดูรายชื่อข้าราชการตำรวจและตำแหน่งว่างในช่องนั้น</span>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  {/* Top Level Headers */}
                  <tr className="bg-slate-800/95 text-slate-200 border-b border-slate-700">
                    <th className="py-3 px-3 w-10 text-center font-bold border-r border-slate-700/80">
                      ที่
                    </th>
                    <th className="py-3 px-4 min-w-[200px] font-bold border-r border-slate-700/80">
                      สายงาน (Job Line)
                    </th>
                    {reportData.levels.map((lvl) => (
                      <th
                        key={lvl}
                        className="py-3 px-2 text-center font-bold border-r border-slate-700/80 whitespace-nowrap min-w-[76px]"
                      >
                        <div className="text-amber-300 font-semibold">{lvl}</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center font-bold bg-slate-850 border-r border-slate-700/80 whitespace-nowrap">
                      รวมกรอบ
                    </th>
                    <th className="py-3 px-3 text-center font-bold bg-slate-850 border-r border-slate-700/80 text-emerald-400 whitespace-nowrap">
                      รวมครอง
                    </th>
                    <th className="py-3 px-3 text-center font-bold bg-slate-850 border-r border-slate-700/80 text-red-400 whitespace-nowrap">
                      รวมว่าง
                    </th>
                    <th className="py-3 px-3 text-center font-bold bg-slate-850 text-blue-400 whitespace-nowrap">
                      % ครอง
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={reportData.levels.length + 6}
                        className="py-8 text-center text-slate-500"
                      >
                        ไม่พบสายงานที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row, rIdx) => {
                      const isEven = rIdx % 2 === 0;
                      return (
                        <tr
                          key={row.jobLine}
                          className={`hover:bg-amber-400/5 transition-colors ${
                            isEven ? 'bg-slate-900/40' : 'bg-slate-900/90'
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-800">
                            {rIdx + 1}
                          </td>

                          {/* Job Line Name */}
                          <td className="py-2.5 px-4 font-semibold text-slate-200 border-r border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span>{row.jobLine}</span>
                              {row.rowTotal.vacant > 0 && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" title={`มีตำแหน่งว่าง ${row.rowTotal.vacant} อัตรา`} />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              กลุ่ม: {row.jobGroup}
                            </div>
                          </td>

                          {/* Level Cells */}
                          {reportData.levels.map((lvl) => {
                            const cell = row.cells[lvl] || createEmptyCell();
                            const hasAuth = cell.authorized > 0;
                            const hasVacant = cell.vacant > 0;

                            return (
                              <td
                                key={`${row.jobLine}-${lvl}`}
                                onClick={() => {
                                  if (hasAuth) {
                                    setInspectedCell({
                                      title: `${row.jobLine} · ระดับ ${lvl}`,
                                      subtitle: `กองบัญชาการ: ${currentBureauTitle}`,
                                      data: cell,
                                      preset: {
                                        bureau: selectedBureau === 'all' ? 'สกพ.' : selectedBureau,
                                        division: selectedDivision === 'all' ? undefined : selectedDivision,
                                        jobLine: row.jobLine,
                                        jobGroup: row.jobGroup,
                                        positionLevel: lvl,
                                      },
                                    });
                                  }
                                }}
                                className={`py-2 px-1 text-center font-mono border-r border-slate-800 transition-all ${
                                  hasAuth
                                    ? 'cursor-pointer hover:bg-amber-400/20 hover:scale-[1.02]'
                                    : 'text-slate-600 bg-slate-950/20'
                                } ${
                                  hasVacant && displayMode !== 'occupied'
                                    ? 'bg-red-500/10'
                                    : ''
                                }`}
                                title={
                                  hasAuth
                                    ? `${row.jobLine} (${lvl}): กรอบ ${cell.authorized}, ครอง ${cell.occupied}, ว่าง ${cell.vacant} (คลิกดูรายชื่อ)`
                                    : 'ไม่มีกรอบในระดับนี้'
                                }
                              >
                                {!hasAuth ? (
                                  <span className="text-slate-700">-</span>
                                ) : displayMode === 'occupied' ? (
                                  <span className="text-emerald-400 font-semibold text-xs">
                                    {cell.occupied}
                                  </span>
                                ) : displayMode === 'vacant' ? (
                                  <span
                                    className={`font-semibold text-xs ${
                                      cell.vacant > 0 ? 'text-red-400 font-bold' : 'text-slate-500'
                                    }`}
                                  >
                                    {cell.vacant}
                                  </span>
                                ) : displayMode === 'percentage' ? (
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      cell.fillRate >= 100
                                        ? 'text-emerald-400'
                                        : cell.fillRate >= 75
                                        ? 'text-blue-400'
                                        : 'text-amber-400'
                                    }`}
                                  >
                                    {cell.fillRate}%
                                  </span>
                                ) : displayMode === 'compact' ? (
                                  <div className="flex flex-col gap-0.5 text-[9px] leading-tight">
                                    <span className="text-slate-400">ก:{cell.authorized}</span>
                                    <span className="text-emerald-400">ค:{cell.occupied}</span>
                                    {cell.vacant > 0 ? (
                                      <span className="text-red-400 font-bold">ว:{cell.vacant}</span>
                                    ) : (
                                      <span className="text-slate-600">ว:0</span>
                                    )}
                                  </div>
                                ) : (
                                  // Default 'all' format: 10 / 8 / 2
                                  <div className="inline-flex items-center justify-center gap-0.5 text-[11px]">
                                    <span className="text-slate-300 font-bold">{cell.authorized}</span>
                                    <span className="text-slate-600">/</span>
                                    <span className="text-emerald-400 font-medium">{cell.occupied}</span>
                                    <span className="text-slate-600">/</span>
                                    <span
                                      className={`font-bold ${
                                        cell.vacant > 0 ? 'text-red-400' : 'text-slate-500'
                                      }`}
                                    >
                                      {cell.vacant}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Row Summary: Authorized */}
                          <td
                            onClick={() => {
                              if (row.rowTotal.authorized > 0) {
                                setInspectedCell({
                                  title: `สรุปสายงาน: ${row.jobLine}`,
                                  subtitle: `รวมทุกระดับตำแหน่ง · กองบัญชาการ: ${currentBureauTitle}`,
                                  data: row.rowTotal,
                                });
                              }
                            }}
                            className="py-2.5 px-3 text-center font-mono font-bold text-slate-100 bg-slate-950/40 border-r border-slate-800 cursor-pointer hover:bg-amber-400/20"
                          >
                            {row.rowTotal.authorized}
                          </td>

                          {/* Row Summary: Occupied */}
                          <td
                            onClick={() => {
                              if (row.rowTotal.authorized > 0) {
                                setInspectedCell({
                                  title: `สรุปสายงาน: ${row.jobLine} (คนครอง)`,
                                  subtitle: `รวมทุกระดับตำแหน่ง · กองบัญชาการ: ${currentBureauTitle}`,
                                  data: row.rowTotal,
                                });
                              }
                            }}
                            className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400 bg-slate-950/40 border-r border-slate-800 cursor-pointer hover:bg-emerald-500/20"
                          >
                            {row.rowTotal.occupied}
                          </td>

                          {/* Row Summary: Vacant */}
                          <td
                            onClick={() => {
                              if (row.rowTotal.authorized > 0) {
                                setInspectedCell({
                                  title: `สรุปสายงาน: ${row.jobLine} (ตำแหน่งว่าง)`,
                                  subtitle: `รวมทุกระดับตำแหน่ง · กองบัญชาการ: ${currentBureauTitle}`,
                                  data: row.rowTotal,
                                });
                              }
                            }}
                            className={`py-2.5 px-3 text-center font-mono font-bold bg-slate-950/40 border-r border-slate-800 cursor-pointer hover:bg-red-500/20 ${
                              row.rowTotal.vacant > 0 ? 'text-red-400' : 'text-slate-500'
                            }`}
                          >
                            {row.rowTotal.vacant}
                          </td>

                          {/* Row Summary: Percentage */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-400 bg-slate-950/40">
                            {row.rowTotal.fillRate}%
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-950 text-slate-100 font-bold border-t-2 border-amber-400/60">
                    <td className="py-3 px-3 text-center text-amber-400 border-r border-slate-800">
                      ★
                    </td>
                    <td className="py-3 px-4 text-amber-400 font-bold font-['Chakra_Petch',sans-serif] border-r border-slate-800">
                      รวมทุกสายงานทั้งสิ้น
                    </td>

                    {reportData.levels.map((lvl) => {
                      const col = reportData.colTotals[lvl] || createEmptyCell();
                      return (
                        <td
                          key={`total-${lvl}`}
                          onClick={() => {
                            if (col.authorized > 0) {
                              setInspectedCell({
                                title: `รวมทุกสายงาน · ระดับตำแหน่ง ${lvl}`,
                                subtitle: `กองบัญชาการ: ${currentBureauTitle}`,
                                data: col,
                              });
                            }
                          }}
                          className="py-3 px-1 text-center font-mono border-r border-slate-800 cursor-pointer hover:bg-amber-400/20"
                          title={`รวมระดับ ${lvl}: กรอบ ${col.authorized}, ครอง ${col.occupied}, ว่าง ${col.vacant}`}
                        >
                          {col.authorized === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : displayMode === 'occupied' ? (
                            <span className="text-emerald-400 text-xs">{col.occupied}</span>
                          ) : displayMode === 'vacant' ? (
                            <span className="text-red-400 text-xs">{col.vacant}</span>
                          ) : displayMode === 'percentage' ? (
                            <span className="text-blue-400 text-xs">{col.fillRate}%</span>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-0.5 text-[11px]">
                              <span className="text-slate-200">{col.authorized}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-emerald-400">{col.occupied}</span>
                              <span className="text-slate-600">/</span>
                              <span className={col.vacant > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                {col.vacant}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Grand Total Columns */}
                    <td
                      onClick={() => {
                        setInspectedCell({
                          title: `ภาพรวมกำลังพลทั้งหมดทั้งสิ้น`,
                          subtitle: `กองบัญชาการ: ${currentBureauTitle}`,
                          data: reportData.grandTotal,
                        });
                      }}
                      className="py-3 px-3 text-center font-mono font-bold text-amber-300 bg-amber-400/10 border-r border-slate-800 cursor-pointer hover:bg-amber-400/20"
                    >
                      {reportData.grandTotal.authorized}
                    </td>
                    <td
                      onClick={() => {
                        setInspectedCell({
                          title: `ภาพรวมกำลังพลมีตัวจริง (คนครอง)`,
                          subtitle: `กองบัญชาการ: ${currentBureauTitle}`,
                          data: reportData.grandTotal,
                        });
                      }}
                      className="py-3 px-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/10 border-r border-slate-800 cursor-pointer hover:bg-emerald-500/20"
                    >
                      {reportData.grandTotal.occupied}
                    </td>
                    <td
                      onClick={() => {
                        setInspectedCell({
                          title: `ภาพรวมตำแหน่งว่างทั้งหมด`,
                          subtitle: `กองบัญชาการ: ${currentBureauTitle}`,
                          data: reportData.grandTotal,
                        });
                      }}
                      className="py-3 px-3 text-center font-mono font-bold text-red-400 bg-red-500/10 border-r border-slate-800 cursor-pointer hover:bg-red-500/20"
                    >
                      {reportData.grandTotal.vacant}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-400 bg-blue-500/10">
                      {reportData.grandTotal.fillRate}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Footnote / Guide */}
            <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-300">คำอธิบายรูปแบบเซลล์:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-slate-300 font-bold">10</span>
                  <span className="text-slate-500">= กรอบอัตรา</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-emerald-400 font-bold">8</span>
                  <span className="text-slate-500">= คนครอง</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-red-400 font-bold">2</span>
                  <span className="text-slate-500">= ตำแหน่งว่าง</span>
                </span>
              </div>

              <div>
                ข้อมูลปรับปรุงล่าสุด: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </div>
            </div>
          </div>

          {/* 6. Analytical Visuals & Vacancy Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual 1: Vacancy Hotspots by Position Level */}
            <div className={`p-5 rounded-2xl border ${
              isPastelTheme ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-200 font-['Chakra_Petch',sans-serif]">
                    วิเคราะห์ตำแหน่งว่าง แยกตามระดับตำแหน่ง (Vacancy Analysis)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  รวมว่าง {reportData.grandTotal.vacant} อัตรา
                </span>
              </div>

              <div className="space-y-2.5">
                {topVacancyLevels.slice(0, 7).map(({ level, vacant, authorized, rate }) => (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{level}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-red-400 font-bold">ว่าง {vacant} อัตรา</span>
                        <span className="text-slate-500">/ กรอบ {authorized} ({rate}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${Math.max(0, 100 - rate)}%` }}
                        title="คนครอง"
                      />
                      <div
                        className="bg-red-500 h-full"
                        style={{ width: `${Math.min(rate, 100)}%` }}
                        title="ว่าง"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual 2: Fill Rate by Major Job Line */}
            <div className={`p-5 rounded-2xl border ${
              isPastelTheme ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-slate-200 font-['Chakra_Petch',sans-serif]">
                    สัดส่วนการครองตำแหน่งตามสายงาน (% Fill Rate by Job Line)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  เฉลี่ย {reportData.grandTotal.fillRate}%
                </span>
              </div>

              <div className="space-y-2.5">
                {reportData.rows.slice(0, 7).map((r) => (
                  <div key={r.jobLine} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate max-w-[200px]" title={r.jobLine}>
                        {r.jobLine}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-emerald-400 font-bold">ครอง {r.rowTotal.occupied}</span>
                        <span className="text-slate-500">/ กรอบ {r.rowTotal.authorized}</span>
                        <span className="text-blue-400 font-bold ml-1">{r.rowTotal.fillRate}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          r.rowTotal.fillRate >= 90
                            ? 'bg-emerald-500'
                            : r.rowTotal.fillRate >= 70
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(r.rowTotal.fillRate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 7. Drill-down Cell Inspection Modal */}
      {inspectedCell && (
        <BureauMatrixCellModal
          isOpen={true}
          onClose={() => setInspectedCell(null)}
          title={inspectedCell.title}
          subtitle={inspectedCell.subtitle}
          cellData={inspectedCell.data}
          onViewOfficer={onViewOfficer}
          onEditOfficer={onEditOfficer}
          onAddOfficerPreset={
            onAddOfficerPreset
              ? () => {
                  if (inspectedCell.preset) {
                    onAddOfficerPreset(inspectedCell.preset);
                  }
                }
              : undefined
          }
        />
      )}

      {/* 8. Official Bureau Printable Report Modal */}
      <OfficialBureauPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        report={reportData}
        bureauName={currentBureauTitle}
      />
    </div>
  );
};
