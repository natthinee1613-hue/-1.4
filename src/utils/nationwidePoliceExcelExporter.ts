/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { NationwideUnitRow } from '../types/nationwidePolice';
import { calculateTotalsForNationwideRows, NATIONWIDE_POLICE_TITLE } from '../data/nationwidePoliceData';

/**
 * สร้างส่วนหัว 2 ชั้นตามมาตรฐานแบบฟอร์มสถานภาพกำลังพล ตร.
 */
function buildNationwideHeaderRows(sheetTitle: string): any[][] {
  return [
    [NATIONWIDE_POLICE_TITLE],
    [sheetTitle],
    [
      'ลำดับ',
      'หน่วยงาน',
      'ระดับ',
      'สังกัด บช.',
      'สังกัด บก.',
      'ผบก./เทียบเท่า',
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
      'ขาด/ว่าง',
      'ร้อยละคนครอง (%)',
    ],
    [
      '',
      '',
      '',
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
      '',
      '',
    ],
  ];
}

/**
 * แปลงแถวข้อมูลเป็นรูปแบบ Excel
 */
function formatUnitRowForExcel(u: NationwideUnitRow): any[] {
  return [
    u.no,
    u.unitName,
    u.unitLevel,
    u.bureauName || u.bureauId,
    u.divisionName || '-',
    u.ranks.pbg.positions,
    u.ranks.pbg.occupied,
    u.ranks.rpbg.positions,
    u.ranks.rpbg.occupied,
    u.ranks.pgk.positions,
    u.ranks.pgk.occupied,
    u.ranks.rpgk.positions,
    u.ranks.rpgk.occupied,
    u.ranks.sw.positions,
    u.ranks.sw.occupied,
    u.ranks.rsw.positions,
    u.ranks.rsw.occupied,
    u.totalCommissioned.positions,
    u.totalCommissioned.occupied,
    u.ranks.rt_dt53.positions,
    u.ranks.rt_dt53.occupied,
    u.ranks.pbm.positions,
    u.ranks.pbm.occupied,
    u.ranks.rpbm.positions,
    u.ranks.rpbm.occupied,
    u.totalNonCommissioned.positions,
    u.totalNonCommissioned.occupied,
    u.grandTotal.positions,
    u.grandTotal.occupied,
    u.vacant,
    u.occupancyPercent,
  ];
}

/**
 * สร้างแถวรวมทั้งหมด (Total Summary Row)
 */
function formatTotalsRowForExcel(rows: NationwideUnitRow[]): any[] {
  const totals = calculateTotalsForNationwideRows(rows);
  return [
    'รวมทั้งหมด',
    `รวมทั้งสิ้น (${rows.length} หน่วยงาน)`,
    '-',
    '-',
    '-',
    totals.ranks.pbg.positions,
    totals.ranks.pbg.occupied,
    totals.ranks.rpbg.positions,
    totals.ranks.rpbg.occupied,
    totals.ranks.pgk.positions,
    totals.ranks.pgk.occupied,
    totals.ranks.rpgk.positions,
    totals.ranks.rpgk.occupied,
    totals.ranks.sw.positions,
    totals.ranks.sw.occupied,
    totals.ranks.rsw.positions,
    totals.ranks.rsw.occupied,
    totals.totalCommissioned.positions,
    totals.totalCommissioned.occupied,
    totals.ranks.rt_dt53.positions,
    totals.ranks.rt_dt53.occupied,
    totals.ranks.pbm.positions,
    totals.ranks.pbm.occupied,
    totals.ranks.rpbm.positions,
    totals.ranks.rpbm.occupied,
    totals.totalNonCommissioned.positions,
    totals.totalNonCommissioned.occupied,
    totals.grandTotal.positions,
    totals.grandTotal.occupied,
    totals.vacant,
    totals.occupancyPercent,
  ];
}

/**
 * สร้างแผ่นงาน Excel พร้อมจัดรูปแบบความกว้างและผสานเซลล์
 */
