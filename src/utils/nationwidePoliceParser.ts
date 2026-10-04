/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import {
  NationwideUnitRow,
  UnitManpowerRanks,
  UnitTierLevel,
} from '../types/nationwidePolice';
import { PoliceOfficer } from '../types/personnel';
import {
  enrichNationwideUnitRow,
  calculateTotalsForNationwideRows,
} from '../data/nationwidePoliceData';
import { RTP_BUREAUS_DATA } from '../data/rtpStructure';

export interface NationwideImportResult {
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
  rows: NationwideUnitRow[];
  breakdown: { [level: string]: number };
}

/**
 * แปลงตำแหน่งของข้าราชการตำรวจเป็น Rank Key
 */
function matchOfficerRankKey(officer: PoliceOfficer): keyof UnitManpowerRanks {
  const level = (officer.positionLevel || '').trim();
  const title = (officer.positionTitle || '').trim();
  const duty = (officer.duty || '').trim();
  const combined = `${level} ${title} ${duty}`;

  if (combined.includes('ผบช.') || combined.includes('ผู้บัญชาการ') || level === 'ผบช.') return 'pbg';
  if (combined.includes('รอง ผบช.') || level === 'รอง ผบช.') return 'pbg';
  if (combined.includes('ผบก.') || combined.includes('ผู้บังคับการ') || level === 'ผบก.') return 'pbg';
  if (combined.includes('รอง ผบก.') || combined.includes('รองผู้บังคับการ') || level === 'รอง ผบก.') return 'rpbg';
  if (combined.includes('ผกก.') || combined.includes('ผู้กำกับการ') || level === 'ผกก.') return 'pgk';
  if (combined.includes('รอง ผกก.') || combined.includes('รองผู้กำกับการ') || level === 'รอง ผกก.') return 'rpgk';
  if (
    combined.includes('รอง สว.(ท') ||
    combined.includes('ด.ต.53') ||
    combined.includes('ท.53') ||
    combined.includes('(ท.)')
  ) {
    return 'rt_dt53';
  }
  if (combined.includes('รอง สว.') || combined.includes('รองสารวัตร') || level === 'รอง สว.') return 'rsw';
  if (combined.includes('สว.') || combined.includes('สารวัตร') || level === 'สว.') return 'sw';
  if (combined.includes('รอง ผบ.หมู่') || level === 'รอง ผบ.หมู่') return 'rpbm';
  if (combined.includes('ผบ.หมู่') || level === 'ผบ.หมู่') return 'pbm';

  if (officer.commissionType === 'ประทวน') return 'pbm';
  return 'rsw';
}

/**
 * ทำความสะอาดชื่อหน่วยงานเพื่อจับคู่
 */
