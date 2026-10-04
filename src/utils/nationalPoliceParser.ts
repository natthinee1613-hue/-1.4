/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { NationalPoliceUnitRow, NationalPoliceRanks, UnitTierLevel } from '../types/nationalPoliceStatus';
import { enrichNationalUnitRow, createEmptyNationalRanks } from '../data/nationalPoliceStatusData';

export interface NationalPoliceImportResult {
  units: NationalPoliceUnitRow[];
  totalRows: number;
  skippedRows: number;
  errors: string[];
}

function parseNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.max(0, isNaN(val) ? 0 : Math.round(val));
  const str = String(val).replace(/,/g, '').trim();
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

function detectUnitLevel(unitName: string): UnitTierLevel {
  const name = unitName.trim();
  if (name.includes('สน.') || name.includes('สภ.') || name.includes('กก.') || name.includes('ฝ่าย') || name.includes('กลุ่มงาน')) {
    return 'subdivision';
  }
  if (name.includes('บก.') || name.includes('ภ.จว.') || name.includes('กองบังคับการ') || name.startsWith('กอง') || name.includes('ศูนย์พิสูจน์หลักฐาน')) {
    return 'division';
  }
  if (name.includes('บช.') || name.includes('สำนักงาน') || name.includes('ตำรวจภูธรภาค') || name.includes('โรงพยาบาลตำรวจ') || name.includes('โรงเรียนนายร้อยตำรวจ')) {
    return 'bureau';
  }
  return 'division';
}

/**
 * Parse rows array into NationalPoliceUnitRow[]
 */
function parseRawGrid(grid: any[][]): NationalPoliceImportResult {
  const units: NationalPoliceUnitRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // Find the header rows
  let dataStartIndex = 0;
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const rowStr = (grid[r] || []).join(' ');
    if (
      rowStr.includes('ตำแหน่ง') &&
      rowStr.includes('คนครอง')
    ) {
      dataStartIndex = r + 1;
      break;
    } else if (
      rowStr.includes('หน่วยงาน') &&
      (rowStr.includes('ผบก') || rowStr.includes('ผกก') || rowStr.includes('สว'))
    ) {
      // Could be 1-level or 2-level header
      dataStartIndex = r + 1;
      if (grid[r + 1] && grid[r + 1].join(' ').includes('ตำแหน่ง')) {
        dataStartIndex = r + 2;
      }
      break;
    }
  }

  let currentParentBureau = '';
  let currentParentDivision = '';

  for (let i = dataStartIndex; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length === 0) continue;

    // Check if total summary row or empty row
    const firstTwo = `${row[0] || ''} ${row[1] || ''}`.trim();
    if (!firstTwo) continue;
    if (firstTwo.includes('รวมทั้งสิ้น') || firstTwo.includes('รวมทั้งหมด') || firstTwo.includes('ยอดรวม')) {
      continue;
    }

    const unitName = String(row[1] || row[0] || '').trim();
    if (!unitName || unitName === 'หน่วยงาน' || unitName === 'ลำดับ') {
      skipped++;
      continue;
    }

    const no = row[0] ? String(row[0]).trim() : units.length + 1;

    const ranks: NationalPoliceRanks = {
      pbg: { positions: parseNum(row[2]), occupied: parseNum(row[3]) },
      rpbg: { positions: parseNum(row[4]), occupied: parseNum(row[5]) },
      pgk: { positions: parseNum(row[6]), occupied: parseNum(row[7]) },
      rpgk: { positions: parseNum(row[8]), occupied: parseNum(row[9]) },
      sw: { positions: parseNum(row[10]), occupied: parseNum(row[11]) },
      rsw: { positions: parseNum(row[12]), occupied: parseNum(row[13]) },
      rsw_star: {
        positions: parseNum(row[16] !== undefined ? row[16] : row[14]),
        occupied: parseNum(row[17] !== undefined ? row[17] : row[15]),
      },
      pbm: {
        positions: parseNum(row[18] !== undefined ? row[18] : row[16]),
        occupied: parseNum(row[19] !== undefined ? row[19] : row[17]),
      },
      rpbm: {
        positions: parseNum(row[22] !== undefined ? row[22] : row[18]),
        occupied: parseNum(row[23] !== undefined ? row[23] : row[19]),
      },
    };

    const level = detectUnitLevel(unitName);
    if (level === 'bureau') {
      currentParentBureau = unitName;
      currentParentDivision = '';
    } else if (level === 'division') {
      currentParentDivision = unitName;
    }

    const enriched = enrichNationalUnitRow(
      `unit-imported-${Date.now()}-${units.length + 1}`,
      no,
      unitName,
      ranks,
      level,
      currentParentBureau || undefined,
      currentParentDivision || undefined,
      currentParentBureau || undefined,
      'other',
      'นำเข้าจากไฟล์'
    );

    units.push(enriched);
  }

  return {
    units,
    totalRows: units.length,
    skippedRows: skipped,
    errors,
  };
}

/**
 * Parse CSV text
 */
export function parseNationalPoliceCSVText(csvText: string): NationalPoliceImportResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const grid: string[][] = [];

  lines.forEach((line) => {
    const row: string[] = [];
    let inQuotes = false;
    let current = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (inQuotes && line[c + 1] === '"') {
          current += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    grid.push(row);
  });

  return parseRawGrid(grid);
}

/**
 * Parse uploaded Excel file (ArrayBuffer or File)
 */
export async function parseNationalPoliceExcelFile(file: File): Promise<NationalPoliceImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error('ไม่สามารถอ่านข้อมูลไฟล์ได้');
        }

        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel');
        }

        const ws = wb.Sheets[sheetName];
        const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const result = parseRawGrid(grid);
        resolve(result);
      } catch (err: any) {
        reject(new Error(err.message || 'เกิดข้อผิดพลาดในการแปลงไฟล์ Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    };

    reader.readAsArrayBuffer(file);
  });
}
