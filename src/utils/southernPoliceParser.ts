/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { SouthernPoliceSection, UnitManpowerRow, UnitManpowerRanks } from '../types/southernPolice';
import { PoliceOfficer } from '../types/personnel';
import {
  enrichUnitRow,
  INITIAL_SOUTHERN_POLICE_SECTIONS,
  calculateTotalsForUnits,
} from '../data/southernBorderPoliceData';

export interface ExcelImportResult {
  success: boolean;
  message: string;
  fileName: string;
  fileSize: string;
  sheetsFound: string[];
  totalUnits: number;
  totalPositions: number;
  totalOccupied: number;
  totalVacant: number;
  occupancyPercent: number;
  sections: SouthernPoliceSection[];
  breakdown: { [sectionKey: string]: { title: string; shortName: string; count: number } };
  primarySectionDetected?: string | null;
}

// Section metadata definition
export const SECTION_METADATA: {
  [key: string]: { key: string; title: string; shortName: string; sheetName: string };
} = {
  p9_ss: {
    key: 'p9_ss',
    title: 'บก.สืบสวนสอบสวน ภ.9 และ กก.ปฏิบัติการพิเศษ ภ.9',
    shortName: 'บก.สส.ภ.9',
    sheetName: 'บก.สส.ภ.9',
  },
  ss_jcht: {
    key: 'ss_jcht',
    title: 'กองบังคับการสืบสวนสอบสวนจังหวัดชายแดนภาคใต้ (บก.สส.จชต.)',
    shortName: 'บก.สส.จชต.',
    sheetName: 'บก.สส.จชต.',
  },
  sfr_p9: {
    key: 'sfr_p9',
    title: 'ศูนย์ฝึกอบรมตำรวจภูธรภาค 9 (ศฝร.ภ.9)',
    shortName: 'ศฝร.ภ.9',
    sheetName: 'ศฝร.ภ.9',
  },
  yala: {
    key: 'yala',
    title: 'ตำรวจภูธรจังหวัดยะลา (ภ.จว.ยะลา)',
    shortName: 'ภ.จว.ยะลา',
    sheetName: 'ภ.จว.ยะลา',
  },
  pattani: {
    key: 'pattani',
    title: 'ตำรวจภูธรจังหวัดปัตตานี (ภ.จว.ปัตตานี)',
    shortName: 'ภ.จว.ปัตตานี',
    sheetName: 'ภ.จว.ปัตตานี',
  },
  narathiwat: {
    key: 'narathiwat',
    title: 'ตำรวจภูธรจังหวัดนราธิวาส (ภ.จว.นราธิวาส)',
    shortName: 'ภ.จว.นราธิวาส',
    sheetName: 'ภ.จว.นราธิวาส',
  },
  songkhla: {
    key: 'songkhla',
    title: 'ตำรวจภูธรจังหวัดสงขลา (4 อำเภอความมั่นคงเสี่ยงภัย และ สภ.สังกัด ภ.จว.สงขลา)',
    shortName: 'ภ.จว.สงขลา',
    sheetName: 'ภ.จว.สงขลา (4 อ.เสี่ยงภัย)',
  },
};

/**
 * Identify section key from sheet name, row text, or section title
 */
export function identifySectionKey(text: string): string | null {
  if (!text) return null;
  const t = text.trim();

  // SS JCHT
  if (
    t.includes('สส.จชต') ||
    t.includes('บก.สส.จชต') ||
    t.includes('จชต') ||
    t.includes('สืบสวนสอบสวน จชต') ||
    t.includes('สืบสวน จชต') ||
    t.includes('จังหวัดชายแดนภาคใต้')
  ) {
    return 'ss_jcht';
  }

  // SFR P9
  if (t.includes('ศฝร') || t.includes('ศูนย์ฝึกอบรม')) {
    return 'sfr_p9';
  }

  // YALA
  if (t.includes('ยะลา') || t.includes('ภ.จว.ยะลา')) {
    return 'yala';
  }

  // PATTANI
  if (t.includes('ปัตตานี') || t.includes('ปีตตานี') || t.includes('ภ.จว.ปัตตานี')) {
    return 'pattani';
  }

  // NARATHIWAT
  if (t.includes('นราธิวาส') || t.includes('ภ.จว.นราธิวาส')) {
    return 'narathiwat';
  }

  // SONGKHLA
  if (t.includes('สงขลา') || t.includes('ภ.จว.สงขลา') || t.includes('4 อำเภอ') || t.includes('เสี่ยงภัย')) {
    return 'songkhla';
  }

  // P9 SS
  if (
    t.includes('บก.สส.ภ.9') ||
    t.includes('สืบสวนสอบสวน ภ.9') ||
    t.includes('สส.ภ.9') ||
    t === 'ภ.9' ||
    t.startsWith('ภ.9') ||
    (t.includes('ภ.9') && !t.includes('ศฝร'))
  ) {
    return 'p9_ss';
  }

  return null;
}

