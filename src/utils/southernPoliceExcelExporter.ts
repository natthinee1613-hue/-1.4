/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { SouthernPoliceSection, UnitManpowerRow } from '../types/southernPolice';
import { calculateTotalsForUnits, SOUTHERN_POLICE_TITLE } from '../data/southernBorderPoliceData';

/**
 * Build 2-level header array for Excel export
 */
function buildHeaderRows(titleText: string): any[][] {
  return [
    [titleText],
    [],
    [
      'ลำดับ',
      'หน่วยงาน',
      'ผบก.',
      '',
      'รอง ผบก.',
      '',
      'ผกก.',
      '',
      'รอง ผกก.',
      '',
      'สว.',
      '',
      'รอง สว.',
      '',
      'รวมชั้นสัญญาบัตร',
      '',
      'รอง สว.(ท.(ด.ต.53 ปี))',
      '',
      'ผบ.หมู่',
      '',
      'รอง ผบ.หมู่',
      '',
      'รวมชั้นประทวน',
      '',
      'รวมทั้งหมด',
      '',
      'ตำแหน่งว่าง',
      'ร้อยละคนครอง (%)',
    ],
    [
      '',
      '',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ตำแหน่ง',
      'คนครอง',
      'ขาด/ว่าง',
      '% ครอง',
    ],
  ];
}

/**
 * Format a unit row into an array of cell values
 */
function unitToRowArray(no: number | string, name: string, u: UnitManpowerRow): any[] {
  const comm = u.totalCommissioned || { positions: 0, occupied: 0 };
  const nonComm = u.totalNonCommissioned || { positions: 0, occupied: 0 };
  const grand = u.grandTotal || { positions: 0, occupied: 0 };
  const vacant = grand.positions - grand.occupied;
  const pct = grand.positions > 0 ? Math.round((grand.occupied / grand.positions) * 1000) / 10 : 0;

  return [
    no,
    name,
    u.ranks.pbg.positions || 0,
    u.ranks.pbg.occupied || 0,
    u.ranks.rpbg.positions || 0,
    u.ranks.rpbg.occupied || 0,
    u.ranks.pgk.positions || 0,
    u.ranks.pgk.occupied || 0,
    u.ranks.rpgk.positions || 0,
    u.ranks.rpgk.occupied || 0,
    u.ranks.sw.positions || 0,
    u.ranks.sw.occupied || 0,
    u.ranks.rsw.positions || 0,
    u.ranks.rsw.occupied || 0,
    comm.positions,
    comm.occupied,
    u.ranks.rt_dt53.positions || 0,
    u.ranks.rt_dt53.occupied || 0,
    u.ranks.pbm.positions || 0,
    u.ranks.pbm.occupied || 0,
    u.ranks.rpbm.positions || 0,
    u.ranks.rpbm.occupied || 0,
    nonComm.positions,
    nonComm.occupied,
    grand.positions,
    grand.occupied,
    vacant,
    `${pct}%`,
  ];
}

/**
 * Build subtotal row array
 */
function buildSubtotalRow(label: string, units: UnitManpowerRow[]): any[] {
  const total = calculateTotalsForUnits(units);
  return [
    '',
    label,
    total.ranks.pbg.positions,
    total.ranks.pbg.occupied,
    total.ranks.rpbg.positions,
    total.ranks.rpbg.occupied,
    total.ranks.pgk.positions,
    total.ranks.pgk.occupied,
    total.ranks.rpgk.positions,
    total.ranks.rpgk.occupied,
    total.ranks.sw.positions,
    total.ranks.sw.occupied,
    total.ranks.rsw.positions,
    total.ranks.rsw.occupied,
    total.totalCommissioned.positions,
    total.totalCommissioned.occupied,
    total.ranks.rt_dt53.positions,
    total.ranks.rt_dt53.occupied,
    total.ranks.pbm.positions,
    total.ranks.pbm.occupied,
    total.ranks.rpbm.positions,
    total.ranks.rpbm.occupied,
    total.totalNonCommissioned.positions,
    total.totalNonCommissioned.occupied,
    total.grandTotal.positions,
    total.grandTotal.occupied,
    total.vacant,
    `${total.occupancyPercent}%`,
  ];
}

