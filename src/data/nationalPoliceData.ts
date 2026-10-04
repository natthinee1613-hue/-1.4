/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NationalPoliceRow,
  NationalPoliceRanks,
  NationalPoliceSummary,
  RankStat,
} from '../types/nationalPolice';
import { PoliceOfficer } from '../types/personnel';

export const NATIONAL_POLICE_TITLE = 'สถานภาพข้าราชการตำรวจทั้งประเทศ';

/**
 * Compute totals for a single row's rank statistics
 */
export function computeNationalRowStats(ranks: NationalPoliceRanks): {
  totalCommissioned: RankStat;
  totalNonCommissioned: RankStat;
  grandTotal: RankStat;
  vacant: number;
  occupancyPercent: number;
} {
  // ชั้นสัญญาบัตร: ผบก. + รอง ผบก. + ผกก. + รอง ผกก. + สว. + รอง สว.
  const commPos =
    (ranks.pbg?.positions || 0) +
    (ranks.rpbg?.positions || 0) +
    (ranks.pgk?.positions || 0) +
    (ranks.rpgk?.positions || 0) +
    (ranks.sw?.positions || 0) +
    (ranks.rsw?.positions || 0);

  const commOcc =
    (ranks.pbg?.occupied || 0) +
    (ranks.rpbg?.occupied || 0) +
    (ranks.pgk?.occupied || 0) +
    (ranks.rpgk?.occupied || 0) +
    (ranks.sw?.occupied || 0) +
    (ranks.rsw?.occupied || 0);

  // ชั้นประทวน: รอง สว.* + ผบ.หมู่ + รอง ผบ.หมู่
  const nonCommPos =
    (ranks.rsw_special?.positions || 0) +
    (ranks.pbm?.positions || 0) +
    (ranks.rpbm?.positions || 0);

  const nonCommOcc =
    (ranks.rsw_special?.occupied || 0) +
    (ranks.pbm?.occupied || 0) +
    (ranks.rpbm?.occupied || 0);

  const grandPos = commPos + nonCommPos;
  const grandOcc = commOcc + nonCommOcc;
  const vacant = Math.max(0, grandPos - grandOcc);
  const occupancyPercent = grandPos > 0 ? Math.round((grandOcc / grandPos) * 1000) / 10 : 0;

  return {
    totalCommissioned: { positions: commPos, occupied: commOcc },
    totalNonCommissioned: { positions: nonCommPos, occupied: nonCommOcc },
    grandTotal: { positions: grandPos, occupied: grandOcc },
    vacant,
    occupancyPercent,
  };
}

/**
 * Factory to create a properly computed NationalPoliceRow
 */