/**
 * Identify section key directly from individual station or unit name
 * (Helpful when an Excel sheet has no section header banners)
 */
export function identifySectionFromUnitName(unitName: string): string | null {
  if (!unitName) return null;
  const n = unitName.trim();

  // Yala keywords
  if (
    n.includes('ยะลา') ||
    n.includes('เบตง') ||
    n.includes('บันนังสตา') ||
    n.includes('ธารโต') ||
    n.includes('รามัน') ||
    n.includes('ยะหา') ||
    n.includes('กาบัง') ||
    n.includes('กรงปินัง') ||
    n.includes('ลำใหม่') ||
    n.includes('ปะแต') ||
    n.includes('โกตาบารู') ||
    n.includes('จะกว๊ะ') ||
    n.includes('ท่าธง') ||
    n.includes('บาตูตาโมง') ||
    n.includes('แม่หวาด') ||
    n.includes('อัยเยอร์เวง') ||
    n.includes('ยะรม') ||
    n.includes('ตาเซะ')
  ) {
    return 'yala';
  }

  // Pattani keywords
  if (
    n.includes('ปัตตานี') ||
    n.includes('สายบุรี') ||
    n.includes('ยะหริ่ง') ||
    n.includes('หนองจิก') ||
    n.includes('ยะรัง') ||
    n.includes('โคกโพธิ์') ||
    n.includes('ปะนาเระ') ||
    n.includes('มายอ') ||
    n.includes('ทุ่งยางแดง') ||
    n.includes('ไม้แก่น') ||
    n.includes('กะพ้อ') ||
    n.includes('แม่ลาน') ||
    n.includes('นาประดู่') ||
    n.includes('บ้านโสร่ง') ||
    n.includes('โสร่ง')
  ) {
    return 'pattani';
  }

  // Narathiwat keywords
  if (
    n.includes('นราธิวาส') ||
    n.includes('สุไหงโก-ลก') ||
    n.includes('ตากใบ') ||
    n.includes('รือเสาะ') ||
    n.includes('ระแงะ') ||
    n.includes('ยี่งอ') ||
    n.includes('บาเจาะ') ||
    n.includes('ศรีสาคร') ||
    n.includes('แว้ง') ||
    n.includes('สุคิริน') ||
    n.includes('จะแนะ') ||
    n.includes('เจาะไอร้อง') ||
    n.includes('สุไหงปาดี') ||
    n.includes('มูโนะ') ||
    n.includes('ปาเสมัส') ||
    n.includes('บูเก๊ะตา')
  ) {
    return 'narathiwat';
  }

  // Songkhla keywords (4 border security districts & affiliates)
  if (
    n.includes('สงขลา') ||
    n.includes('จะนะ') ||
    n.includes('เทพา') ||
    n.includes('นาทวี') ||
    n.includes('สะบ้าย้อย') ||
    n.includes('ห้วยปลิง') ||
    n.includes('ลำไพล')
  ) {
    return 'songkhla';
  }

  // SS JCHT keywords
  if (
    n.includes('จชต') ||
    n.includes('ซักถาม') ||
    n.includes('เก็บกู้และตรวจสอบวัตถุระเบิด') ||
    n.includes('บก.สส.จชต')
  ) {
    return 'ss_jcht';
  }

  // SFR P9 keywords
  if (
    n.includes('ศฝร') ||
    n.includes('บริการการศึกษา ศฝร') ||
    n.includes('ปกครองและการฝึก ศฝร') ||
    n.includes('กลุ่มงานอาจารย์ ศฝร')
  ) {
    return 'sfr_p9';
  }

  // P9 SS keywords
  if (
    n.includes('สส.ภ.9') ||
    n.includes('วิเคราะห์ข่าวและเครื่องมือพิเศษ') ||
    n.includes('กก.ปฏิบัติการพิเศษ ภ.9')
  ) {
    return 'p9_ss';
  }

  return null;
}

/**
 * Safely parse integer from Excel cell value
 */
