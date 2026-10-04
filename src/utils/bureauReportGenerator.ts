/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PoliceOfficer } from '../types/personnel';
import {
  BureauStatusReportData,
  BureauMatrixRow,
  MatrixCellData,
} from '../types/bureauReport';
import * as XLSX from 'xlsx';

export const STANDARD_POSITION_LEVELS: string[] = [
  'ผบช.',
  'รอง ผบช.',
  'ผบก.',
  'รอง ผบก.',
  'ผกก.',
  'รอง ผกก.',
  'สว.',
  'รอง สว.',
  'ผบ.หมู่',
];

export const STANDARD_JOB_LINE_ORDER: string[] = [
  'บริหารงานอำนวยการและสนับสนุน',
  'อำนวยการและสนับสนุน',
  'ป้องกันปราบปราม',
  'สืบสวน',
  'สอบสวน',
  'จราจร',
  'ความมั่นคงและกิจการพิเศษ',
  'เทคโนโลยีสารสนเทศและการสื่อสาร',
  'พิสูจน์หลักฐานและนิติวิทยาศาสตร์',
  'ทรัพยากรบุคคลและอัตรากำลัง',
  'ทะเบียนพลและประวัติ',
  'สวัสดิการและคุณภาพชีวิต',
];

export function createEmptyCell(): MatrixCellData {
  return {
    authorized: 0,
    occupied: 0,
    vacant: 0,
    fillRate: 0,
    commissioned: 0,
    nonCommissioned: 0,
    male: 0,
    female: 0,
    officers: [],
  };
}

export function addOfficerToCell(cell: MatrixCellData, officer: PoliceOfficer): void {
  cell.authorized += 1;
  if (officer.isVacant) {
    cell.vacant += 1;
  } else {
    cell.occupied += 1;
    if (officer.commissionType === 'สัญญาบัตร') {
      cell.commissioned += 1;
    } else if (officer.commissionType === 'ประทวน') {
      cell.nonCommissioned += 1;
    }

    if (officer.gender === 'ชาย') cell.male += 1;
    else if (officer.gender === 'หญิง') cell.female += 1;
  }

  cell.fillRate = cell.authorized > 0 ? Math.round((cell.occupied / cell.authorized) * 1000) / 10 : 0;
  cell.officers.push(officer);
}

export function mergeCells(target: MatrixCellData, source: MatrixCellData): void {
  target.authorized += source.authorized;
  target.occupied += source.occupied;
  target.vacant += source.vacant;
  target.commissioned += source.commissioned;
  target.nonCommissioned += source.nonCommissioned;
  target.male += source.male;
  target.female += source.female;
  target.officers.push(...source.officers);
  target.fillRate = target.authorized > 0 ? Math.round((target.occupied / target.authorized) * 1000) / 10 : 0;
}

export interface ReportFilterOptions {
  bureau: string;         // 'all' or specific bureau code e.g. 'สกพ.', 'บช.น.'
  division?: string;       // 'all' or specific division e.g. 'บก.น.1'
  jobGroup?: string;       // 'all' or specific group
  commissionType?: string; // 'all' | 'สัญญาบัตร' | 'ประทวน'
}