export function createNationalPoliceRow(
  id: string,
  no: number | string,
  bureau: string,
  division: string,
  subDivision: string,
  ranks: NationalPoliceRanks,
  notes?: string
): NationalPoliceRow {
  const stats = computeNationalRowStats(ranks);
  return {
    id,
    no,
    bureau: bureau.trim(),
    division: division.trim(),
    subDivision: subDivision.trim(),
    ranks,
    ...stats,
    notes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Aggregates all officers from personnel directory (ทำเนียบกำลังพล) into national police table rows.
 * Groups by bureau (บช.), division (บก.), and subDivision (กก.).
 */
export function aggregateOfficersToNationalRows(officers: PoliceOfficer[]): NationalPoliceRow[] {
  if (!officers || officers.length === 0) return [];

  // Group key: `${bureau}:::${division}:::${subDivision}`
  const groupMap = new Map<
    string,
    {
      bureau: string;
      division: string;
      subDivision: string;
      ranks: NationalPoliceRanks;
    }
  >();

  for (const off of officers) {
    const bureau = (off.bureau || 'สกพ.').trim();
    const division = (off.division || 'บก.').trim();
    const subDivision = (off.subDivision || 'กก.').trim();
    const key = `${bureau}:::${division}:::${subDivision}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        bureau,
        division,
        subDivision,
        ranks: {
          pbg: { positions: 0, occupied: 0 },
          rpbg: { positions: 0, occupied: 0 },
          pgk: { positions: 0, occupied: 0 },
          rpgk: { positions: 0, occupied: 0 },
          sw: { positions: 0, occupied: 0 },
          rsw: { positions: 0, occupied: 0 },
          rsw_special: { positions: 0, occupied: 0 },
          pbm: { positions: 0, occupied: 0 },
          rpbm: { positions: 0, occupied: 0 },
        },
      });
    }

    const group = groupMap.get(key)!;
    const isOccupied = !off.isVacant;

    // Detect rank / level mapping
    const pLevel = (off.positionLevel || '').trim();
    const pTitle = (off.positionTitle || '').trim();
    const fLevel = (off.fluidLevel || '').trim();
    const isSpecialRsw =
      pLevel.includes('รอง สว.*') ||
      pTitle.includes('53') ||
      fLevel.includes('53') ||
      pTitle.includes('ด.ต.53');

    if (pLevel.includes('ผบก') || pTitle.includes('ผบก') || pTitle.includes('ผู้บังคับการ')) {
      group.ranks.pbg.positions += 1;
      if (isOccupied) group.ranks.pbg.occupied += 1;
    } else if (pLevel.includes('รอง ผบก') || pTitle.includes('รอง ผบก') || pTitle.includes('รองผู้บังคับการ')) {
      group.ranks.rpbg.positions += 1;
      if (isOccupied) group.ranks.rpbg.occupied += 1;
    } else if (pLevel.includes('ผกก') || pTitle.includes('ผกก') || pTitle.includes('ผู้กำกับการ') || pTitle.includes('หน.สภ')) {
      group.ranks.pgk.positions += 1;
      if (isOccupied) group.ranks.pgk.occupied += 1;
    } else if (pLevel.includes('รอง ผกก') || pTitle.includes('รอง ผกก') || pTitle.includes('รองผู้กำกับการ')) {
      group.ranks.rpgk.positions += 1;
      if (isOccupied) group.ranks.rpgk.occupied += 1;
    } else if (pLevel.includes('สว.') || pTitle.includes('สว.') || pTitle.includes('สารวัตร') || pTitle.includes('นว.(สบ 2)')) {
      group.ranks.sw.positions += 1;
      if (isOccupied) group.ranks.sw.occupied += 1;
    } else if (isSpecialRsw) {
      group.ranks.rsw_special.positions += 1;
      if (isOccupied) group.ranks.rsw_special.occupied += 1;
    } else if (pLevel.includes('รอง สว') || pTitle.includes('รอง สว') || pTitle.includes('รองสารวัตร') || pTitle.includes('นว.(สบ 1)')) {
      group.ranks.rsw.positions += 1;
      if (isOccupied) group.ranks.rsw.occupied += 1;
    } else if (pLevel.includes('รอง ผบ.หมู่') || pTitle.includes('รอง ผบ.หมู่')) {
      group.ranks.rpbm.positions += 1;
      if (isOccupied) group.ranks.rpbm.occupied += 1;
    } else if (pLevel.includes('ผบ.หมู่') || pTitle.includes('ผบ.หมู่') || off.commissionType === 'ประทวน') {
      group.ranks.pbm.positions += 1;
      if (isOccupied) group.ranks.pbm.occupied += 1;
    } else if (off.commissionType === 'สัญญาบัตร') {
      // General commissioned fallback -> สว. or รอง สว.
      group.ranks.sw.positions += 1;
      if (isOccupied) group.ranks.sw.occupied += 1;
    } else {
      // Default fallback -> ผบ.หมู่
      group.ranks.pbm.positions += 1;
      if (isOccupied) group.ranks.pbm.occupied += 1;
    }
  }

  // Convert to sorted rows
  const rows: NationalPoliceRow[] = [];
  let index = 1;

  for (const [, item] of groupMap) {
    const row = createNationalPoliceRow(
      `nat-roster-${index}-${Date.now()}`,
      index,
      item.bureau,
      item.division,
      item.subDivision,
      item.ranks,
      'ข้อมูลประมวลผลจากทำเนียบกำลังพล'
    );
    rows.push(row);
    index++;
  }

  // Sort by bureau, then division, then subDivision
  return rows.sort((a, b) => {
    if (a.bureau !== b.bureau) return a.bureau.localeCompare(b.bureau, 'th');
    if (a.division !== b.division) return a.division.localeCompare(b.division, 'th');
    return a.subDivision.localeCompare(b.subDivision, 'th');
  }).map((r, idx) => ({ ...r, no: idx + 1 }));
}

/**
 * Calculate grand summary metrics from an array of rows
 */
export function calculateNationalSummary(rows: NationalPoliceRow[]): NationalPoliceSummary {
  const summary: NationalPoliceSummary = {
    rowCount: rows.length,
    totalPositions: 0,
    totalOccupied: 0,
    totalVacant: 0,
    occupancyRate: 0,
    commissionedPositions: 0,
    commissionedOccupied: 0,
    nonCommissionedPositions: 0,
    nonCommissionedOccupied: 0,
    ranks: {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 0, occupied: 0 },
      rpgk: { positions: 0, occupied: 0 },
      sw: { positions: 0, occupied: 0 },
      rsw: { positions: 0, occupied: 0 },
      rsw_special: { positions: 0, occupied: 0 },
      pbm: { positions: 0, occupied: 0 },
      rpbm: { positions: 0, occupied: 0 },
    },
  };

  for (const row of rows) {
    summary.totalPositions += row.grandTotal?.positions || 0;
    summary.totalOccupied += row.grandTotal?.occupied || 0;
    summary.commissionedPositions += row.totalCommissioned?.positions || 0;
    summary.commissionedOccupied += row.totalCommissioned?.occupied || 0;
    summary.nonCommissionedPositions += row.totalNonCommissioned?.positions || 0;
    summary.nonCommissionedOccupied += row.totalNonCommissioned?.occupied || 0;

    // Rank sum
    summary.ranks.pbg.positions += row.ranks.pbg.positions;
    summary.ranks.pbg.occupied += row.ranks.pbg.occupied;
    summary.ranks.rpbg.positions += row.ranks.rpbg.positions;
    summary.ranks.rpbg.occupied += row.ranks.rpbg.occupied;
    summary.ranks.pgk.positions += row.ranks.pgk.positions;
    summary.ranks.pgk.occupied += row.ranks.pgk.occupied;
    summary.ranks.rpgk.positions += row.ranks.rpgk.positions;
    summary.ranks.rpgk.occupied += row.ranks.rpgk.occupied;
    summary.ranks.sw.positions += row.ranks.sw.positions;
    summary.ranks.sw.occupied += row.ranks.sw.occupied;
    summary.ranks.rsw.positions += row.ranks.rsw.positions;
    summary.ranks.rsw.occupied += row.ranks.rsw.occupied;
    summary.ranks.rsw_special.positions += row.ranks.rsw_special.positions;
    summary.ranks.rsw_special.occupied += row.ranks.rsw_special.occupied;
    summary.ranks.pbm.positions += row.ranks.pbm.positions;
    summary.ranks.pbm.occupied += row.ranks.pbm.occupied;
    summary.ranks.rpbm.positions += row.ranks.rpbm.positions;
    summary.ranks.rpbm.occupied += row.ranks.rpbm.occupied;
  }

  summary.totalVacant = Math.max(0, summary.totalPositions - summary.totalOccupied);
  summary.occupancyRate =
    summary.totalPositions > 0
      ? Math.round((summary.totalOccupied / summary.totalPositions) * 1000) / 10
      : 0;

  return summary;
}

// =========================================================================
// Baseline National Dataset (ครอบคลุม บช./บก./กก. ทุกสังกัดหลักทั่วประเทศ)
// =========================================================================
export const INITIAL_NATIONAL_POLICE_DATA: NationalPoliceRow[] = [
  // --- สง.ผบ.ตร. & ส่วนอำนวยการ ตร. ---
  createNationalPoliceRow('np-1', 1, 'สง.ผบ.ตร.', 'สง.ผบ.ตร.', 'ฝ่ายอำนวยการ', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 3, occupied: 3 },
    pgk: { positions: 5, occupied: 5 },
    rpgk: { positions: 8, occupied: 7 },
    sw: { positions: 16, occupied: 14 },
    rsw: { positions: 22, occupied: 20 },
    rsw_special: { positions: 4, occupied: 4 },
    pbm: { positions: 45, occupied: 40 },
    rpbm: { positions: 6, occupied: 5 },
  }),
  createNationalPoliceRow('np-2', 2, 'สกพ.', 'กองอัตรากำลัง (อต.)', 'ฝ่ายอัตรากำลัง 1', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 2, occupied: 2 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 9, occupied: 8 },
    rsw: { positions: 15, occupied: 14 },
    rsw_special: { positions: 3, occupied: 3 },
    pbm: { positions: 30, occupied: 28 },
    rpbm: { positions: 4, occupied: 3 },
  }),
  createNationalPoliceRow('np-3', 3, 'สกพ.', 'กองทะเบียนพล (ทพ.)', 'ฝ่ายแต่งตั้ง', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 3, occupied: 3 },
    pgk: { positions: 3, occupied: 3 },
    rpgk: { positions: 6, occupied: 5 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 20, occupied: 18 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 42, occupied: 39 },
    rpbm: { positions: 5, occupied: 4 },
  }),
  createNationalPoliceRow('np-4', 4, 'สกพ.', 'กองสวัสดิการ (สก.)', 'ฝ่ายฌาปนกิจและสงเคราะห์', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 2, occupied: 2 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 8, occupied: 7 },
    rsw: { positions: 14, occupied: 12 },
    rsw_special: { positions: 3, occupied: 3 },
    pbm: { positions: 28, occupied: 25 },
    rpbm: { positions: 3, occupied: 3 },
  }),
  createNationalPoliceRow('np-5', 5, 'สงป.', 'กองงบประมาณ (งป.)', 'ฝ่ายบริหารงบประมาณ', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 2, occupied: 2 },
    pgk: { positions: 3, occupied: 3 },
    rpgk: { positions: 5, occupied: 5 },
    sw: { positions: 10, occupied: 9 },
    rsw: { positions: 16, occupied: 15 },
    rsw_special: { positions: 4, occupied: 4 },
    pbm: { positions: 32, occupied: 29 },
    rpbm: { positions: 4, occupied: 4 },
  }),
  createNationalPoliceRow('np-6', 6, 'สยศ.ตร.', 'กองแผนงาน (ผง.)', 'ฝ่ายยุทธศาสตร์ 1', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 2, occupied: 2 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 9, occupied: 8 },
    rsw: { positions: 15, occupied: 13 },
    rsw_special: { positions: 3, occupied: 3 },
    pbm: { positions: 26, occupied: 24 },
    rpbm: { positions: 3, occupied: 3 },
  }),

  // --- กองบัญชาการตำรวจนครบาล (บช.น.) ---
  createNationalPoliceRow('np-7', 7, 'บช.น.', 'บก.อก.บช.น.', 'ฝ่ายอำนวยการ บช.น.', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 6, occupied: 6 },
    rpgk: { positions: 12, occupied: 11 },
    sw: { positions: 24, occupied: 22 },
    rsw: { positions: 40, occupied: 36 },
    rsw_special: { positions: 8, occupied: 8 },
    pbm: { positions: 85, occupied: 78 },
    rpbm: { positions: 10, occupied: 8 },
  }),
  createNationalPoliceRow('np-8', 8, 'บช.น.', 'บก.สส.บช.น.', 'กก.สส.1 บก.สส.บช.น.', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 3, occupied: 3 },
    pgk: { positions: 4, occupied: 4 },
    rpgk: { positions: 8, occupied: 7 },
    sw: { positions: 18, occupied: 16 },
    rsw: { positions: 32, occupied: 28 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 70, occupied: 64 },
    rpbm: { positions: 8, occupied: 6 },
  }),
  createNationalPoliceRow('np-9', 9, 'บช.น.', 'บก.น.1', 'สน.ชนะสงคราม', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 10, occupied: 9 },
    rsw: { positions: 24, occupied: 21 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 65, occupied: 58 },
    rpbm: { positions: 6, occupied: 5 },
  }),
  createNationalPoliceRow('np-10', 10, 'บช.น.', 'บก.น.1', 'สน.ดุสิต', {
    pbg: { positions: 0, occupied: 0 },
    rpbg: { positions: 0, occupied: 0 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 3, occupied: 3 },
    sw: { positions: 8, occupied: 8 },
    rsw: { positions: 20, occupied: 18 },
    rsw_special: { positions: 4, occupied: 4 },
    pbm: { positions: 55, occupied: 48 },
    rpbm: { positions: 5, occupied: 4 },
  }),
  createNationalPoliceRow('np-11', 11, 'บช.น.', 'บก.น.2', 'สน.บางซื่อ', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 28, occupied: 25 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 80, occupied: 72 },
    rpbm: { positions: 8, occupied: 7 },
  }),
  createNationalPoliceRow('np-12', 12, 'บช.น.', 'บก.น.5', 'สน.ทองหล่อ', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 11, occupied: 10 },
    rsw: { positions: 26, occupied: 24 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 75, occupied: 68 },
    rpbm: { positions: 7, occupied: 6 },
  }),
  createNationalPoliceRow('np-13', 13, 'บช.น.', 'บก.น.6', 'สน.ปทุมวัน', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 10, occupied: 9 },
    rsw: { positions: 22, occupied: 20 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 60, occupied: 54 },
    rpbm: { positions: 6, occupied: 5 },
  }),
  createNationalPoliceRow('np-14', 14, 'บช.น.', 'บก.จร.', 'กก.1 บก.จร. (สายตรวจจราจร)', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 6, occupied: 5 },
    sw: { positions: 15, occupied: 13 },
    rsw: { positions: 35, occupied: 30 },
    rsw_special: { positions: 8, occupied: 8 },
    pbm: { positions: 120, occupied: 108 },
    rpbm: { positions: 12, occupied: 10 },
  }),
  createNationalPoliceRow('np-15', 15, 'บช.น.', 'บก.สปพ. (191)', 'กก.สายตรวจ บก.สปพ.', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 6, occupied: 6 },
    sw: { positions: 16, occupied: 15 },
    rsw: { positions: 38, occupied: 34 },
    rsw_special: { positions: 9, occupied: 9 },
    pbm: { positions: 140, occupied: 125 },
    rpbm: { positions: 14, occupied: 11 },
  }),

  // --- ภ.1 (ภาคกลางตอนบนและปริมณฑล) ---
  createNationalPoliceRow('np-16', 16, 'ภ.1', 'บก.อก.ภ.1', 'ฝ่ายอำนวยการ ภ.1', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 3, occupied: 3 },
    pgk: { positions: 5, occupied: 5 },
    rpgk: { positions: 10, occupied: 9 },
    sw: { positions: 20, occupied: 18 },
    rsw: { positions: 35, occupied: 32 },
    rsw_special: { positions: 7, occupied: 7 },
    pbm: { positions: 70, occupied: 62 },
    rpbm: { positions: 8, occupied: 7 },
  }),
  createNationalPoliceRow('np-17', 17, 'ภ.1', 'ภ.จว.นนทบุรี', 'สภ.เมืองนนทบุรี', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 28, occupied: 25 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 85, occupied: 76 },
    rpbm: { positions: 8, occupied: 7 },
  }),
  createNationalPoliceRow('np-18', 18, 'ภ.1', 'ภ.จว.ปทุมธานี', 'สภ.คลองหลวง', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 14, occupied: 12 },
    rsw: { positions: 30, occupied: 27 },
    rsw_special: { positions: 7, occupied: 7 },
    pbm: { positions: 95, occupied: 84 },
    rpbm: { positions: 9, occupied: 8 },
  }),
  createNationalPoliceRow('np-19', 19, 'ภ.1', 'ภ.จว.สมุทรปราการ', 'สภ.เมืองสมุทรปราการ', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 13, occupied: 12 },
    rsw: { positions: 29, occupied: 26 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 90, occupied: 80 },
    rpbm: { positions: 8, occupied: 7 },
  }),
  createNationalPoliceRow('np-20', 20, 'ภ.1', 'ภ.จว.พระนครศรีอยุธยา', 'สภ.พระนครศรีอยุธยา', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 3, occupied: 3 },
    sw: { positions: 10, occupied: 9 },
    rsw: { positions: 24, occupied: 21 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 68, occupied: 60 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.2 (ภาคตะวันออก) ---
  createNationalPoliceRow('np-21', 21, 'ภ.2', 'ภ.จว.ชลบุรี', 'สภ.เมืองพัทยา', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 5, occupied: 5 },
    sw: { positions: 16, occupied: 14 },
    rsw: { positions: 36, occupied: 32 },
    rsw_special: { positions: 8, occupied: 8 },
    pbm: { positions: 110, occupied: 98 },
    rpbm: { positions: 10, occupied: 9 },
  }),
  createNationalPoliceRow('np-22', 22, 'ภ.2', 'ภ.จว.ระยอง', 'สภ.เมืองระยอง', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 26, occupied: 23 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 78, occupied: 70 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.3 (อีสานตอนล่าง) ---
  createNationalPoliceRow('np-23', 23, 'ภ.3', 'ภ.จว.นครราชสีมา', 'สภ.เมืองนครราชสีมา', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 5, occupied: 5 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 5, occupied: 5 },
    sw: { positions: 15, occupied: 13 },
    rsw: { positions: 34, occupied: 30 },
    rsw_special: { positions: 8, occupied: 8 },
    pbm: { positions: 105, occupied: 94 },
    rpbm: { positions: 10, occupied: 8 },
  }),
  createNationalPoliceRow('np-24', 24, 'ภ.3', 'ภ.จว.อุบลราชธานี', 'สภ.เมืองอุบลราชธานี', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 11, occupied: 10 },
    rsw: { positions: 25, occupied: 22 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 74, occupied: 66 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.4 (อีสานตอนบน) ---
  createNationalPoliceRow('np-25', 25, 'ภ.4', 'ภ.จว.ขอนแก่น', 'สภ.เมืองขอนแก่น', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 13, occupied: 12 },
    rsw: { positions: 28, occupied: 25 },
    rsw_special: { positions: 7, occupied: 7 },
    pbm: { positions: 86, occupied: 78 },
    rpbm: { positions: 8, occupied: 7 },
  }),
  createNationalPoliceRow('np-26', 26, 'ภ.4', 'ภ.จว.อุดรธานี', 'สภ.เมืองอุดรธานี', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 26, occupied: 23 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 80, occupied: 71 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.5 (ภาคเหนือตอนบน) ---
  createNationalPoliceRow('np-27', 27, 'ภ.5', 'ภ.จว.เชียงใหม่', 'สภ.เมืองเชียงใหม่', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 5, occupied: 5 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 5, occupied: 4 },
    sw: { positions: 15, occupied: 14 },
    rsw: { positions: 32, occupied: 29 },
    rsw_special: { positions: 8, occupied: 8 },
    pbm: { positions: 100, occupied: 90 },
    rpbm: { positions: 9, occupied: 8 },
  }),
  createNationalPoliceRow('np-28', 28, 'ภ.5', 'ภ.จว.เชียงราย', 'สภ.เมืองเชียงราย', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 11, occupied: 10 },
    rsw: { positions: 24, occupied: 21 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 72, occupied: 64 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.6 (ภาคเหนือตอนล่าง) ---
  createNationalPoliceRow('np-29', 29, 'ภ.6', 'ภ.จว.พิษณุโลก', 'สภ.เมืองพิษณุโลก', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 11, occupied: 10 },
    rsw: { positions: 24, occupied: 22 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 70, occupied: 63 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.7 (ภาคตะวันตกและภาคกลางตอนล่าง) ---
  createNationalPoliceRow('np-30', 30, 'ภ.7', 'ภ.จว.นครปฐม', 'สภ.เมืองนครปฐม', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 26, occupied: 23 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 76, occupied: 68 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- ภ.8 (ภาคใต้ตอนบน) ---
  createNationalPoliceRow('np-31', 31, 'ภ.8', 'ภ.จว.ภูเก็ต', 'สภ.เมืองภูเก็ต', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 14, occupied: 13 },
    rsw: { positions: 30, occupied: 27 },
    rsw_special: { positions: 7, occupied: 7 },
    pbm: { positions: 92, occupied: 82 },
    rpbm: { positions: 8, occupied: 7 },
  }),

  // --- ภ.9 (ภาคใต้ตอนล่าง) ---
  createNationalPoliceRow('np-32', 32, 'ภ.9', 'ภ.จว.สงขลา', 'สภ.หาดใหญ่', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 5, occupied: 5 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 5, occupied: 5 },
    sw: { positions: 16, occupied: 15 },
    rsw: { positions: 38, occupied: 34 },
    rsw_special: { positions: 8, occupied: 8 },
    pbm: { positions: 115, occupied: 104 },
    rpbm: { positions: 11, occupied: 9 },
  }),
  createNationalPoliceRow('np-33', 33, 'ภ.9', 'ภ.จว.ยะลา', 'สภ.เมืองยะลา', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 1, occupied: 1 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 28, occupied: 25 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 82, occupied: 74 },
    rpbm: { positions: 8, occupied: 7 },
  }),

  // --- กองบัญชาการตำรวจสอบสวนกลาง (บช.ก.) ---
  createNationalPoliceRow('np-34', 34, 'บช.ก.', 'บก.ป. (กองปราบ)', 'กก.1 บก.ป.', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 6, occupied: 6 },
    sw: { positions: 16, occupied: 15 },
    rsw: { positions: 32, occupied: 29 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 75, occupied: 68 },
    rpbm: { positions: 8, occupied: 7 },
  }),
  createNationalPoliceRow('np-35', 35, 'บช.ก.', 'บก.ทล. (ตำรวจทางหลวง)', 'กก.1 บก.ทล.', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 5, occupied: 5 },
    sw: { positions: 14, occupied: 13 },
    rsw: { positions: 28, occupied: 25 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 72, occupied: 66 },
    rpbm: { positions: 7, occupied: 6 },
  }),

  // --- สำนักงานตรวจคนเข้าเมือง (สตม.) ---
  createNationalPoliceRow('np-36', 36, 'สตม.', 'บก.ตม.2', 'กก.สืบสวน บก.ตม.2', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 4, occupied: 4 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 6, occupied: 6 },
    sw: { positions: 15, occupied: 14 },
    rsw: { positions: 30, occupied: 27 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 80, occupied: 72 },
    rpbm: { positions: 8, occupied: 7 },
  }),

  // --- บช.สอท. (ตำรวจไซเบอร์) ---
  createNationalPoliceRow('np-37', 37, 'บช.สอท.', 'บก.สอท.1', 'กก.1 บก.สอท.1', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 3, occupied: 3 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 4, occupied: 4 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 24, occupied: 22 },
    rsw_special: { positions: 5, occupied: 5 },
    pbm: { positions: 50, occupied: 45 },
    rpbm: { positions: 5, occupied: 4 },
  }),

  // --- บช.ตชด. ---
  createNationalPoliceRow('np-38', 38, 'บช.ตชด.', 'บก.ตชด.ภาค 4', 'กก.ตชด.44', {
    pbg: { positions: 1, occupied: 1 },
    rpbg: { positions: 3, occupied: 3 },
    pgk: { positions: 2, occupied: 2 },
    rpgk: { positions: 5, occupied: 5 },
    sw: { positions: 12, occupied: 11 },
    rsw: { positions: 26, occupied: 23 },
    rsw_special: { positions: 6, occupied: 6 },
    pbm: { positions: 85, occupied: 76 },
    rpbm: { positions: 8, occupied: 7 },
  }),
];