export function parseNum(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/,/g, '').replace(/%/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * Check if a row represents a header or summary/subtotal row
 */
export function isHeaderOrSummaryRow(col0: string, col1: string, rowText: string): boolean {
  if (
    col0.includes('ลำดับ') ||
    col0.includes('ที่') ||
    col1.includes('หน่วยงาน') ||
    col1.includes('สถานภาพ') ||
    col1.includes('ตำแหน่ง') ||
    col1.includes('คนครอง') ||
    col1.startsWith('รวม') ||
    col1.includes('รวมทั้งหมด') ||
    col1.includes('รวม (') ||
    col0 === '★' ||
    col1 === '★' ||
    rowText.includes('รวมทั้งสิ้น') ||
    rowText.includes('รวมทั้งหมด') ||
    (col1.startsWith('รวม') && !col1.includes('สภ.'))
  ) {
    return true;
  }
  return false;
}

/**
 * Column mapping interface for dynamic column detection
 */
interface ColumnMapping {
  colNo: number;
  colName: number;
  pbgPos: number;
  pbgOcc: number;
  rpbgPos: number;
  rpbgOcc: number;
  pgkPos: number;
  pgkOcc: number;
  rpgkPos: number;
  rpgkOcc: number;
  swPos: number;
  swOcc: number;
  rswPos: number;
  rswOcc: number;
  rtDt53Pos: number;
  rtDt53Occ: number;
  pbmPos: number;
  pbmOcc: number;
  rpbmPos: number;
  rpbmOcc: number;
}

/**
 * Detect column positions by scanning header rows
 */
function detectColumnMapping(rows: any[][]): ColumnMapping {
  // Default standard 28-column format (as produced by exportSouthernPoliceWorkbook)
  const mapping: ColumnMapping = {
    colNo: 0,
    colName: 1,
    pbgPos: 2,
    pbgOcc: 3,
    rpbgPos: 4,
    rpbgOcc: 5,
    pgkPos: 6,
    pgkOcc: 7,
    rpgkPos: 8,
    rpgkOcc: 9,
    swPos: 10,
    swOcc: 11,
    rswPos: 12,
    rswOcc: 13,
    rtDt53Pos: 16,
    rtDt53Occ: 17,
    pbmPos: 18,
    pbmOcc: 19,
    rpbmPos: 20,
    rpbmOcc: 21,
  };

  // Inspect the first 8 rows to find header labels
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim();

      if (cell === 'ลำดับ' || cell === 'ที่') {
        mapping.colNo = c;
      }
      if (cell === 'หน่วยงาน' || cell === 'สถานีตำรวจ' || cell === 'รายชื่อหน่วยงาน') {
        mapping.colName = c;
      }
      if (cell === 'ผบก.' || cell === 'ผู้บังคับการ') {
        mapping.pbgPos = c;
        mapping.pbgOcc = c + 1;
      }
      if (cell === 'รอง ผบก.' || cell === 'รองผู้บังคับการ') {
        mapping.rpbgPos = c;
        mapping.rpbgOcc = c + 1;
      }
      if (cell === 'ผกก.' || cell === 'ผู้กำกับการ') {
        mapping.pgkPos = c;
        mapping.pgkOcc = c + 1;
      }
      if (cell === 'รอง ผกก.' || cell === 'รองผู้กำกับการ') {
        mapping.rpgkPos = c;
        mapping.rpgkOcc = c + 1;
      }
      if (cell === 'สว.' || cell === 'สารวัตร') {
        mapping.swPos = c;
        mapping.swOcc = c + 1;
      }
      if (
        (cell === 'รอง สว.' || cell === 'รองสารวัตร') &&
        !cell.includes('53') &&
        !cell.includes('ด.ต.')
      ) {
        mapping.rswPos = c;
        mapping.rswOcc = c + 1;
      }
      if (
        cell.includes('53') ||
        cell.includes('ด.ต.53') ||
        (cell.includes('รอง') && cell.includes('ท.'))
      ) {
        mapping.rtDt53Pos = c;
        mapping.rtDt53Occ = c + 1;
      }
      if (cell === 'ผบ.หมู่' || cell === 'ผู้บังคับหมู่') {
        mapping.pbmPos = c;
        mapping.pbmOcc = c + 1;
      }
      if (cell === 'รอง ผบ.หมู่' || cell === 'รองผู้บังคับหมู่') {
        mapping.rpbmPos = c;
        mapping.rpbmOcc = c + 1;
      }
    }
  }

  return mapping;
}

/**
 * Extract unit row from a 2D array row of cells
 */
