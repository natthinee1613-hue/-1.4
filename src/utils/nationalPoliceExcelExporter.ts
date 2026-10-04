/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { NationalPoliceUnitRow } from '../types/nationalPoliceStatus';
import { calculateNationalGrandTotals, NATIONAL_POLICE_TITLE } from '../data/nationalPoliceStatusData';

/**
 * Format a unit row to an array of 26 cell values matching the exact template
 */
function unitToRowArray(no: number | string, u: NationalPoliceUnitRow): (string | number)[] {
  return [
    no,
    u.unitName,
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
    u.totalCommissioned.positions || 0,
    u.totalCommissioned.occupied || 0,
    u.ranks.rsw_star.positions || 0,
    u.ranks.rsw_star.occupied || 0,
    u.ranks.pbm.positions || 0,
    u.ranks.pbm.occupied || 0,
    u.totalNonCommissioned.positions || 0,
    u.totalNonCommissioned.occupied || 0,
    u.ranks.rpbm.positions || 0,
    u.ranks.rpbm.occupied || 0,
    u.grandTotal.positions || 0,
    u.grandTotal.occupied || 0,
  ];
}

/**
 * Export to Excel (.xlsx) file
 */
export function exportNationalPoliceExcel(units: NationalPoliceUnitRow[], filename?: string): void {
  const wb = XLSX.utils.book_new();

  const grandTotals = calculateNationalGrandTotals(units);

  // Exact 2-tier header rows matching user specification
  const wsData: any[][] = [
    [NATIONAL_POLICE_TITLE],
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
      'รอง สว.*',
      '',
      'ผบ.หมู่',
      '',
      'รวมชั้นประทวน',
      '',
      'รอง ผบ.หมู่',
      '',
      'รวมทั้งหมด',
      '',
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
    ],
  ];

  // Append unit rows
  units.forEach((u, idx) => {
    wsData.push(unitToRowArray(idx + 1, u));
  });

  // Append Grand Total row
  wsData.push([
    '',
    'รวมทั้งสิ้น (ทั่วประเทศ)',
    grandTotals.ranks.pbg.positions,
    grandTotals.ranks.pbg.occupied,
    grandTotals.ranks.rpbg.positions,
    grandTotals.ranks.rpbg.occupied,
    grandTotals.ranks.pgk.positions,
    grandTotals.ranks.pgk.occupied,
    grandTotals.ranks.rpgk.positions,
    grandTotals.ranks.rpgk.occupied,
    grandTotals.ranks.sw.positions,
    grandTotals.ranks.sw.occupied,
    grandTotals.ranks.rsw.positions,
    grandTotals.ranks.rsw.occupied,
    grandTotals.totalCommissioned.positions,
    grandTotals.totalCommissioned.occupied,
    grandTotals.ranks.rsw_star.positions,
    grandTotals.ranks.rsw_star.occupied,
    grandTotals.ranks.pbm.positions,
    grandTotals.ranks.pbm.occupied,
    grandTotals.totalNonCommissioned.positions,
    grandTotals.totalNonCommissioned.occupied,
    grandTotals.ranks.rpbm.positions,
    grandTotals.ranks.rpbm.occupied,
    grandTotals.grandTotal.positions,
    grandTotals.grandTotal.occupied,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 7 },  // ลำดับ
    { wch: 36 }, // หน่วยงาน
  ];
  for (let i = 2; i < 26; i++) {
    colWidths.push({ wch: 10 });
  }
  ws['!cols'] = colWidths;

  // Set merges for 2-tier headers
  ws['!merges'] = [
    // Title row merge (across all 26 columns)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 25 } },
    // ลำดับ
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    // หน่วยงาน
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    // 12 rank groups (2 columns each)
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },   // ผบก.
    { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },   // รอง ผบก.
    { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },   // ผกก.
    { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } },   // รอง ผกก.
    { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } }, // สว.
    { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } }, // รอง สว.
    { s: { r: 1, c: 14 }, e: { r: 1, c: 15 } }, // รวมชั้นสัญญาบัตร
    { s: { r: 1, c: 16 }, e: { r: 1, c: 17 } }, // รอง สว.*
    { s: { r: 1, c: 18 }, e: { r: 1, c: 19 } }, // ผบ.หมู่
    { s: { r: 1, c: 20 }, e: { r: 1, c: 21 } }, // รวมชั้นประทวน
    { s: { r: 1, c: 22 }, e: { r: 1, c: 23 } }, // รอง ผบ.หมู่
    { s: { r: 1, c: 24 }, e: { r: 1, c: 25 } }, // รวมทั้งหมด
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'สถานภาพตำรวจทั้งประเทศ');

  const finalName = filename || `สถานภาพข้าราชการตำรวจทั้งประเทศ_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Export to CSV matching the exact template provided by user:
 * สถานภาพข้าราชการตำรวทั้งประเทศ,,,,,,,,,,,,,,,,,,,,,,,,,
 * ลำดับ,หน่วยงาน,ผบก.,,รอง ผบก.,,ผกก.,,รอง ผกก.,,สว.,,รอง สว.,,รวมชั้นสัญญาบัตร,,รอง สว.*,,ผบ.หมู่,,รวมชั้นประทวน,,รอง ผบ.หมู่,,รวมทั้งหมด,
 * ,,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง
 */
export function exportNationalPoliceCSV(units: NationalPoliceUnitRow[], filename?: string): void {
  const lines: string[] = [];

  // Line 1
  lines.push('สถานภาพข้าราชการตำรวจทั้งประเทศ,,,,,,,,,,,,,,,,,,,,,,,,,');

  // Line 2
  lines.push('ลำดับ,หน่วยงาน,ผบก.,,รอง ผบก.,,ผกก.,,รอง ผกก.,,สว.,,รอง สว.,,รวมชั้นสัญญาบัตร,,รอง สว.*,,ผบ.หมู่,,รวมชั้นประทวน,,รอง ผบ.หมู่,,รวมทั้งหมด,');

  // Line 3
  lines.push(',,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง');

  // Data rows
  units.forEach((u, idx) => {
    const row = unitToRowArray(idx + 1, u);
    // Escape unit name if contains commas
    const formatted = row.map((val) => {
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(formatted.join(','));
  });

  // Grand Total row
  const grandTotals = calculateNationalGrandTotals(units);
  const totalRow = [
    '',
    '"รวมทั้งสิ้น (ทั่วประเทศ)"',
    grandTotals.ranks.pbg.positions,
    grandTotals.ranks.pbg.occupied,
    grandTotals.ranks.rpbg.positions,
    grandTotals.ranks.rpbg.occupied,
    grandTotals.ranks.pgk.positions,
    grandTotals.ranks.pgk.occupied,
    grandTotals.ranks.rpgk.positions,
    grandTotals.ranks.rpgk.occupied,
    grandTotals.ranks.sw.positions,
    grandTotals.ranks.sw.occupied,
    grandTotals.ranks.rsw.positions,
    grandTotals.ranks.rsw.occupied,
    grandTotals.totalCommissioned.positions,
    grandTotals.totalCommissioned.occupied,
    grandTotals.ranks.rsw_star.positions,
    grandTotals.ranks.rsw_star.occupied,
    grandTotals.ranks.pbm.positions,
    grandTotals.ranks.pbm.occupied,
    grandTotals.totalNonCommissioned.positions,
    grandTotals.totalNonCommissioned.occupied,
    grandTotals.ranks.rpbm.positions,
    grandTotals.ranks.rpbm.occupied,
    grandTotals.grandTotal.positions,
    grandTotals.grandTotal.occupied,
  ];
  lines.push(totalRow.join(','));

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `สถานภาพข้าราชการตำรวจทั้งประเทศ_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