/**
 * Create a worksheet for a single section
 */
function createSectionWorksheet(section: SouthernPoliceSection): XLSX.WorkSheet {
  const header = buildHeaderRows(`${SOUTHERN_POLICE_TITLE} — ${section.title}`);
  const dataRows = section.units.map((u) => unitToRowArray(u.no, u.unitName, u));
  const subtotalRow = buildSubtotalRow(`รวม (${section.shortName})`, section.units);

  const allRows = [...header, ...dataRows, subtotalRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 38 }, // หน่วยงาน
    { wch: 9 }, { wch: 9 }, // ผบก.
    { wch: 9 }, { wch: 9 }, // รอง ผบก.
    { wch: 9 }, { wch: 9 }, // ผกก.
    { wch: 9 }, { wch: 9 }, // รอง ผกก.
    { wch: 9 }, { wch: 9 }, // สว.
    { wch: 9 }, { wch: 9 }, // รอง สว.
    { wch: 14 }, { wch: 14 }, // รวมสัญญาบัตร
    { wch: 14 }, { wch: 14 }, // รอง สว.(ท.)
    { wch: 10 }, { wch: 10 }, // ผบ.หมู่
    { wch: 14 }, { wch: 14 }, // รวมประทวน
    { wch: 11 }, { wch: 11 }, // รอง ผบ.หมู่
    { wch: 15 }, { wch: 15 }, // รวมทั้งหมด
    { wch: 11 }, // ว่าง
    { wch: 14 }, // %
  ];

  // Merge header cells
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } }, // Main title
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },  // ลำดับ
    { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },  // หน่วยงาน
    { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },  // ผบก.
    { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } },  // รอง ผบก.
    { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },  // ผกก.
    { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } },  // รอง ผกก.
    { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } }, // สว.
    { s: { r: 2, c: 12 }, e: { r: 2, c: 13 } }, // รอง สว.
    { s: { r: 2, c: 14 }, e: { r: 2, c: 15 } }, // รวมสัญญาบัตร
    { s: { r: 2, c: 16 }, e: { r: 2, c: 17 } }, // รอง สว.(ท.)
    { s: { r: 2, c: 18 }, e: { r: 2, c: 19 } }, // ผบ.หมู่
    { s: { r: 2, c: 20 }, e: { r: 2, c: 21 } }, // รอง ผบ.หมู่
    { s: { r: 2, c: 22 }, e: { r: 2, c: 23 } }, // รวมประทวน
    { s: { r: 2, c: 24 }, e: { r: 2, c: 25 } }, // รวมทั้งหมด
    { s: { r: 2, c: 26 }, e: { r: 3, c: 26 } }, // ตำแหน่งว่าง
    { s: { r: 2, c: 27 }, e: { r: 3, c: 27 } }, // ร้อยละครอง
  ];

  return ws;
}

/**
 * Create Summary/Overview Worksheet showing each section subtotal and Grand Total
 */