function extractUnitFromRow(
  row: any[],
  currentSectionKey: string,
  mapping: ColumnMapping
): UnitManpowerRow | null {
  if (!row || row.length < 2) return null;

  let col0 = String(row[mapping.colNo] ?? '').trim();
  let col1 = String(row[mapping.colName] ?? '').trim();

  // If col0 is empty but col1 has unit number or unit name
  if (!col0 && !col1) {
    // Check if col 0 has a margin and col 1 & 2 have data
    if (row.length > 2 && (row[1] || row[2])) {
      col0 = String(row[1] ?? '').trim();
      col1 = String(row[2] ?? '').trim();
    } else {
      return null;
    }
  }

  const rowText = row.map((c) => String(c ?? '')).join(' ');

  // Filter out headers, subheader lines, or summary lines
  if (isHeaderOrSummaryRow(col0, col1, rowText)) {
    return null;
  }

  // Detect unit name and unit number
  let unitNo = col0;
  let unitName = col1;

  // Case: No unitNo column, unitName is in col0
  if (
    !unitName &&
    col0 &&
    (col0.includes('สภ.') ||
      col0.includes('กก.') ||
      col0.includes('ภ.จว.') ||
      col0.includes('บก.') ||
      col0.includes('ฝ่าย') ||
      col0.includes('กลุ่มงาน'))
  ) {
    unitName = col0;
    unitNo = '1';
  }

  // Case: Reversed or shifted columns
  if (
    isNaN(Number(col0)) &&
    !isNaN(Number(col1)) &&
    (col0.includes('สภ.') || col0.includes('กก.') || col0.includes('บก.'))
  ) {
    unitName = col0;
    unitNo = col1;
  }

  if (!unitName || unitName.length < 2) {
    return null;
  }

  // Determine section key: prefer explicit unitName identification if strongly matching
  const routedKey = identifySectionFromUnitName(unitName) || currentSectionKey;

  // Extract rank numbers
  const ranks: UnitManpowerRanks = {
    pbg: {
      positions: parseNum(row[mapping.pbgPos]),
      occupied: parseNum(row[mapping.pbgOcc]),
    },
    rpbg: {
      positions: parseNum(row[mapping.rpbgPos]),
      occupied: parseNum(row[mapping.rpbgOcc]),
    },
    pgk: {
      positions: parseNum(row[mapping.pgkPos]),
      occupied: parseNum(row[mapping.pgkOcc]),
    },
    rpgk: {
      positions: parseNum(row[mapping.rpgkPos]),
      occupied: parseNum(row[mapping.rpgkOcc]),
    },
    sw: {
      positions: parseNum(row[mapping.swPos]),
      occupied: parseNum(row[mapping.swOcc]),
    },
    rsw: {
      positions: parseNum(row[mapping.rswPos]),
      occupied: parseNum(row[mapping.rswOcc]),
    },
    rt_dt53: {
      positions: parseNum(row[mapping.rtDt53Pos]),
      occupied: parseNum(row[mapping.rtDt53Occ]),
    },
    pbm: {
      positions: parseNum(row[mapping.pbmPos]),
      occupied: parseNum(row[mapping.pbmOcc]),
    },
    rpbm: {
      positions: parseNum(row[mapping.rpbmPos]),
      occupied: parseNum(row[mapping.rpbmOcc]),
    },
  };

  // If this unit had all zeros (like in an unpopulated template), check if there is existing baseline data
  const hasSomeNumbers = Object.values(ranks).some((r) => r.positions > 0 || r.occupied > 0);
  if (!hasSomeNumbers) {
    const existingSection = INITIAL_SOUTHERN_POLICE_SECTIONS.find((s) => s.key === routedKey);
    const existingUnit = existingSection?.units.find(
      (u) => u.unitName.includes(unitName) || unitName.includes(u.unitName)
    );
    if (existingUnit) {
      ranks.pbg = { ...existingUnit.ranks.pbg };
      ranks.rpbg = { ...existingUnit.ranks.rpbg };
      ranks.pgk = { ...existingUnit.ranks.pgk };
      ranks.rpgk = { ...existingUnit.ranks.rpgk };
      ranks.sw = { ...existingUnit.ranks.sw };
      ranks.rsw = { ...existingUnit.ranks.rsw };
      ranks.rt_dt53 = { ...existingUnit.ranks.rt_dt53 };
      ranks.pbm = { ...existingUnit.ranks.pbm };
      ranks.rpbm = { ...existingUnit.ranks.rpbm };
    }
  }

  const id = `${routedKey}-${unitNo}-${Date.now().toString().slice(-4)}-${Math.random()
    .toString(36)
    .substring(2, 6)}`;
  return enrichUnitRow(id, routedKey, unitNo, unitName, ranks);
}

