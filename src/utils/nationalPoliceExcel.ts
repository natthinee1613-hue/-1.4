/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import {
  NationalPoliceRow,
  NationalPoliceRanks,
  NationalPoliceSummary,
} from '../types/nationalPolice';
import {
  computeNationalRowStats,
  createNationalPoliceRow,
  calculateNationalSummary,
  NATIONAL_POLICE_TITLE,
} from '../data/nationalPoliceData';

/**
 * Generates an Excel Workbook formatted with 3-tier headers matching user specification:
 * Row 1: สถานภาพข้าราชการตำรวจทั้งประเทศ
 * Row 2: ลำดับ,บช.,,ผบก.,,รอง ผบก.,,ผกก.,,รอง ผกก.,,สว.,,รอง สว.,,รวมชั้นสัญญาบัตร,,รอง สว.*,,ผบ.หมู่,,รวมชั้นประทวน,,รอง ผบ.หมู่,,รวมทั้งหมด,
 * Row 3: ,บก.,กก.,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง
 */
export function exportNationalPoliceExcel(
  rows: NationalPoliceRow[],
  customTitle = NATIONAL_POLICE_TITLE,
  fileName = 'สถานภาพข้าราชการตำรวจทั้งประเทศ.xlsx'
) {
  const summary = calculateNationalSummary(rows);

  // 1. Construct raw 2D array
  const sheetData: any[][] = [];

  // Row 1: Title (Merged A1:AA1)
  const titleRow = new Array(27).fill('');
  titleRow[0] = customTitle;
  sheetData.push(titleRow);

  // Row 2: Main Headers
  sheetData.push([
    'ลำดับ',
    'บช.',
    '', // for บก. / กก.
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
  ]);

  // Row 3: Sub Headers
  sheetData.push([
    '', // under ลำดับ
    'บก.',
    'กก.',
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
  ]);

  // Data rows
  rows.forEach((row, idx) => {
    sheetData.push([
      idx + 1,
      row.bureau ? `${row.bureau} - ${row.division}` : row.division,
      row.subDivision,
      row.ranks.pbg.positions,
      row.ranks.pbg.occupied,
      row.ranks.rpbg.positions,
      row.ranks.rpbg.occupied,
      row.ranks.pgk.positions,
      row.ranks.pgk.occupied,
      row.ranks.rpgk.positions,
      row.ranks.rpgk.occupied,
      row.ranks.sw.positions,
      row.ranks.sw.occupied,
      row.ranks.rsw.positions,
      row.ranks.rsw.occupied,
      row.totalCommissioned.positions,
      row.totalCommissioned.occupied,
      row.ranks.rsw_special.positions,
      row.ranks.rsw_special.occupied,
      row.ranks.pbm.positions,
      row.ranks.pbm.occupied,
      row.totalNonCommissioned.positions,
      row.totalNonCommissioned.occupied,
      row.ranks.rpbm.positions,
      row.ranks.rpbm.occupied,
      row.grandTotal.positions,
      row.grandTotal.occupied,
    ]);
  });

  // Summary row at bottom
  sheetData.push([
    'รวม',
    'รวมทั้งประเทศ',
    `${rows.length} หน่วยงาน`,
    summary.ranks.pbg.positions,
    summary.ranks.pbg.occupied,
    summary.ranks.rpbg.positions,
    summary.ranks.rpbg.occupied,
    summary.ranks.pgk.positions,
    summary.ranks.pgk.occupied,
    summary.ranks.rpgk.positions,
    summary.ranks.rpgk.occupied,
    summary.ranks.sw.positions,
    summary.ranks.sw.occupied,
    summary.ranks.rsw.positions,
    summary.ranks.rsw.occupied,
    summary.commissionedPositions,
    summary.commissionedOccupied,
    summary.ranks.rsw_special.positions,
    summary.ranks.rsw_special.occupied,
    summary.ranks.pbm.positions,
    summary.ranks.pbm.occupied,
    summary.nonCommissionedPositions,
    summary.nonCommissionedOccupied,
    summary.ranks.rpbm.positions,
    summary.ranks.rpbm.occupied,
    summary.totalPositions,
    summary.totalOccupied,
  ]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set merged cells (0-indexed coordinates)
  ws['!merges'] = [
    // Row 1: Title spanning cols 0 to 26
    { s: { r: 0, c: 0 }, e: { r: 0, c: 26 } },
    // Row 2 & 3: ลำดับ
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    // Row 2: บช. spanning cols 1 and 2
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
    // Rank pairs in Row 2:
    { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },   // ผบก.
    { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },   // รอง ผบก.
    { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },   // ผกก.
    { s: { r: 1, c: 9 }, e: { r: 1, c: 10 } },  // รอง ผกก.
    { s: { r: 1, c: 11 }, e: { r: 1, c: 12 } }, // สว.
    { s: { r: 1, c: 13 }, e: { r: 1, c: 14 } }, // รอง สว.
    { s: { r: 1, c: 15 }, e: { r: 1, c: 16 } }, // รวมชั้นสัญญาบัตร
    { s: { r: 1, c: 17 }, e: { r: 1, c: 18 } }, // รอง สว.*
    { s: { r: 1, c: 19 }, e: { r: 1, c: 20 } }, // ผบ.หมู่
    { s: { r: 1, c: 21 }, e: { r: 1, c: 22 } }, // รวมชั้นประทวน
    { s: { r: 1, c: 23 }, e: { r: 1, c: 24 } }, // รอง ผบ.หมู่
    { s: { r: 1, c: 25 }, e: { r: 1, c: 26 } }, // รวมทั้งหมด
  ];

  // Set column widths
  ws['!cols'] = [
    { wch: 7 },  // ลำดับ
    { wch: 22 }, // บช./บก.
    { wch: 26 }, // กก.
    // 24 rank columns: ตำแหน่ง, คนครอง
    ...new Array(24).fill({ wch: 10 }),
  ];

  // Create workbook and write
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สถานภาพกำลังพลทั้งประเทศ');

  XLSX.writeFile(wb, fileName);
}

/**
 * Export directly to CSV with exact format and UTF-8 BOM
 */
export function exportNationalPoliceCSV(
  rows: NationalPoliceRow[],
  customTitle = NATIONAL_POLICE_TITLE,
  fileName = 'สถานภาพข้าราชการตำรวจทั้งประเทศ.csv'
) {
  const summary = calculateNationalSummary(rows);
  const lines: string[] = [];

  // Line 1: Title
  lines.push(`${customTitle},,,,,,,,,,,,,,,,,,,,,,,,,,`);

  // Line 2: Headers
  lines.push('ลำดับ,บช.,,ผบก.,,รอง ผบก.,,ผกก.,,รอง ผกก.,,สว.,,รอง สว.,,รวมชั้นสัญญาบัตร,,รอง สว.*,,ผบ.หมู่,,รวมชั้นประทวน,,รอง ผบ.หมู่,,รวมทั้งหมด,');

  // Line 3: Sub headers
  lines.push(',บก.,กก.,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง,ตำแหน่ง,คนครอง');

  // Data rows
  rows.forEach((row, idx) => {
    const bkg = row.bureau ? `${row.bureau} - ${row.division}` : row.division;
    const cleanBkg = bkg.replace(/"/g, '""');
    const cleanGk = row.subDivision.replace(/"/g, '""');
    lines.push(
      [
        idx + 1,
        `"${cleanBkg}"`,
        `"${cleanGk}"`,
        row.ranks.pbg.positions,
        row.ranks.pbg.occupied,
        row.ranks.rpbg.positions,
        row.ranks.rpbg.occupied,
        row.ranks.pgk.positions,
        row.ranks.pgk.occupied,
        row.ranks.rpgk.positions,
        row.ranks.rpgk.occupied,
        row.ranks.sw.positions,
        row.ranks.sw.occupied,
        row.ranks.rsw.positions,
        row.ranks.rsw.occupied,
        row.totalCommissioned.positions,
        row.totalCommissioned.occupied,
        row.ranks.rsw_special.positions,
        row.ranks.rsw_special.occupied,
        row.ranks.pbm.positions,
        row.ranks.pbm.occupied,
        row.totalNonCommissioned.positions,
        row.totalNonCommissioned.occupied,
        row.ranks.rpbm.positions,
        row.ranks.rpbm.occupied,
        row.grandTotal.positions,
        row.grandTotal.occupied,
      ].join(',')
    );
  });

  // Summary Row
  lines.push(
    [
      'รวม',
      '"รวมทั้งประเทศ"',
      `"${rows.length} หน่วยงาน"`,
      summary.ranks.pbg.positions,
      summary.ranks.pbg.occupied,
      summary.ranks.rpbg.positions,
      summary.ranks.rpbg.occupied,
      summary.ranks.pgk.positions,
      summary.ranks.pgk.occupied,
      summary.ranks.rpgk.positions,
      summary.ranks.rpgk.occupied,
      summary.ranks.sw.positions,
      summary.ranks.sw.occupied,
      summary.ranks.rsw.positions,
      summary.ranks.rsw.occupied,
      summary.commissionedPositions,
      summary.commissionedOccupied,
      summary.ranks.rsw_special.positions,
      summary.ranks.rsw_special.occupied,
      summary.ranks.pbm.positions,
      summary.ranks.pbm.occupied,
      summary.nonCommissionedPositions,
      summary.nonCommissionedOccupied,
      summary.ranks.rpbm.positions,
      summary.ranks.rpbm.occupied,
      summary.totalPositions,
      summary.totalOccupied,
    ].join(',')
  );

  // UTF-8 BOM
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Result structure for imported data
 */
export interface NationalImportResult {
  success: boolean;
  rows: NationalPoliceRow[];
  totalParsed: number;
  errors: string[];
  warnings: string[];
}

/**
 * Smart file parser for both Excel (.xlsx, .xls) and CSV
 */
export async function parseNationalPoliceFile(file: File): Promise<NationalImportResult> {
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  if (isCSV) {
    const text = await file.text();
    return parseNationalPoliceCSVText(text);
  } else {
    const buffer = await file.arrayBuffer();
    return parseNationalPoliceExcelBuffer(buffer);
  }
}

/**
 * Parse CSV text into NationalPoliceRow array
 */
export function parseNationalPoliceCSVText(csvText: string): NationalImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: NationalPoliceRow[] = [];

  // Parse lines taking care of quotes
  const parsedData = parseCSVToRows(csvText);

  if (parsedData.length < 3) {
    return {
      success: false,
      rows: [],
      totalParsed: 0,
      errors: ['ไฟล์มีข้อมูลไม่เพียงพอ (ต้องมีอย่างน้อย 3 แถว)'],
      warnings,
    };
  }

  // Find start row: look for row with 'ตำแหน่ง' or 'คนครอง' or row after 'ผบก.'
  let dataStartIndex = 3;
  for (let i = 0; i < Math.min(10, parsedData.length); i++) {
    const r = parsedData[i];
    const joined = r.join(' ');
    if (joined.includes('ตำแหน่ง') && joined.includes('คนครอง')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  let validNo = 1;
  for (let i = dataStartIndex; i < parsedData.length; i++) {
    const row = parsedData[i];
    if (!row || row.length < 3) continue;

    const firstCell = String(row[0] || '').trim();
    const secondCell = String(row[1] || '').trim();
    const thirdCell = String(row[2] || '').trim();

    // Skip summary / empty rows
    if (
      firstCell === 'รวม' ||
      firstCell.includes('รวมทั้งประเทศ') ||
      secondCell.includes('รวมทั้งประเทศ') ||
      (!firstCell && !secondCell && !thirdCell)
    ) {
      continue;
    }

    try {
      const numOrZero = (val: any) => {
        const num = parseInt(String(val || '').replace(/[^0-9-]/g, ''), 10);
        return isNaN(num) ? 0 : Math.max(0, num);
      };

      // Extract Bureau / Division / SubDivision
      let bureau = '';
      let division = secondCell;
      let subDivision = thirdCell;

      if (division.includes(' - ')) {
        const parts = division.split(' - ');
        bureau = parts[0].trim();
        division = parts.slice(1).join(' - ').trim();
      } else if (division.includes('/')) {
        const parts = division.split('/');
        bureau = parts[0].trim();
        division = parts.slice(1).join('/').trim();
      }

      const ranks: NationalPoliceRanks = {
        pbg: { positions: numOrZero(row[3]), occupied: numOrZero(row[4]) },
        rpbg: { positions: numOrZero(row[5]), occupied: numOrZero(row[6]) },
        pgk: { positions: numOrZero(row[7]), occupied: numOrZero(row[8]) },
        rpgk: { positions: numOrZero(row[9]), occupied: numOrZero(row[10]) },
        sw: { positions: numOrZero(row[11]), occupied: numOrZero(row[12]) },
        rsw: { positions: numOrZero(row[13]), occupied: numOrZero(row[14]) },
        // Skip col 15 & 16 (computed totalCommissioned in export, or read from it)
        rsw_special: { positions: numOrZero(row[17]), occupied: numOrZero(row[18]) },
        pbm: { positions: numOrZero(row[19]), occupied: numOrZero(row[20]) },
        // Skip col 21 & 22 (computed totalNonCommissioned)
        rpbm: { positions: numOrZero(row[23]), occupied: numOrZero(row[24]) },
      };

      const natRow = createNationalPoliceRow(
        `imp-${Date.now()}-${validNo}`,
        validNo,
        bureau || 'ตร.',
        division || 'หน่วยงาน',
        subDivision || 'ฝ่ายงาน',
        ranks
      );

      rows.push(natRow);
      validNo++;
    } catch (err: any) {
      warnings.push(`แถวที่ ${i + 1}: ${err.message || 'รูปแบบไม่ถูกต้อง'}`);
    }
  }

  return {
    success: rows.length > 0,
    rows,
    totalParsed: rows.length,
    errors,
    warnings,
  };
}

/**
 * Parse Excel Buffer into NationalPoliceRow array
 */
export function parseNationalPoliceExcelBuffer(buffer: ArrayBuffer): NationalImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: NationalPoliceRow[] = [];

  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    if (!sheet) {
      return {
        success: false,
        rows: [],
        totalParsed: 0,
        errors: ['ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel'],
        warnings,
      };
    }

    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!aoa || aoa.length < 3) {
      return {
        success: false,
        rows: [],
        totalParsed: 0,
        errors: ['แผ่นงานมีแถวข้อมูลน้อยเกินไป'],
        warnings,
      };
    }

    // Find start row: look for row with 'ตำแหน่ง' or 'คนครอง'
    let dataStartIndex = 3;
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      const r = aoa[i];
      const joined = (r || []).map(String).join(' ');
      if (joined.includes('ตำแหน่ง') && joined.includes('คนครอง')) {
        dataStartIndex = i + 1;
        break;
      }
    }

    let validNo = 1;
    for (let i = dataStartIndex; i < aoa.length; i++) {
      const row = aoa[i];
      if (!row || row.length < 3) continue;

      const firstCell = String(row[0] || '').trim();
      const secondCell = String(row[1] || '').trim();
      const thirdCell = String(row[2] || '').trim();

      if (
        firstCell === 'รวม' ||
        firstCell.includes('รวมทั้งประเทศ') ||
        secondCell.includes('รวมทั้งประเทศ') ||
        (!firstCell && !secondCell && !thirdCell)
      ) {
        continue;
      }

      const numOrZero = (val: any) => {
        const num = parseInt(String(val || '').replace(/[^0-9-]/g, ''), 10);
        return isNaN(num) ? 0 : Math.max(0, num);
      };

      let bureau = '';
      let division = secondCell;
      let subDivision = thirdCell;

      if (division.includes(' - ')) {
        const parts = division.split(' - ');
        bureau = parts[0].trim();
        division = parts.slice(1).join(' - ').trim();
      }

      const ranks: NationalPoliceRanks = {
        pbg: { positions: numOrZero(row[3]), occupied: numOrZero(row[4]) },
        rpbg: { positions: numOrZero(row[5]), occupied: numOrZero(row[6]) },
        pgk: { positions: numOrZero(row[7]), occupied: numOrZero(row[8]) },
        rpgk: { positions: numOrZero(row[9]), occupied: numOrZero(row[10]) },
        sw: { positions: numOrZero(row[11]), occupied: numOrZero(row[12]) },
        rsw: { positions: numOrZero(row[13]), occupied: numOrZero(row[14]) },
        rsw_special: { positions: numOrZero(row[17]), occupied: numOrZero(row[18]) },
        pbm: { positions: numOrZero(row[19]), occupied: numOrZero(row[20]) },
        rpbm: { positions: numOrZero(row[23]), occupied: numOrZero(row[24]) },
      };

      const natRow = createNationalPoliceRow(
        `imp-xl-${Date.now()}-${validNo}`,
        validNo,
        bureau || 'ตร.',
        division || 'หน่วยงาน',
        subDivision || 'ฝ่ายงาน',
        ranks
      );

      rows.push(natRow);
      validNo++;
    }

    return {
      success: rows.length > 0,
      rows,
      totalParsed: rows.length,
      errors,
      warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      totalParsed: 0,
      errors: [`เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ${err.message}`],
      warnings,
    };
  }
}

/**
 * Standard CSV line parser with quote handling
 */
function parseCSVToRows(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r\n|\n|\r/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }

  return result;
}