function createOverviewWorksheet(sections: SouthernPoliceSection[]): XLSX.WorkSheet {
  const header = buildHeaderRows(`${SOUTHERN_POLICE_TITLE} — สรุปภาพรวมรายสังกัด`);
  const allUnits: UnitManpowerRow[] = [];

  const sectionRows = sections.map((sec, idx) => {
    allUnits.push(...sec.units);
    const sub = buildSubtotalRow(`${idx + 1}. ${sec.title}`, sec.units);
    sub[0] = idx + 1; // set sequence number
    return sub;
  });

  const grandTotalRow = buildSubtotalRow('รวมทั้งหมดทุกหน่วย (Grand Total)', allUnits);
  grandTotalRow[0] = '★';

  const allRows = [...header, ...sectionRows, [], grandTotalRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 42 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 14 },
    { wch: 11 }, { wch: 11 },
    { wch: 15 }, { wch: 15 },
    { wch: 11 },
    { wch: 14 },
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } },
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
    { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } },
    { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
    { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } },
    { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } },
    { s: { r: 2, c: 12 }, e: { r: 2, c: 13 } },
    { s: { r: 2, c: 14 }, e: { r: 2, c: 15 } },
    { s: { r: 2, c: 16 }, e: { r: 2, c: 17 } },
    { s: { r: 2, c: 18 }, e: { r: 2, c: 19 } },
    { s: { r: 2, c: 20 }, e: { r: 2, c: 21 } },
    { s: { r: 2, c: 22 }, e: { r: 2, c: 23 } },
    { s: { r: 2, c: 24 }, e: { r: 2, c: 25 } },
    { s: { r: 2, c: 26 }, e: { r: 3, c: 26 } },
    { s: { r: 2, c: 27 }, e: { r: 3, c: 27 } },
  ];

  return ws;
}

/**
 * Create Complete Consolidated Sheet with all sections, unit rows, sub-totals, and grand total
 */
function createConsolidatedFullWorksheet(sections: SouthernPoliceSection[]): XLSX.WorkSheet {
  const header = buildHeaderRows(SOUTHERN_POLICE_TITLE);
  const rows: any[][] = [...header];
  const allUnits: UnitManpowerRow[] = [];

  sections.forEach((sec, sIdx) => {
    // Section Header row
    rows.push([]);
    rows.push(['', `【สังกัดที่ ${sIdx + 1}】 ${sec.title}`]);
    allUnits.push(...sec.units);

    // Units
    sec.units.forEach((u) => {
      rows.push(unitToRowArray(u.no, u.unitName, u));
    });

    // Subtotal
    rows.push(buildSubtotalRow(`รวม (${sec.shortName})`, sec.units));
  });

  // Grand Total
  rows.push([]);
  const grandTotalRow = buildSubtotalRow('รวมทั้งหมด (Grand Total)', allUnits);
  grandTotalRow[0] = '★';
  rows.push(grandTotalRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 40 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 },
    { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 14 },
    { wch: 11 }, { wch: 11 },
    { wch: 15 }, { wch: 15 },
    { wch: 11 },
    { wch: 14 },
  ];

  return ws;
}

/**
 * Export complete multi-sheet Excel workbook (.xlsx)
 */
export function exportSouthernPoliceWorkbook(
  sections: SouthernPoliceSection[],
  fileName = 'สถานภาพตำรวจ_3จชต_สงขลา4อำเภอ.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // 1. Overview sheet
  const wsOverview = createOverviewWorksheet(sections);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'สรุปภาพรวม');

  // 2. Full consolidated sheet
  const wsFull = createConsolidatedFullWorksheet(sections);
  XLSX.utils.book_append_sheet(wb, wsFull, 'รวมทุกหน่วยในชีทเดียว');

  // 3. Individual section sheets
  sections.forEach((sec) => {
    const wsSec = createSectionWorksheet(sec);
    // Excel sheet name max length is 31 chars and no invalid chars : \ / ? * [ ]
    const cleanSheetName = sec.sheetName.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsSec, cleanSheetName);
  });

  XLSX.writeFile(wb, fileName);
}

/**
 * Export single section to Excel workbook (.xlsx)
 */
export function exportSingleSectionToExcel(
  section: SouthernPoliceSection,
  fileName?: string
): void {
  const wb = XLSX.utils.book_new();
  const ws = createSectionWorksheet(section);
  const cleanSheetName = section.sheetName.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

  const defaultName = `${section.shortName}_สถานภาพกำลังพล.xlsx`;
  XLSX.writeFile(wb, fileName || defaultName);
}

/**
 * Export current view to CSV
 */
export function exportSectionToCSV(
  section: SouthernPoliceSection,
  fileName?: string
): void {
  const ws = createSectionWorksheet(section);
  const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName || `${section.shortName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