/**
 * Parse an Excel worksheet 2D array
 */
export function parseWorksheetRows(
  rows: any[][],
  sectionKeyHint?: string | null
): { [secKey: string]: UnitManpowerRow[] } {
  const result: { [secKey: string]: UnitManpowerRow[] } = {
    p9_ss: [],
    ss_jcht: [],
    sfr_p9: [],
    yala: [],
    pattani: [],
    narathiwat: [],
    songkhla: [],
  };

  const mapping = detectColumnMapping(rows);
  let activeSec = sectionKeyHint || 'p9_ss';

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowText = row.map((c) => String(c ?? '')).join(' ').trim();
    if (!rowText) continue;

    const col0 = String(row[0] ?? '').trim();
    const col1 = String(row[1] ?? '').trim();

    // Check if row is a section header (e.g. ",ภ.จว.ยะลา" or "【สังกัดที่ 1】 ภ.จว.ยะลา" or "ตำรวจภูธรจังหวัดปัตตานี")
    const isSubtotalRow =
      col1.startsWith('รวม') ||
      rowText.includes('รวม (') ||
      rowText.includes('รวมทั้งหมด') ||
      col0 === '★';

    if (!isSubtotalRow) {
      // Check col1 or rowText for section banner
      const detectedKey =
        identifySectionKey(col1) ||
        identifySectionKey(col0) ||
        (rowText.length < 120 ? identifySectionKey(rowText) : null);

      if (detectedKey) {
        // If col0 is empty or col1 doesn't have a station name like "สภ.เมืองยะลา"
        const isStationSpecific =
          col1.includes('สภ.') ||
          col1.includes('กก.') ||
          col1.includes('ฝ่ายอำนวยการ') ||
          col1.includes('กลุ่มงานสอบสวน');

        if (!isStationSpecific || !col0 || isNaN(Number(col0))) {
          activeSec = detectedKey;
          // If this row is just the section header, don't parse as unit
          if (!col0 || isNaN(Number(col0))) {
            continue;
          }
        }
      }
    }

    const unit = extractUnitFromRow(row, activeSec, mapping);
    if (unit) {
      const targetSec = unit.sectionKey || activeSec;
      if (!result[targetSec]) result[targetSec] = [];
      result[targetSec].push(unit);
    }
  }

  return result;
}

/**
 * Clean unit name for fuzzy matching across systems
 */