function cleanUnitText(str: string): string {
  return (str || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[.\s\-_/]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * ซิงค์/เชื่อมโยงข้อมูลกำลังพลจากทำเนียบจริง (Officers Roster) เข้ากับโครงสร้างหน่วยงานทั้งประเทศ
 */
export function syncNationwideFromOfficersRoster(
  currentRows: NationwideUnitRow[],
  officers: PoliceOfficer[]
): {
  rows: NationwideUnitRow[];
  matchedOfficersCount: number;
  totalPositions: number;
  totalOccupied: number;
  totalVacant: number;
  occupancyPercent: number;
} {
  let totalMatched = 0;

  const updatedRows = currentRows.map((row) => {
    const cleanRowName = cleanUnitText(row.unitName);
    const cleanShort = cleanUnitText(row.shortName || '');
    const bId = row.bureauId;

    // ค้นหากำลังพลที่ตรงกับหน่วยงานนี้
    const matchedOfficers = officers.filter((o) => {
      const oBureau = (o.bureau || '').trim();
      const oDiv = cleanUnitText(o.division || '');
      const oSub = cleanUnitText(o.subDivision || '');

      // ตรวจสอบ บช.
      const matchBureau =
        oBureau === bId ||
        oBureau.includes(bId) ||
        bId.includes(oBureau) ||
        (officers.length < 200); // หากข้อมูลมีน้อยให้ยอมรับ

      if (!matchBureau) return false;

      // ตรวจสอบตามระดับหน่วย
      if (row.unitLevel === 'บช.') {
        return (
          oBureau === bId ||
          oDiv.includes(cleanRowName) ||
          cleanRowName.includes(oDiv)
        );
      }

      if (row.unitLevel === 'บก.') {
        return (
          oDiv === cleanRowName ||
          (cleanShort && oDiv === cleanShort) ||
          (cleanRowName.length >= 3 && oDiv.includes(cleanRowName)) ||
          (cleanRowName.length >= 3 && cleanRowName.includes(oDiv))
        );
      }

      // ระดับ กก. / สภ. / สน.
      return (
        oSub === cleanRowName ||
        (cleanShort && oSub === cleanShort) ||
        (cleanRowName.length >= 3 && oSub.includes(cleanRowName)) ||
        (cleanRowName.length >= 3 && cleanRowName.includes(oSub)) ||
        (oDiv === cleanRowName)
      );
    });

    if (matchedOfficers.length > 0) {
      totalMatched += matchedOfficers.length;

      // โคลนกรอบเดิม
      const newRanks: UnitManpowerRanks = {
        pbg: { positions: row.ranks.pbg.positions, occupied: 0 },
        rpbg: { positions: row.ranks.rpbg.positions, occupied: 0 },
        pgk: { positions: row.ranks.pgk.positions, occupied: 0 },
        rpgk: { positions: row.ranks.rpgk.positions, occupied: 0 },
        sw: { positions: row.ranks.sw.positions, occupied: 0 },
        rsw: { positions: row.ranks.rsw.positions, occupied: 0 },
        rt_dt53: { positions: row.ranks.rt_dt53.positions, occupied: 0 },
        pbm: { positions: row.ranks.pbm.positions, occupied: 0 },
        rpbm: { positions: row.ranks.rpbm.positions, occupied: 0 },
      };

      matchedOfficers.forEach((officer) => {
        const rKey = matchOfficerRankKey(officer);
        if (!officer.isVacant) {
          newRanks[rKey].occupied += 1;
        }
        // ปรับกรอบอัตราไม่ให้ต่ำกว่าคนครองจริง
        if (newRanks[rKey].positions < newRanks[rKey].occupied) {
          newRanks[rKey].positions = newRanks[rKey].occupied;
        }
      });

      // หากหน่วยงานระดับ กก. มีคนครองน้อยกว่า 1 คน ให้คงค่ากรอบเดิมไว้เพื่อไม่ให้สูญหาย
      (Object.keys(newRanks) as Array<keyof UnitManpowerRanks>).forEach((k) => {
        newRanks[k].positions = Math.max(newRanks[k].positions, row.ranks[k].positions);
      });

      return enrichNationwideUnitRow({
        ...row,
        ranks: newRanks,
      });
    }

    return row;
  });

  const totals = calculateTotalsForNationwideRows(updatedRows);
  return {
    rows: updatedRows,
    matchedOfficersCount: totalMatched,
    totalPositions: totals.grandTotal.positions,
    totalOccupied: totals.grandTotal.occupied,
    totalVacant: totals.vacant,
    occupancyPercent: totals.occupancyPercent,
  };
}

/**
 * แปลงข้อมูลจากแถวใน Sheet หรือ CSV เป็น UnitManpowerRanks
 */
function parseRowRankNumbers(row: any[]): UnitManpowerRanks {
  const getNum = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = parseInt(String(val).replace(/,/g, '').trim(), 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  // ตรวจสอบว่าคอลัมน์เริ่มต้นจาก index ใด
  // ปกติ: Col 0: ลำดับ, Col 1: หน่วยงาน, Col 2: ระดับ, Col 3: บช, Col 4: บก, Col 5: ผบก.ตำแหน่ง, Col 6: ผบก.คนครอง...
  let startIdx = 5;
  if (typeof row[2] === 'number' || (!isNaN(parseInt(row[2], 10)) && isNaN(parseInt(row[1], 10)))) {
    // รูปแบบย่อ (ลำดับ, หน่วยงาน, ผบก.ตำแหน่ง, ผบก.คนครอง...)
    startIdx = 2;
  }

  return {
    pbg: { positions: getNum(row[startIdx]), occupied: getNum(row[startIdx + 1]) },
    rpbg: { positions: getNum(row[startIdx + 2]), occupied: getNum(row[startIdx + 3]) },
    pgk: { positions: getNum(row[startIdx + 4]), occupied: getNum(row[startIdx + 5]) },
    rpgk: { positions: getNum(row[startIdx + 6]), occupied: getNum(row[startIdx + 7]) },
    sw: { positions: getNum(row[startIdx + 8]), occupied: getNum(row[startIdx + 9]) },
    rsw: { positions: getNum(row[startIdx + 10]), occupied: getNum(row[startIdx + 11]) },
    rt_dt53: { positions: getNum(row[startIdx + 14]), occupied: getNum(row[startIdx + 15]) },
    pbm: { positions: getNum(row[startIdx + 16]), occupied: getNum(row[startIdx + 17]) },
    rpbm: { positions: getNum(row[startIdx + 18]), occupied: getNum(row[startIdx + 19]) },
  };
}

/**
 * แยกประเภทระดับหน่วยงานจากชื่อ
 */
function deduceUnitLevel(name: string): UnitTierLevel {
  const n = (name || '').trim();
  if (
    n.startsWith('บช.') ||
    n.startsWith('ภ.') ||
    n.startsWith('สง.') ||
    n.startsWith('สพฐ') ||
    n.startsWith('รพ.ตร') ||
    n.startsWith('สกพ') ||
    n.startsWith('กองบัญชาการ') ||
    n.startsWith('สำนักงาน')
  ) {
    return 'บช.';
  }
  if (
    n.startsWith('บก.') ||
    n.startsWith('ภ.จว.') ||
    n.startsWith('กองบังคับการ') ||
    n.startsWith('ตำรวจภูธรจังหวัด') ||
    n.startsWith('ศูนย์ฝึก') ||
    n.startsWith('กองอัตรากำลัง') ||
    n.startsWith('กองทะเบียนพล') ||
    n.startsWith('กองสวัสดิการ') ||
    n.startsWith('ศฝร.')
  ) {
    return 'บก.';
  }
  return 'กก.';
}

/**
 * ประมวลผลและนำเข้าไฟล์ Excel / CSV สถานภาพกำลังพลทั้งประเทศ
 */
export async function parseNationwidePoliceExcelFile(
  file: File,
  currentRows: NationwideUnitRow[]
): Promise<NationwideImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheetsFound = workbook.SheetNames;

  const parsedUnits: NationwideUnitRow[] = [];
  const breakdown: { [level: string]: number } = { 'บช.': 0, 'บก.': 0, 'กก.': 0 };

  // วนลูปอ่านข้อมูลจากแผ่นงาน
  for (const sheetName of sheetsFound) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    // ข้ามแผ่นงานที่ไม่มีข้อมูล
    if (rawRows.length < 3) continue;

    // หาบรรทัดที่เป็นแถวข้อมูลจริง
    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r || r.length < 3) continue;

      const col0 = String(r[0] || '').trim();
      const col1 = String(r[1] || '').trim();
      const col2 = String(r[2] || '').trim();

      // ข้ามหัวตาราง หรือแถวสรุป
      if (
        col0.includes('ลำดับ') ||
        col0.includes('รวม') ||
        col0.includes('สถานภาพ') ||
        col1.includes('หน่วยงาน') ||
        col1.includes('รวมทั้งสิ้น')
      ) {
        continue;
      }

      const unitName = col1 || col0;
      if (!unitName || unitName.length < 2) continue;

      // ตรวจสอบว่ามีตัวเลขยศหรือไม่
      const ranks = parseRowRankNumbers(r);
      const computed = calculateTotalsForNationwideRows([{ ranks } as any]);
      if (computed.grandTotal.positions === 0 && computed.grandTotal.occupied === 0) {
        // อาจเป็นแถวหัวข้อ ให้ข้าม
        continue;
      }

      const level: UnitTierLevel =
        col2 === 'บช.' || col2 === 'บก.' || col2 === 'กก.'
          ? (col2 as UnitTierLevel)
          : deduceUnitLevel(unitName);

      // ค้นหา บช. ต้นสังกัด
      const bureauMatch = RTP_BUREAUS_DATA.find(
        (b) =>
          unitName.includes(b.id) ||
          unitName.includes(b.code) ||
          unitName.includes(b.fullName)
      );

      const bureauId = bureauMatch ? bureauMatch.id : 'บช.น.';
      const bureauName = bureauMatch ? bureauMatch.fullName : 'กองบัญชาการตำรวจนครบาล';

      const enriched = enrichNationwideUnitRow({
        id: `imp-${Date.now()}-${parsedUnits.length + 1}`,
        unitLevel: level,
        bureauId,
        bureauName,
        no: col0 || `${parsedUnits.length + 1}`,
        unitName,
        shortName: unitName,
        group: bureauMatch ? bureauMatch.group : 'area_commands',
        groupName: bureauMatch ? bureauMatch.groupName : 'ส่วนป้องกันและปราบปรามพื้นที่',
        ranks,
        depth: level === 'บช.' ? 0 : level === 'บก.' ? 1 : 2,
      });

      parsedUnits.push(enriched);
      breakdown[level] = (breakdown[level] || 0) + 1;
    }
  }

  const finalRows = parsedUnits.length > 0 ? parsedUnits : currentRows;
  const totals = calculateTotalsForNationwideRows(finalRows);
  const fileSizeKB = (file.size / 1024).toFixed(1) + ' KB';

  return {
    success: parsedUnits.length > 0,
    message:
      parsedUnits.length > 0
        ? `นำเข้าไฟล์ "${file.name}" สำเร็จ ตรวจพบ ${sheetsFound.length} แผ่นงาน อ่านข้อมูลหน่วยงานได้ ${parsedUnits.length} แถว (บช. ${breakdown['บช.']} / บก. ${breakdown['บก.']} / กก. ${breakdown['กก.']})`
        : `ไม่พบแถวข้อมูลหน่วยงานที่ตรงกับแบบฟอร์มในไฟล์ "${file.name}"`,
    fileName: file.name,
    fileSize: fileSizeKB,
    sheetsFound,
    totalUnits: finalRows.length,
    totalPositions: totals.grandTotal.positions,
    totalOccupied: totals.grandTotal.occupied,
    totalVacant: totals.vacant,
    occupancyPercent: totals.occupancyPercent,
    rows: finalRows,
    breakdown,
  };
}
