/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PoliceOfficer } from '../types/personnel';
import { AppTheme } from '../data/themes';
import {
  RTP_BUREAUS_DATA,
  getAllDivisionsFlat,
  DivisionItem,
  PoliceBureauNode,
  PoliceGroup,
  getOfficersForDivision
} from '../data/rtpStructure';
import * as XLSX from 'xlsx';
import {
  Building2,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  ArrowRight,
  ExternalLink,
  Users,
  UserCheck,
  UserX,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  Briefcase,
  Crosshair,
  GraduationCap
} from 'lucide-react';

interface DivisionsDirectoryTableProps {
  officers: PoliceOfficer[];
  onOpenDivisionDetail: (divisionRawName: string, bureau: PoliceBureauNode) => void;
  onAddOfficerToDivision: (division: string, subDiv: string) => void;
  onOpenInMainTable: (division: string) => void;
  currentTheme: AppTheme;
}

export const DivisionsDirectoryTable: React.FC<DivisionsDirectoryTableProps> = ({
  officers,
  onOpenDivisionDetail,
  onAddOfficerToDivision,
  onOpenInMainTable,
  currentTheme,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBureau, setSelectedBureau] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<PoliceGroup>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_officers' | 'empty'>('all');
  const [sortField, setSortField] = useState<'bureau' | 'name' | 'total'>('bureau');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Custom division addition state
  const [isAddCustomDivOpen, setIsAddCustomDivOpen] = useState(false);
  const [customBureauCode, setCustomBureauCode] = useState('สกพ.');
  const [customDivName, setCustomDivName] = useState('');
  const [customDivAcronym, setCustomDivAcronym] = useState('');
  const [customDivList, setCustomDivList] = useState<DivisionItem[]>([]);

  // Base list of all divisions
  const allDivisions = useMemo(() => {
    const list = getAllDivisionsFlat();
    return [...list, ...customDivList];
  }, [customDivList]);

  // Bureau Map for fast lookup
  const bureauMap = useMemo(() => {
    const map = new Map<string, PoliceBureauNode>();
    RTP_BUREAUS_DATA.forEach((b) => {
      map.set(b.id, b);
      map.set(b.code, b);
    });
    return map;
  }, []);

  // Compute officer stats for each division
  const divisionsWithStats = useMemo(() => {
    return allDivisions.map((div) => {
      const parentBureau = bureauMap.get(div.bureauId) || RTP_BUREAUS_DATA[0];
      const { officers: matchedOffs, matchedDivisionName } = getOfficersForDivision(
        div.displayName,
        parentBureau,
        officers
      );

      const total = matchedOffs.length;
      const occupied = matchedOffs.filter((o) => !o.isVacant).length;
      const vacant = matchedOffs.filter((o) => o.isVacant).length;
      const fillRate = total > 0 ? ((occupied / total) * 100).toFixed(0) : '0';

      return {
        ...div,
        parentBureau,
        matchedDivisionName,
        total,
        occupied,
        vacant,
        fillRate,
        officers: matchedOffs,
      };
    });
  }, [allDivisions, bureauMap, officers]);

  // Categories list for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    divisionsWithStats.forEach((d) => set.add(d.category));
    return Array.from(set).sort();
  }, [divisionsWithStats]);

  // Filtered & Sorted Divisions
  const filteredDivisions = useMemo(() => {
    return divisionsWithStats
      .filter((d) => {
        // Group filter
        if (selectedGroup !== 'all' && d.group !== selectedGroup) return false;

        // Bureau filter
        if (selectedBureau !== 'all' && d.bureauId !== selectedBureau && d.bureauCode !== selectedBureau) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;

        // Status filter
        if (statusFilter === 'has_officers' && d.total === 0) return false;
        if (statusFilter === 'empty' && d.total > 0) return false;

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const match =
            d.name.toLowerCase().includes(q) ||
            d.shortName.toLowerCase().includes(q) ||
            d.displayName.toLowerCase().includes(q) ||
            d.bureauCode.toLowerCase().includes(q) ||
            d.bureauName.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q) ||
            d.jurisdiction.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'bureau') {
          diff = a.bureauCode.localeCompare(b.bureauCode, 'th');
          if (diff === 0) diff = a.name.localeCompare(b.name, 'th');
        } else if (sortField === 'name') {
          diff = a.name.localeCompare(b.name, 'th');
        } else if (sortField === 'total') {
          diff = a.total - b.total;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [
    divisionsWithStats,
    selectedGroup,
    selectedBureau,
    selectedCategory,
    statusFilter,
    searchTerm,
    sortField,
    sortOrder,
  ]);

  // Top Metrics
  const totalDivisionsCount = divisionsWithStats.length;
  const activeDivisionsCount = divisionsWithStats.filter((d) => d.total > 0).length;
  const totalRosterCount = officers.length;

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredDivisions.map((d, index) => ({
      'ลำดับ': index + 1,
      'บช. ต้นสังกัด': d.bureauCode,
      'ชื่อกองบัญชาการ': d.bureauName,
      'ชื่อหน่วยงาน (บก. / กอง)': d.name,
      'ตัวย่อ': d.shortName,
      'ชื่อเต็มในระบบ': d.displayName,
      'กลุ่มสายงานหลัก':
        d.group === 'command_support'
          ? 'อำนวยการและสนับสนุน'
          : d.group === 'area_commands'
          ? 'ป้องกันปราบปรามพื้นที่'
          : d.group === 'specialized'
          ? 'สืบสวนและเฉพาะกิจ'
          : 'การศึกษาและฝึกอบรม',
      'กลุ่มภารกิจ': d.category,
      'พื้นที่/ขอบเขตรับผิดชอบ': d.jurisdiction,
      'กรอบอัตราในระบบ (นาย)': d.total,
      'มีผู้ครองตำแหน่ง': d.occupied,
      'ตำแหน่งว่าง': d.vacant,
      'ร้อยละการครองตำแหน่ง (%)': d.fillRate,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ตารางหน่วยงาน บก. กอง');
    XLSX.writeFile(workbook, `ตารางหน่วยงาน_บก_กอง_ตร_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleAddCustomDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDivName.trim()) return;

    const parent = bureauMap.get(customBureauCode) || RTP_BUREAUS_DATA[0];
    const acronym = customDivAcronym.trim() || customDivName.trim();
    const displayName = `${customDivName.trim()} (${acronym})`;

    const newDiv: DivisionItem = {
      id: `${parent.id}-${Date.now()}`,
      bureauId: parent.id,
      bureauCode: parent.code,
      bureauName: parent.fullName,
      name: customDivName.trim(),
      shortName: acronym,
      displayName,
      group: parent.group,
      category: 'หน่วยงานเฉพาะ/เพิ่มเติม',
      jurisdiction: parent.jurisdiction,
      description: `${customDivName.trim()} สังกัด ${parent.fullName}`,
    };

    setCustomDivList((prev) => [...prev, newDiv]);
    setCustomDivName('');
    setCustomDivAcronym('');
    setIsAddCustomDivOpen(false);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Header Card with Summary Metrics - Royal Gold Palette */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          currentTheme.isDark
            ? 'bg-[#15120B] border-[#382E17] text-[#FFFDF7] shadow-xl'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 flex items-center justify-center p-2.5 shadow-md shadow-amber-500/20 text-slate-950 shrink-0 border border-amber-300/60">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-lg sm:text-xl font-bold font-['Chakra_Petch',sans-serif] tracking-wide ${currentTheme.isDark ? 'text-amber-300' : 'text-slate-900'}`}>
                  ตารางหน่วยงานระดับกองบังคับการ (บก. / กอง) ทุกสังกัด บช.
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentTheme.isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                  {filteredDivisions.length} / {totalDivisionsCount} หน่วยงาน
                </span>
              </div>
              <p className={`text-xs mt-1 ${currentTheme.isDark ? 'text-amber-100/60' : 'text-slate-500'}`}>
                รวมหน่วยงานระดับ บก. และ กอง ครบถ้วนทุกสังกัดในสำนักงานตำรวจแห่งชาติ (บช.น., ภ.1-9, บช.ก., สกพ., สงป., สอท., สตม. ฯลฯ) · คลิกดูและจัดการกำลังพลได้ทันที
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`px-3 py-1.5 rounded-xl border text-center ${
                currentTheme.isDark ? 'bg-amber-950/25 border-amber-900/40' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-[10px] text-amber-200/60">บช. ทั้งหมด</div>
              <div className="text-sm font-bold text-amber-400 font-mono">{RTP_BUREAUS_DATA.length} บช.</div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-xl border text-center ${
                currentTheme.isDark ? 'bg-yellow-950/25 border-yellow-900/40' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-[10px] text-yellow-200/60">บก. / กอง รวม</div>
              <div className="text-sm font-bold text-yellow-300 font-mono">{totalDivisionsCount} บก.</div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-xl border text-center ${
                currentTheme.isDark ? 'bg-amber-950/35 border-amber-900/40' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-[10px] text-amber-200/60">มีกำลังพลในระบบ</div>
              <div className="text-sm font-bold text-amber-300 font-mono">{activeDivisionsCount} หน่วย</div>
            </div>

            <button
              onClick={handleExportExcel}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                currentTheme.isDark
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="ส่งออกตารางรายชื่อ บก./กอง ทั้งหมดเป็น Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>ส่งออก Excel</span>
            </button>

            <button
              onClick={() => setIsAddCustomDivOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-sm"
              title="เพิ่มหน่วยงานระดับ บก./กอง พิเศษ"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม บก./กอง ใหม่</span>
            </button>
          </div>
        </div>

        {/* 2. Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ บก., กอง, ตัวย่อ, บช. หรือภารกิจ..."
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-hidden transition-all ${
                currentTheme.isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-amber-500'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-amber-500'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter by Bureau */}
          <div>
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className={`w-full px-2.5 py-1.5 text-xs rounded-xl border outline-hidden transition-all ${
                currentTheme.isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">ทุก บช. ({RTP_BUREAUS_DATA.length} กองบัญชาการ)</option>
              {RTP_BUREAUS_DATA.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Pillar Group */}
          <div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value as PoliceGroup)}
              className={`w-full px-2.5 py-1.5 text-xs rounded-xl border outline-hidden transition-all ${
                currentTheme.isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">ทุกกลุ่มสายงาน (4 เสาหลัก)</option>
              <option value="command_support">อำนวยการและสนับสนุน</option>
              <option value="area_commands">ป้องกันปราบปรามพื้นที่ (บช.น./ภ.1-9)</option>
              <option value="specialized">สืบสวนและเฉพาะกิจ (CIB/สอท./สตม.)</option>
              <option value="education">การศึกษาและฝึกอบรม</option>
            </select>
          </div>

          {/* Filter by Roster Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`w-full px-2.5 py-1.5 text-xs rounded-xl border outline-hidden transition-all ${
                currentTheme.isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">สถานะกำลังพล (ทั้งหมด)</option>
              <option value="has_officers">มีอัตรากำลังในระบบ ({activeDivisionsCount})</option>
              <option value="empty">ยังไม่มีอัตรากำลัง ({totalDivisionsCount - activeDivisionsCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-lg transition-all ${
          currentTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className={`border-b ${
                  currentTheme.isDark
                    ? 'bg-slate-800/90 text-slate-300 border-slate-700/80'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <th className="py-3 px-3.5 w-12 text-center font-bold">ลำดับ</th>
                <th
                  onClick={() => {
                    if (sortField === 'bureau') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortField('bureau');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-3 px-3.5 font-bold cursor-pointer hover:text-amber-500 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>บช. ต้นสังกัด</span>
                    {sortField === 'bureau' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortField('name');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-3 px-3.5 font-bold cursor-pointer hover:text-amber-500 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ชื่อหน่วยงานระดับ บก. / กอง</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th className="py-3 px-3.5 font-bold whitespace-nowrap">ตัวย่อ</th>
                <th className="py-3 px-3.5 font-bold whitespace-nowrap">กลุ่มภารกิจ</th>
                <th className="py-3 px-3.5 font-bold hidden lg:table-cell">พื้นที่ / ขอบเขตรับผิดชอบ</th>
                <th
                  onClick={() => {
                    if (sortField === 'total') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortField('total');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-3.5 text-center font-bold cursor-pointer hover:text-amber-500 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>กำลังพลในระบบ</span>
                    {sortField === 'total' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th className="py-3 px-3.5 text-right font-bold whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredDivisions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-2">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm">ไม่พบหน่วยงาน บก./กอง ที่ตรงกับเงื่อนไขการค้นหา</p>
                    <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองเป็น "ทุก บช."</p>
                  </td>
                </tr>
              ) : (
                filteredDivisions.map((div, idx) => {
                  const hasOfficers = div.total > 0;

                  return (
                    <tr
                      key={div.id}
                      className={`transition-colors group ${
                        hasOfficers
                          ? currentTheme.isDark
                            ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                            : 'bg-emerald-50/40 hover:bg-emerald-50/80'
                          : currentTheme.isDark
                          ? 'hover:bg-slate-800/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Parent Bureau Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-lg border font-mono ${div.parentBureau.badgeColor}`}
                          >
                            {div.bureauCode}
                          </span>
                          <span className="text-[11px] text-slate-400 hidden xl:inline truncate max-w-[140px]" title={div.bureauName}>
                            {div.bureauName}
                          </span>
                        </div>
                      </td>

                      {/* Division Full Name */}
                      <td className="py-3 px-3.5 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                            {div.name}
                          </span>
                          {hasOfficers && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="มีข้อมูลกำลังพลในระบบ" />
                          )}
                        </div>
                      </td>

                      {/* Short Acronym */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-amber-500 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          {div.shortName}
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            div.category.includes('อำนวยการ')
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : div.category.includes('สืบสวน')
                              ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                              : div.category.includes('ป้องกันปราบปราม')
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : div.category.includes('ปฏิบัติการพิเศษ')
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : div.category.includes('จราจร')
                              ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                              : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                          }`}
                        >
                          {div.category}
                        </span>
                      </td>

                      {/* Jurisdiction */}
                      <td className="py-3 px-3.5 text-[11px] text-slate-400 hidden lg:table-cell max-w-[200px] truncate" title={div.jurisdiction}>
                        {div.jurisdiction}
                      </td>

                      {/* Roster Stats */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {hasOfficers ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                            <span className="font-bold">{div.total} นาย</span>
                            <span className="text-[10px] text-slate-400">
                              (ครอง {div.occupied} / ว่าง {div.vacant})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">0 อัตรา</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDivisionDetail(div.displayName, div.parentBureau)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px] transition-colors cursor-pointer shadow-xs"
                            title="เปิดดูรายชื่อและจัดการกำลังพลใน บก./กอง นี้"
                          >
                            <Eye className="w-3 h-3" />
                            <span>ดูข้อมูล</span>
                          </button>

                          <button
                            onClick={() => onAddOfficerToDivision(div.matchedDivisionName || div.name, '__ALL__')}
                            className={`p-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                              currentTheme.isDark
                                ? 'border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200'
                                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                            }`}
                            title="เพิ่มกำลังพลใน บก. นี้"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-500" />
                          </button>

                          {hasOfficers && (
                            <button
                              onClick={() => onOpenInMainTable(div.matchedDivisionName || div.name)}
                              className={`p-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                                currentTheme.isDark
                                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200'
                                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                              title="เปิดดูในตารางรวม"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div
          className={`p-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            currentTheme.isDark ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          <div>
            แสดง <span className="font-bold text-amber-500">{filteredDivisions.length}</span> จากทั้งหมด <span className="font-bold">{totalDivisionsCount}</span> หน่วยงานระดับ บก. / กอง ในสังกัด ตร.
          </div>
          <div className="flex items-center gap-2">
            <span>คำแนะนำ: คลิกปุ่ม "ดูข้อมูล" เพื่อตรวจสอบรายชื่อและจัดการกำลังพลของหน่วยงานนั้นๆ</span>
          </div>
        </div>
      </div>

      {/* 4. Add Custom Division Modal */}
      {isAddCustomDivOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-5 ${
              currentTheme.isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">เพิ่มหน่วยงานระดับ บก. / กอง ใหม่</h3>
              </div>
              <button
                onClick={() => setIsAddCustomDivOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomDivision} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  สังกัด บช. (กองบัญชาการ) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={customBureauCode}
                  onChange={(e) => setCustomBureauCode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                    currentTheme.isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {RTP_BUREAUS_DATA.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  ชื่อหน่วยงานระดับ บก. / กอง <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customDivName}
                  onChange={(e) => setCustomDivName(e.target.value)}
                  placeholder="เช่น กองบังคับการปฏิบัติการพิเศษ"
                  className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                    currentTheme.isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  ตัวย่อหน่วยงาน (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={customDivAcronym}
                  onChange={(e) => setCustomDivAcronym(e.target.value)}
                  placeholder="เช่น บก.ปพ."
                  className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                    currentTheme.isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCustomDivOpen(false)}
                  className={`px-4 py-2 rounded-xl border font-semibold ${
                    currentTheme.isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md cursor-pointer"
                >
                  บันทึกหน่วยงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