export function buildBureauStatusReport(
  allOfficers: PoliceOfficer[],
  filters: ReportFilterOptions
): BureauStatusReportData {
  // 1. Gather all available bureaus
  const bureauSet = new Set<string>();
  allOfficers.forEach((o) => {
    if (o.bureau && o.bureau.trim()) bureauSet.add(o.bureau.trim());
  });
  const allBureaus = Array.from(bureauSet).sort();

  // 2. Filter officers
  const filteredOfficers = allOfficers.filter((o) => {
    if (filters.bureau !== 'all' && o.bureau !== filters.bureau) return false;
    if (filters.division && filters.division !== 'all' && o.division !== filters.division) return false;
    if (filters.jobGroup && filters.jobGroup !== 'all' && o.jobGroup !== filters.jobGroup) return false;
    if (filters.commissionType && filters.commissionType !== 'all' && o.commissionType !== filters.commissionType) return false;
    return true;
  });

  // 3. Gather divisions and job groups for current bureau
  const divisionSet = new Set<string>();
  const jobGroupSet = new Set<string>();
  allOfficers.forEach((o) => {
    if (filters.bureau === 'all' || o.bureau === filters.bureau) {
      if (o.division && o.division.trim()) divisionSet.add(o.division.trim());
      if (o.jobGroup && o.jobGroup.trim()) jobGroupSet.add(o.jobGroup.trim());
    }
  });

  // 4. Identify Position Levels in data: Standard levels first, then any extra levels
  const presentLevelsSet = new Set<string>();
  filteredOfficers.forEach((o) => {
    if (o.positionLevel && o.positionLevel.trim()) {
      presentLevelsSet.add(o.positionLevel.trim());
    }
  });

  // Keep standard levels in official RTP hierarchy
  const orderedLevels = STANDARD_POSITION_LEVELS.filter(
    (lvl) => presentLevelsSet.has(lvl) || filteredOfficers.length === 0
  );
  // Add any non-standard levels found in data
  presentLevelsSet.forEach((lvl) => {
    if (!orderedLevels.includes(lvl)) {
      orderedLevels.push(lvl);
    }
  });

  // If no officers at all, provide all standard levels
  const displayLevels = orderedLevels.length > 0 ? orderedLevels : STANDARD_POSITION_LEVELS;

  // 5. Identify Job Lines
  const jobLinesMap = new Map<string, { group: string; officers: PoliceOfficer[] }>();
  filteredOfficers.forEach((o) => {
    const lineKey = o.jobLine?.trim() || o.jobGroup?.trim() || 'ไม่ระบุสายงาน';
    if (!jobLinesMap.has(lineKey)) {
      jobLinesMap.set(lineKey, {
        group: o.jobGroup || 'ทั่วไป',
        officers: [],
      });
    }
    jobLinesMap.get(lineKey)!.officers.push(o);
  });

  // Sort job lines: standard list first, then alphabetical
  const sortedJobLines = Array.from(jobLinesMap.keys()).sort((a, b) => {
    const idxA = STANDARD_JOB_LINE_ORDER.indexOf(a);
    const idxB = STANDARD_JOB_LINE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'th');
  });

  // 6. Build Rows and column totals
  const colTotals: Record<string, MatrixCellData> = {};
  displayLevels.forEach((lvl) => {
    colTotals[lvl] = createEmptyCell();
  });
  const grandTotal = createEmptyCell();

  const rows: BureauMatrixRow[] = sortedJobLines.map((line) => {
    const entry = jobLinesMap.get(line)!;
    const cells: Record<string, MatrixCellData> = {};
    displayLevels.forEach((lvl) => {
      cells[lvl] = createEmptyCell();
    });

    const rowTotal = createEmptyCell();

    entry.officers.forEach((officer) => {
      const lvl = officer.positionLevel?.trim() || 'ไม่ระบุ';
      if (!cells[lvl]) {
        cells[lvl] = createEmptyCell();
        if (!colTotals[lvl]) colTotals[lvl] = createEmptyCell();
      }
      addOfficerToCell(cells[lvl], officer);
      addOfficerToCell(rowTotal, officer);
      addOfficerToCell(colTotals[lvl], officer);
      addOfficerToCell(grandTotal, officer);
    });

    return {
      jobLine: line,
      jobGroup: entry.group,
      cells,
      rowTotal,
    };
  });

  return {
    selectedBureau: filters.bureau,
    selectedDivision: filters.division || 'all',
    selectedJobGroup: filters.jobGroup || 'all',
    levels: displayLevels,
    rows,
    colTotals,
    grandTotal,
    allBureaus,
    allDivisions: Array.from(divisionSet).sort(),
    allJobGroups: Array.from(jobGroupSet).sort(),
  };
}

// Generate TSV for clipboard copy
export function generateBureauMatrixTSV(report: BureauStatusReportData, displayMode: string): string {
  const headers = ['ลำดับ', 'สายงาน / กลุ่มงาน', ...report.levels, 'รวมกรอบ', 'รวมคนครอง', 'รวมว่าง', '% การครอง'];
  const lines: string[] = [headers.join('\t')];

  report.rows.forEach((row, idx) => {
    const rowVals: string[] = [
      String(idx + 1),
      row.jobLine,
    ];

    report.levels.forEach((lvl) => {
      const cell = row.cells[lvl] || createEmptyCell();
      if (displayMode === 'occupied') {
        rowVals.push(String(cell.occupied));
      } else if (displayMode === 'vacant') {
        rowVals.push(String(cell.vacant));
      } else if (displayMode === 'percentage') {
        rowVals.push(`${cell.fillRate}%`);
      } else {
        // all: กรอบ/ครอง/ว่าง
        rowVals.push(`${cell.authorized}/${cell.occupied}/${cell.vacant}`);
      }
    });

    rowVals.push(String(row.rowTotal.authorized));
    rowVals.push(String(row.rowTotal.occupied));
    rowVals.push(String(row.rowTotal.vacant));
    rowVals.push(`${row.rowTotal.fillRate}%`);

    lines.push(rowVals.join('\t'));
  });

  // Grand Total Row
  const totalRow: string[] = ['-', 'รวมทุกสายงาน'];
  report.levels.forEach((lvl) => {
    const cell = report.colTotals[lvl] || createEmptyCell();
    if (displayMode === 'occupied') {
      totalRow.push(String(cell.occupied));
    } else if (displayMode === 'vacant') {
      totalRow.push(String(cell.vacant));
    } else if (displayMode === 'percentage') {
      totalRow.push(`${cell.fillRate}%`);
    } else {
      totalRow.push(`${cell.authorized}/${cell.occupied}/${cell.vacant}`);
    }
  });

  totalRow.push(String(report.grandTotal.authorized));
  totalRow.push(String(report.grandTotal.occupied));
  totalRow.push(String(report.grandTotal.vacant));
  totalRow.push(`${report.grandTotal.fillRate}%`);

  lines.push(totalRow.join('\t'));

  return lines.join('\n');
}