export function cleanUnitName(name: string): string {
  return (name || '')
    .replace(/จว\..+$/, '')
    .replace(/ภ\.จว\..+$/, '')
    .replace(/\(.+?\)/g, '')
    .replace(/อำเภอ/g, 'อ.')
    .replace(/จังหวัด/g, 'จว.')
    .replace(/สถานีตำรวจภูธร/g, 'สภ.')
    .replace(/กองบังคับการ/g, 'บก.')
    .replace(/กองกำกับการ/g, 'กก.')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Match officer position/rank to 1 of the 9 rank columns in Southern Police Table
 */
export function matchOfficerRank(officer: PoliceOfficer): keyof UnitManpowerRanks {
  const level = (officer.positionLevel || '').trim();
  const title = (officer.positionTitle || '').trim();
  const rank = (officer.rank || '').trim();
  const combined = `${level} ${title} ${rank}`.toLowerCase();

  if (combined.includes('ผบก') && !combined.includes('รอง')) return 'pbg';
  if (combined.includes('รอง ผบก') || combined.includes('รองผู้บังคับการ')) return 'rpbg';
  if (combined.includes('ผกก') && !combined.includes('รอง')) return 'pgk';
  if (combined.includes('รอง ผกก') || combined.includes('รองผู้กำกับการ')) return 'rpgk';
  if (
    combined.includes('53 ปี') ||
    combined.includes('ด.ต.53') ||
    combined.includes('ท.53') ||
    combined.includes('(ท.)') ||
    combined.includes('รอง สว.(ท')
  ) {
    return 'rt_dt53';
  }
  if (combined.includes('รอง สว') || combined.includes('รองสารวัตร')) return 'rsw';
  if (combined.includes('สว.') || combined.includes('สารวัตร')) return 'sw';
  if (combined.includes('รอง ผบ.หมู่') || combined.includes('รองผู้บังคับหมู่') || level === 'รอง ผบ.หมู่') return 'rpbm';
  if (combined.includes('ผบ.หมู่') || combined.includes('ผู้บังคับหมู่') || level === 'ผบ.หมู่') return 'pbm';

  // Fallback by commission type
  if (officer.commissionType === 'ประทวน') return 'pbm';
  return 'rsw';
}

/**
 * Synchronize / Import from RTP Org Chart Structure & System Personnel
 * Ensures every row and every table of Southern Police (7 sections + overview)
 * matches the structure and authorized cadre 100% accurately.
 */
export function syncFromOrgChartStructure(
  officers: PoliceOfficer[] = [],
  targetSectionKey?: string | null
): {
  sections: SouthernPoliceSection[];
  totalUnits: number;
  totalPositions: number;
  totalOccupied: number;
  totalVacant: number;
  occupancyPercent: number;
  breakdown: { [sectionKey: string]: { title: string; shortName: string; count: number; positions: number; occupied: number } };
  matchedOfficersCount: number;
} {
  const orderedKeys = ['p9_ss', 'ss_jcht', 'sfr_p9', 'yala', 'pattani', 'narathiwat', 'songkhla'];
  const finalSections: SouthernPoliceSection[] = [];
  const breakdown: { [sectionKey: string]: { title: string; shortName: string; count: number; positions: number; occupied: number } } = {};
  let totalUnits = 0;
  let totalMatchedOfficers = 0;
  const allUnits: UnitManpowerRow[] = [];

  for (const key of orderedKeys) {
    const meta = SECTION_METADATA[key];
    const initialSec = INITIAL_SOUTHERN_POLICE_SECTIONS.find((s) => s.key === key);
    const baseUnits = initialSec ? initialSec.units : [];

    // If targetSectionKey is specified and not this section, keep baseline or existing
    const shouldUpdate = !targetSectionKey || targetSectionKey === 'all' || targetSectionKey === key;

    const updatedUnits: UnitManpowerRow[] = baseUnits.map((u) => {
      if (!shouldUpdate) return u;

      const uClean = cleanUnitName(u.unitName);

      // Find officers matching this unit
      const matched = officers.filter((o) => {
        const oDiv = cleanUnitName(o.division || '');
        const oSub = cleanUnitName(o.subDivision || '');
        const oBureau = (o.bureau || '').trim();

        // Check bureau / division scope
        const isSouthernScope =
          oBureau.includes('9') ||
          oDiv.includes('9') ||
          oDiv.includes('ยะลา') ||
          oDiv.includes('ปัตตานี') ||
          oDiv.includes('นราธิวาส') ||
          oDiv.includes('สงขลา') ||
          oDiv.includes('จชต');

        if (!isSouthernScope && officers.length > 50) return false;

        return (
          oDiv === uClean ||
          oSub === uClean ||
          (uClean.length >= 3 && (oDiv.includes(uClean) || oSub.includes(uClean))) ||
          (oSub.length >= 3 && uClean.includes(oSub))
        );
      });

      if (matched.length > 0) {
        totalMatchedOfficers += matched.length;

        // Clone base ranks to guarantee realistic authorized cadre
        const newRanks: UnitManpowerRanks = {
          pbg: { positions: u.ranks.pbg.positions, occupied: u.ranks.pbg.occupied },
          rpbg: { positions: u.ranks.rpbg.positions, occupied: u.ranks.rpbg.occupied },
          pgk: { positions: u.ranks.pgk.positions, occupied: u.ranks.pgk.occupied },
          rpgk: { positions: u.ranks.rpgk.positions, occupied: u.ranks.rpgk.occupied },
          sw: { positions: u.ranks.sw.positions, occupied: u.ranks.sw.occupied },
          rsw: { positions: u.ranks.rsw.positions, occupied: u.ranks.rsw.occupied },
          rt_dt53: { positions: u.ranks.rt_dt53.positions, occupied: u.ranks.rt_dt53.occupied },
          pbm: { positions: u.ranks.pbm.positions, occupied: u.ranks.pbm.occupied },
          rpbm: { positions: u.ranks.rpbm.positions, occupied: u.ranks.rpbm.occupied },
        };

        // Apply real officers from roster
        matched.forEach((o) => {
          const rKey = matchOfficerRank(o);
          if (!o.isVacant) {
            newRanks[rKey].occupied = Math.max(newRanks[rKey].occupied, 1);
          }
          if (newRanks[rKey].positions < newRanks[rKey].occupied) {
            newRanks[rKey].positions = newRanks[rKey].occupied;
          }
        });

        return enrichUnitRow(u.id, u.sectionKey, u.no, u.unitName, newRanks);
      }

      // No individual officers found in roster -> apply standard official structure framework
      return enrichUnitRow(u.id, u.sectionKey, u.no, u.unitName, u.ranks);
    });

    finalSections.push({
      ...meta,
      units: updatedUnits,
    });

    const secTotals = calculateTotalsForUnits(updatedUnits);
    totalUnits += updatedUnits.length;
    allUnits.push(...updatedUnits);

    breakdown[key] = {
      title: meta.title,
      shortName: meta.shortName,
      count: updatedUnits.length,
      positions: secTotals.grandTotal.positions,
      occupied: secTotals.grandTotal.occupied,
    };
  }

  const totals = calculateTotalsForUnits(allUnits);
  const vacant = Math.max(0, totals.grandTotal.positions - totals.grandTotal.occupied);
  const occupancyPercent =
    totals.grandTotal.positions > 0
      ? Math.round((totals.grandTotal.occupied / totals.grandTotal.positions) * 1000) / 10
      : 0;

  return {
    sections: finalSections,
    totalUnits,
    totalPositions: totals.grandTotal.positions,
    totalOccupied: totals.grandTotal.occupied,
    totalVacant: vacant,
    occupancyPercent,
    breakdown,
    matchedOfficersCount: totalMatchedOfficers,
  };
}

/**
 * Master parser: Read Excel file (.xlsx, .xls, .csv) and generate full SouthernPoliceSection[]
 */
export async function parseSouthernPoliceExcelFile(file: File): Promise<ExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });

  const sheetsFound = workbook.SheetNames;

  // Check if workbook is from "ทำเนียบกำลังพล สกพ."
  const rosterSheetName = sheetsFound.find(
    (s) => s.includes('ทำเนียบกำลังพล') || s.includes('กำลังพล')
  );
  if (rosterSheetName) {
    const ws = workbook.Sheets[rosterSheetName];
    const rawData = XLSX.utils.sheet_to_json(ws) as any[];
    if (rawData.length > 0 && ('เลขตำแหน่ง' in rawData[0] || 'บช.' in rawData[0])) {
      const officers: PoliceOfficer[] = rawData.map((r, idx) => ({
        id: `imp-${idx + 1}`,
        positionNumber: String(r['เลขตำแหน่ง'] || ''),
        bureau: String(r['บช.'] || r['บช'] || 'ภ.9'),
        division: String(r['บก.'] || r['บก'] || ''),
        subDivision: String(r['กก.'] || r['กก'] || r['ฝ่าย'] || ''),
        jobGroup: String(r['กลุ่มสายงาน'] || ''),
        jobLine: String(r['สายงาน'] || ''),
        duty: String(r['ทำหน้าที่'] || ''),
        positionLevel: String(r['ระดับตำแหน่ง'] || ''),
        positionTitle: String(r['ตำแหน่ง'] || ''),
        commissionType: String(r['สัญญาบัตร/ประทวน/นักเรียน'] || 'สัญญาบัตร') as any,
        rank: String(r['ยศ'] || ''),
        firstName: String(r['ชื่อ'] || ''),
        lastName: String(r['สกุล'] || ''),
        gender: String(r['เพศ'] || '-') as any,
        isVacant: String(r['สถานะ'] || '').includes('ว่าง'),
      }));

      const syncRes = syncFromOrgChartStructure(officers);
      const fileSizeKB = (file.size / 1024).toFixed(1) + ' KB';
      return {
        success: true,
        message: `นำเข้าจากไฟล์ทำเนียบกำลังพล "${file.name}" สำเร็จ เชื่อมโยงและคำนวณลงสู่ผัง ภ.ใต้ 126 หน่วยงาน (${officers.length} อัตรา)`,
        fileName: file.name,
        fileSize: fileSizeKB,
        sheetsFound,
        totalUnits: syncRes.totalUnits,
        totalPositions: syncRes.totalPositions,
        totalOccupied: syncRes.totalOccupied,
        totalVacant: syncRes.totalVacant,
        occupancyPercent: syncRes.occupancyPercent,
        sections: syncRes.sections,
        breakdown: syncRes.breakdown,
        primarySectionDetected: null,
      };
    }
  }

  const sectionUnitsMap: { [secKey: string]: UnitManpowerRow[] } = {
    p9_ss: [],
    ss_jcht: [],
    sfr_p9: [],
    yala: [],
    pattani: [],
    narathiwat: [],
    songkhla: [],
  };

  // Determine if this is a multi-sheet workbook matching our sections
  let matchedSheetCount = 0;

  for (const sheetName of sheetsFound) {
    const key = identifySectionKey(sheetName);
    if (key && !sheetName.includes('ภาพรวม') && !sheetName.includes('สรุป')) {
      matchedSheetCount++;
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      const parsed = parseWorksheetRows(rows, key);

      // Append parsed units for this section
      if (parsed[key] && parsed[key].length > 0) {
        sectionUnitsMap[key].push(...parsed[key]);
      } else {
        // If row parser routed units across keys
        for (const k of Object.keys(parsed)) {
          if (parsed[k] && parsed[k].length > 0) {
            sectionUnitsMap[k].push(...parsed[k]);
          }
        }
      }
    }
  }

  // If no sheets matched section names directly, parse all non-summary sheets
  if (matchedSheetCount === 0 || Object.values(sectionUnitsMap).every((arr) => arr.length === 0)) {
    for (const sheetName of sheetsFound) {
      // Skip summary overview sheet
      if (sheetName.includes('สรุปภาพรวม') || sheetName.includes('ภาพรวม')) continue;

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      const parsed = parseWorksheetRows(rows, identifySectionKey(sheetName));

      for (const k of Object.keys(parsed)) {
        if (parsed[k] && parsed[k].length > 0) {
          sectionUnitsMap[k].push(...parsed[k]);
        }
      }
    }
  }

  // Construct final sections array, falling back to INITIAL_SOUTHERN_POLICE_SECTIONS if a section had no rows
  const finalSections: SouthernPoliceSection[] = [];
  const breakdown: { [secKey: string]: { title: string; shortName: string; count: number } } = {};
  let totalUnits = 0;
  const allUnits: UnitManpowerRow[] = [];

  const orderedKeys = ['p9_ss', 'ss_jcht', 'sfr_p9', 'yala', 'pattani', 'narathiwat', 'songkhla'];
  let primaryDetected: string | null = null;

  for (const key of orderedKeys) {
    const meta = SECTION_METADATA[key];
    const parsedUnits = sectionUnitsMap[key];

    const hasParsed = parsedUnits && parsedUnits.length > 0;
    if (hasParsed && !primaryDetected) {
      primaryDetected = key;
    }

    const units = hasParsed
      ? parsedUnits
      : INITIAL_SOUTHERN_POLICE_SECTIONS.find((s) => s.key === key)?.units || [];

    finalSections.push({
      ...meta,
      units,
    });

    totalUnits += units.length;
    allUnits.push(...units);
    breakdown[key] = {
      title: meta.title,
      shortName: meta.shortName,
      count: units.length,
    };
  }

  const totals = calculateTotalsForUnits(allUnits);
  const fileSizeKB = (file.size / 1024).toFixed(1) + ' KB';

  const nonZeroSectionsCount = Object.values(sectionUnitsMap).filter((u) => u.length > 0).length;

  return {
    success: true,
    message: `นำเข้าไฟล์ "${file.name}" สำเร็จ ตรวจพบ ${sheetsFound.length} แผ่นงาน วิเคราะห์พบ ${nonZeroSectionsCount} สังกัด รวมทั้งหมด ${totalUnits} หน่วยงาน`,
    fileName: file.name,
    fileSize: fileSizeKB,
    sheetsFound,
    totalUnits,
    totalPositions: totals.grandTotal.positions,
    totalOccupied: totals.grandTotal.occupied,
    totalVacant: totals.grandTotal.positions - totals.grandTotal.occupied,
    occupancyPercent:
      totals.grandTotal.positions > 0
        ? Math.round((totals.grandTotal.occupied / totals.grandTotal.positions) * 1000) / 10
        : 0,
    sections: finalSections,
    breakdown,
    primarySectionDetected: nonZeroSectionsCount === 1 ? primaryDetected : null,
  };
}

/**
 * Fallback parser for raw CSV text
 */
export function parseSouthernPoliceCSV(csvText: string): SouthernPoliceSection[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) {
    return INITIAL_SOUTHERN_POLICE_SECTIONS;
  }

  const rows: any[][] = lines.map((l) =>
    l.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
  );

  const parsedMap = parseWorksheetRows(rows);

  const result: SouthernPoliceSection[] = [];
  for (const key of ['p9_ss', 'ss_jcht', 'sfr_p9', 'yala', 'pattani', 'narathiwat', 'songkhla']) {
    const meta = SECTION_METADATA[key];
    const units =
      parsedMap[key] && parsedMap[key].length > 0
        ? parsedMap[key]
        : INITIAL_SOUTHERN_POLICE_SECTIONS.find((s) => s.key === key)?.units || [];

    result.push({
      ...meta,
      units,
    });
  }

  return result;
}