function createWorksheetForRows(rows: NationwideUnitRow[], sheetTitle: string): XLSX.WorkSheet {
  const headers = buildNationwideHeaderRows(sheetTitle);
  const dataRows = rows.map((r) => formatUnitRowForExcel(r));
  const totalsRow = formatTotalsRowForExcel(rows);

  const fullData = [...headers, ...dataRows, totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  // ผสานเซลล์หัวตาราง
  ws['!merges'] = [
    // หัวเรื่องหลัก
    { s: { r: 0, c: 0 }, e: { r: 0, c: 30 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 30 } },
    // คอลัมน์เดี่ยวแถว 2-3 (ลำดับ, หน่วยงาน, ระดับ, สังกัด บช., สังกัด บก.)
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
    { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
    { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
    { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
    // ผสานยศคู่ (ตำแหน่ง/คนครอง)
    { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } },   // ผบก.
    { s: { r: 2, c: 7 }, e: { r: 2, c: 8 } },   // รอง ผบก.
    { s: { r: 2, c: 9 }, e: { r: 2, c: 10 } },  // ผกก.
    { s: { r: 2, c: 11 }, e: { r: 2, c: 12 } }, // รอง ผกก.
    { s: { r: 2, c: 13 }, e: { r: 2, c: 14 } }, // สว.
    { s: { r: 2, c: 15 }, e: { r: 2, c: 16 } }, // รอง สว.
    { s: { r: 2, c: 17 }, e: { r: 2, c: 18 } }, // รวมสัญญาบัตร
    { s: { r: 2, c: 19 }, e: { r: 2, c: 20 } }, // รอง สว.(ท.)
    { s: { r: 2, c: 21 }, e: { r: 2, c: 22 } }, // ผบ.หมู่
    { s: { r: 2, c: 23 }, e: { r: 2, c: 24 } }, // รอง ผบ.หมู่
    { s: { r: 2, c: 25 }, e: { r: 2, c: 26 } }, // รวมประทวน
    { s: { r: 2, c: 27 }, e: { r: 2, c: 28 } }, // รวมทั้งหมด
    // คอลัมน์เดี่ยวท้ายตาราง
    { s: { r: 2, c: 29 }, e: { r: 3, c: 29 } }, // ขาด/ว่าง
    { s: { r: 2, c: 30 }, e: { r: 3, c: 30 } }, // % ครอง
  ];

  // กำหนดความกว้างคอลัมน์
  ws['!cols'] = [
    { wch: 10 }, // ลำดับ
    { wch: 38 }, // หน่วยงาน
    { wch: 8 },  // ระดับ
    { wch: 28 }, // สังกัด บช.
    { wch: 28 }, // สังกัด บก.
    { wch: 9 },  // ผบก. ตำแหน่ง
    { wch: 9 },  // ผบก. คนครอง
    { wch: 9 },  // รอง ผบก. ตำแหน่ง
    { wch: 9 },  // รอง ผบก. คนครอง
    { wch: 9 },  // ผกก.
    { wch: 9 },
    { wch: 9 },  // รอง ผกก.
    { wch: 9 },
    { wch: 9 },  // สว.
    { wch: 9 },
    { wch: 9 },  // รอง สว.
    { wch: 9 },
    { wch: 12 }, // รวมสัญญาบัตร
    { wch: 12 },
    { wch: 10 }, // รอง สว.ท.
    { wch: 10 },
    { wch: 9 },  // ผบ.หมู่
    { wch: 9 },
    { wch: 9 },  // รอง ผบ.หมู่
    { wch: 9 },
    { wch: 12 }, // รวมประทวน
    { wch: 12 },
    { wch: 14 }, // รวมทั้งหมด
    { wch: 14 },
    { wch: 12 }, // ขาด/ว่าง
    { wch: 14 }, // % ครอง
  ];

  return ws;
}

/**
 * ส่งออกสมุดงาน Excel ครบทุกแผ่นงาน (Full Workbook)
 */
export function exportNationwidePoliceWorkbook(
  allRows: NationwideUnitRow[],
  activeFilteredRows?: NationwideUnitRow[]
) {
  const wb = XLSX.utils.book_new();

  // 1. แผ่นงาน: ภาพรวมระดับ บช. (30+ กองบัญชาการทั่วประเทศ)
  const bureauRows = allRows.filter((r) => r.unitLevel === 'บช.');
  const wsBureaus = createWorksheetForRows(
    bureauRows,
    'สรุปภาพรวมระดับกองบัญชาการ/สำนักงาน (บช.) ทั่วประเทศ'
  );
  XLSX.utils.book_append_sheet(wb, wsBureaus, '1.ภาพรวม บช.ทั้งประเทศ');

  // 2. แผ่นงาน: ระดับ บก./กอง ทั่วประเทศ
  const divisionRows = allRows.filter((r) => r.unitLevel === 'บก.');
  const wsDivisions = createWorksheetForRows(
    divisionRows,
    'ข้อมูลสถานภาพกำลังพล ระดับกองบังคับการ/กอง (บก.) ทั่วประเทศ'
  );
  XLSX.utils.book_append_sheet(wb, wsDivisions, '2.ระดับ บก.ทั่วประเทศ');

  // 3. แผ่นงาน: ระดับ กก./สภ./สน./ฝ่าย
  const subRows = allRows.filter((r) => r.unitLevel === 'กก.');
  const wsSubs = createWorksheetForRows(
    subRows,
    'ข้อมูลสถานภาพกำลังพล ระดับกองกำกับการ/สถานีตำรวจ (กก./สภ./สน.) ทั่วประเทศ'
  );
  XLSX.utils.book_append_sheet(wb, wsSubs, '3.ระดับ กก.-สภ.-สน.');

  // 4. แผ่นงาน: แถวที่กำลังแสดงผลอยู่ในหน้าจอ (Active Filtered View)
  if (activeFilteredRows && activeFilteredRows.length > 0) {
    const wsActive = createWorksheetForRows(
      activeFilteredRows,
      'ข้อมูลสถานภาพกำลังพลตามมุมมองและตัวกรองที่เลือก'
    );
    XLSX.utils.book_append_sheet(wb, wsActive, 'ตารางตามตัวกรอง');
  }

  // 5. แผ่นงาน: โครงสร้างต่อเนื่องทั้งหมด (บช. ➔ บก. ➔ กก.)
  const wsAllContinuous = createWorksheetForRows(
    allRows,
    'ข้อมูลสถานภาพกำลังพลต่อเนื่องครบทุกระดับโครงสร้าง ตร. (บช.-บก.-กก.)'
  );
  XLSX.utils.book_append_sheet(wb, wsAllContinuous, 'โครงสร้างทั้งหมดครบวงจร');

  // บันทึกไฟล์และเริ่มดาวน์โหลด
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `สถานภาพกำลังพลตำรวจทั้งประเทศ_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * ส่งออกเฉพาะมุมมองที่กำลังเปิดอยู่เป็น Excel แผ่นเดียว
 */
export function exportActiveViewToExcel(
  rows: NationwideUnitRow[],
  titleSuffix = 'รายการปัจจุบัน'
) {
  const wb = XLSX.utils.book_new();
  const ws = createWorksheetForRows(rows, `สถานภาพกำลังพลตำรวจ - ${titleSuffix}`);
  XLSX.utils.book_append_sheet(wb, ws, 'สถานภาพกำลังพล');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `สถานภาพกำลังพล_${titleSuffix}_${dateStr}.xlsx`);
}

/**
 * ส่งออกเป็นไฟล์ CSV
 */
export function exportNationwidePoliceCSV(rows: NationwideUnitRow[]) {
  const headers = [
    'ลำดับ',
    'หน่วยงาน',
    'ระดับ',
    'สังกัด บช.',
    'สังกัด บก.',
    'ผบก_ตำแหน่ง',
    'ผบก_คนครอง',
    'รอง_ผบก_ตำแหน่ง',
    'รอง_ผบก_คนครอง',
    'ผกก_ตำแหน่ง',
    'ผกก_คนครอง',
    'รอง_ผกก_ตำแหน่ง',
    'รอง_ผกก_คนครอง',
    'สว_ตำแหน่ง',
    'สว_คนครอง',
    'รอง_สว_ตำแหน่ง',
    'รอง_สว_คนครอง',
    'รวมสัญญาบัตร_ตำแหน่ง',
    'รวมสัญญาบัตร_คนครอง',
    'รอง_สว_ท_ตำแหน่ง',
    'รอง_สว_ท_คนครอง',
    'ผบ_หมู่_ตำแหน่ง',
    'ผบ_หมู่_คนครอง',
    'รอง_ผบ_หมู่_ตำแหน่ง',
    'รอง_ผบ_หมู่_คนครอง',
    'รวมประทวน_ตำแหน่ง',
    'รวมประทวน_คนครอง',
    'รวมทั้งหมด_ตำแหน่ง',
    'รวมทั้งหมด_คนครอง',
    'ขาด_ว่าง',
    'ร้อยละคนครอง',
  ];

  const lines = [headers.join(',')];

  rows.forEach((r) => {
    const rowVals = [
      `"${r.no}"`,
      `"${r.unitName.replace(/"/g, '""')}"`,
      `"${r.unitLevel}"`,
      `"${r.bureauName.replace(/"/g, '""')}"`,
      `"${(r.divisionName || '').replace(/"/g, '""')}"`,
      r.ranks.pbg.positions,
      r.ranks.pbg.occupied,
      r.ranks.rpbg.positions,
      r.ranks.rpbg.occupied,
      r.ranks.pgk.positions,
      r.ranks.pgk.occupied,
      r.ranks.rpgk.positions,
      r.ranks.rpgk.occupied,
      r.ranks.sw.positions,
      r.ranks.sw.occupied,
      r.ranks.rsw.positions,
      r.ranks.rsw.occupied,
      r.totalCommissioned.positions,
      r.totalCommissioned.occupied,
      r.ranks.rt_dt53.positions,
      r.ranks.rt_dt53.occupied,
      r.ranks.pbm.positions,
      r.ranks.pbm.occupied,
      r.ranks.rpbm.positions,
      r.ranks.rpbm.occupied,
      r.totalNonCommissioned.positions,
      r.totalNonCommissioned.occupied,
      r.grandTotal.positions,
      r.grandTotal.occupied,
      r.vacant,
      r.occupancyPercent,
    ];
    lines.push(rowVals.join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `สถานภาพกำลังพลตำรวจ_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