// Export formatted Excel file (XLSX)
export function exportBureauMatrixToExcel(
  report: BureauStatusReportData,
  bureauNameTitle: string
): void {
  const wb = XLSX.utils.book_new();

  // 1. Matrix Sheet
  const matrixRows: any[] = [];

  // Header Title
  matrixRows.push([`รายงานสถานภาพกำลังพลแยกตามสายงานและระดับตำแหน่ง ${bureauNameTitle}`]);
  matrixRows.push([`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`]);
  matrixRows.push([`รูปแบบข้อมูลในเซลล์: กรอบอัตรา (คนครอง / ว่าง) | หน่วยนับ: นาย/อัตรา`]);
  matrixRows.push([]); // blank line

  // Column Headers
  const colHeader1 = ['ลำดับ', 'สายงาน (Job Line)', 'กลุ่มสายงาน'];
  report.levels.forEach((lvl) => {
    colHeader1.push(`${lvl} (กรอบ)`, `${lvl} (ครอง)`, `${lvl} (ว่าง)`);
  });
  colHeader1.push('รวมกรอบทั้งหมด', 'รวมคนครอง', 'รวมอัตราว่าง', 'ร้อยละการครอง (%)');
  matrixRows.push(colHeader1);

  // Data rows
  report.rows.forEach((row, idx) => {
    const r: any[] = [idx + 1, row.jobLine, row.jobGroup];
    report.levels.forEach((lvl) => {
      const cell = row.cells[lvl] || createEmptyCell();
      r.push(cell.authorized, cell.occupied, cell.vacant);
    });
    r.push(
      row.rowTotal.authorized,
      row.rowTotal.occupied,
      row.rowTotal.vacant,
      `${row.rowTotal.fillRate}%`
    );
    matrixRows.push(r);
  });

  // Total Summary row
  const summaryRow: any[] = ['-', 'รวมทุกสายงาน', '-'];
  report.levels.forEach((lvl) => {
    const cell = report.colTotals[lvl] || createEmptyCell();
    summaryRow.push(cell.authorized, cell.occupied, cell.vacant);
  });
  summaryRow.push(
    report.grandTotal.authorized,
    report.grandTotal.occupied,
    report.grandTotal.vacant,
    `${report.grandTotal.fillRate}%`
  );
  matrixRows.push(summaryRow);

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);

  // Column widths
  wsMatrix['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 32 }, // สายงาน
    { wch: 22 }, // กลุ่มงาน
    ...report.levels.flatMap(() => [{ wch: 10 }, { wch: 10 }, { wch: 10 }]),
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, wsMatrix, 'ตารางสรุปสถานภาพสายงาน');

  // 2. Raw Officers List Sheet (filtered)
  const allFilteredOfficers = report.grandTotal.officers;
  const officerRows = allFilteredOfficers.map((o, idx) => ({
    'ลำดับ': idx + 1,
    'เลขตำแหน่ง': o.positionNumber,
    'กองบัญชาการ (บช.)': o.bureau,
    'กองบังคับการ (บก.)': o.division,
    'กก. / ฝ่าย': o.subDivision,
    'กลุ่มสายงาน': o.jobGroup,
    'สายงาน': o.jobLine,
    'ทำหน้าที่': o.duty,
    'ระดับตำแหน่ง': o.positionLevel,
    'ตำแหน่งเต็ม': o.positionTitle,
    'ประเภท': o.commissionType,
    'สถานะ': o.isVacant ? 'ว่าง' : 'คนครอง',
    'ยศ': o.isVacant ? '-' : o.rank,
    'ชื่อ': o.isVacant ? '-' : o.firstName,
    'สกุล': o.isVacant ? '-' : o.lastName,
    'เพศ': o.gender || '-',
  }));

  const wsOfficers = XLSX.utils.json_to_sheet(officerRows);
  XLSX.utils.book_append_sheet(wb, wsOfficers, 'บัญชีรายชื่อกำลังพล');

  // Write and trigger download
  const cleanBureau = report.selectedBureau === 'all' ? 'ทุกบช' : report.selectedBureau.replace(/\./g, '');
  const fileName = `รายงานสถานภาพสายงาน_ระดับตำแหน่ง_${cleanBureau}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
