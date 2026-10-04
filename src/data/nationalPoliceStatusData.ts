/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NationalPoliceRanks,
  NationalPoliceRankStat,
  NationalPoliceUnitRow,
  NationalPoliceSyncSummary,
  UnitTierLevel,
} from '../types/nationalPoliceStatus';
import { PoliceOfficer } from '../types/personnel';

export const NATIONAL_POLICE_TITLE = 'สถานภาพข้าราชการตำรวจทั้งประเทศ';

/**
 * Compute summary statistics for a unit row based on rank inputs:
 * 1. รวมชั้นสัญญาบัตร = ผบก. + รอง ผบก. + ผกก. + รอง ผกก. + สว. + รอง สว.
 * 2. รวมชั้นประทวน = รอง สว.* + ผบ.หมู่
 * 3. รวมทั้งหมด = รวมชั้นสัญญาบัตร + รวมชั้นประทวน + รอง ผบ.หมู่
 */
export function computeNationalRowStats(ranks: NationalPoliceRanks): {
  totalCommissioned: NationalPoliceRankStat;
  totalNonCommissioned: NationalPoliceRankStat;
  grandTotal: NationalPoliceRankStat;
  vacant: number;
  occupancyPercent: number;
} {
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

  const nonCommPos = (ranks.rsw_star?.positions || 0) + (ranks.pbm?.positions || 0);
  const nonCommOcc = (ranks.rsw_star?.occupied || 0) + (ranks.pbm?.occupied || 0);

  const totalPos = commPos + nonCommPos + (ranks.rpbm?.positions || 0);
  const totalOcc = commOcc + nonCommOcc + (ranks.rpbm?.occupied || 0);

  const vacant = Math.max(0, totalPos - totalOcc);
  const occupancyPercent = totalPos > 0 ? Math.round((totalOcc / totalPos) * 1000) / 10 : 0;

  return {
    totalCommissioned: { positions: commPos, occupied: commOcc },
    totalNonCommissioned: { positions: nonCommPos, occupied: nonCommOcc },
    grandTotal: { positions: totalPos, occupied: totalOcc },
    vacant,
    occupancyPercent,
  };
}

/**
 * Enrich raw unit data into a fully calculated row
 */
export function enrichNationalUnitRow(
  id: string,
  no: number | string,
  unitName: string,
  ranks: NationalPoliceRanks,
  level: UnitTierLevel = 'bureau',
  parentBureauId?: string,
  parentDivisionId?: string,
  bureauCode?: string,
  category?: 'area_commands' | 'command_support' | 'specialized' | 'education' | 'other',
  notes?: string
): NationalPoliceUnitRow {
  const stats = computeNationalRowStats(ranks);
  return {
    id,
    no,
    unitName,
    level,
    parentBureauId,
    parentDivisionId,
    bureauCode: bureauCode || parentBureauId,
    category: category || 'area_commands',
    ranks,
    ...stats,
    notes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate grand totals across multiple rows
 */
export function calculateNationalGrandTotals(units: NationalPoliceUnitRow[]) {
  const sumRanks: NationalPoliceRanks = {
    pbg: { positions: 0, occupied: 0 },
    rpbg: { positions: 0, occupied: 0 },
    pgk: { positions: 0, occupied: 0 },
    rpgk: { positions: 0, occupied: 0 },
    sw: { positions: 0, occupied: 0 },
    rsw: { positions: 0, occupied: 0 },
    rsw_star: { positions: 0, occupied: 0 },
    pbm: { positions: 0, occupied: 0 },
    rpbm: { positions: 0, occupied: 0 },
  };

  units.forEach((u) => {
    sumRanks.pbg.positions += u.ranks.pbg?.positions || 0;
    sumRanks.pbg.occupied += u.ranks.pbg?.occupied || 0;
    sumRanks.rpbg.positions += u.ranks.rpbg?.positions || 0;
    sumRanks.rpbg.occupied += u.ranks.rpbg?.occupied || 0;
    sumRanks.pgk.positions += u.ranks.pgk?.positions || 0;
    sumRanks.pgk.occupied += u.ranks.pgk?.occupied || 0;
    sumRanks.rpgk.positions += u.ranks.rpgk?.positions || 0;
    sumRanks.rpgk.occupied += u.ranks.rpgk?.occupied || 0;
    sumRanks.sw.positions += u.ranks.sw?.positions || 0;
    sumRanks.sw.occupied += u.ranks.sw?.occupied || 0;
    sumRanks.rsw.positions += u.ranks.rsw?.positions || 0;
    sumRanks.rsw.occupied += u.ranks.rsw?.occupied || 0;
    sumRanks.rsw_star.positions += u.ranks.rsw_star?.positions || 0;
    sumRanks.rsw_star.occupied += u.ranks.rsw_star?.occupied || 0;
    sumRanks.pbm.positions += u.ranks.pbm?.positions || 0;
    sumRanks.pbm.occupied += u.ranks.pbm?.occupied || 0;
    sumRanks.rpbm.positions += u.ranks.rpbm?.positions || 0;
    sumRanks.rpbm.occupied += u.ranks.rpbm?.occupied || 0;
  });

  const totals = computeNationalRowStats(sumRanks);

  return {
    ranks: sumRanks,
    ...totals,
    totalUnits: units.length,
  };
}

/**
 * Creates empty zero-filled ranks
 */
export function createEmptyNationalRanks(): NationalPoliceRanks {
  return {
    pbg: { positions: 0, occupied: 0 },
    rpbg: { positions: 0, occupied: 0 },
    pgk: { positions: 0, occupied: 0 },
    rpgk: { positions: 0, occupied: 0 },
    sw: { positions: 0, occupied: 0 },
    rsw: { positions: 0, occupied: 0 },
    rsw_star: { positions: 0, occupied: 0 },
    pbm: { positions: 0, occupied: 0 },
    rpbm: { positions: 0, occupied: 0 },
  };
}

/**
 * Comprehensive Initial Police Units Structure covering all 3 tiers:
 * บช. (กองบัญชาการ) -> บก. (กองบังคับการ/ภ.จว./กอง) -> กก. (กองกำกับการ/ฝ่าย/สภ./สน.)
 */
export const INITIAL_NATIONAL_POLICE_UNITS: NationalPoliceUnitRow[] = [
  // =========================================================
  // 1. สำนักงานกำลังพล (สกพ.) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-skp',
    1,
    'สำนักงานกำลังพล (สกพ.)',
    {
      pbg: { positions: 4, occupied: 4 },
      rpbg: { positions: 11, occupied: 11 },
      pgk: { positions: 22, occupied: 21 },
      rpgk: { positions: 45, occupied: 43 },
      sw: { positions: 110, occupied: 105 },
      rsw: { positions: 260, occupied: 248 },
      rsw_star: { positions: 60, occupied: 57 },
      pbm: { positions: 650, occupied: 615 },
      rpbm: { positions: 45, occupied: 40 },
    },
    'bureau',
    undefined,
    undefined,
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ บช.'
  ),

  // บก. ในสังกัด สกพ.
  enrichNationalUnitRow(
    'div-skp-ot',
    '1.1',
    'กองอัตรากำลัง (อต.)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 3, occupied: 3 },
      pgk: { positions: 6, occupied: 6 },
      rpgk: { positions: 12, occupied: 11 },
      sw: { positions: 28, occupied: 27 },
      rsw: { positions: 65, occupied: 62 },
      rsw_star: { positions: 15, occupied: 14 },
      pbm: { positions: 160, occupied: 152 },
      rpbm: { positions: 12, occupied: 10 },
    },
    'division',
    'สกพ.',
    undefined,
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'subdiv-skp-ot-1',
    '1.1.1',
    'ฝ่ายอัตรากำลัง 1 (อต.1)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 2, occupied: 2 },
      sw: { positions: 5, occupied: 5 },
      rsw: { positions: 12, occupied: 11 },
      rsw_star: { positions: 3, occupied: 3 },
      pbm: { positions: 28, occupied: 26 },
      rpbm: { positions: 2, occupied: 2 },
    },
    'subdivision',
    'สกพ.',
    'กองอัตรากำลัง (อต.)',
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ กก.'
  ),
  enrichNationalUnitRow(
    'subdiv-skp-ot-2',
    '1.1.2',
    'ฝ่ายอัตรากำลัง 2 (อต.2)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 2, occupied: 2 },
      sw: { positions: 5, occupied: 5 },
      rsw: { positions: 12, occupied: 12 },
      rsw_star: { positions: 3, occupied: 3 },
      pbm: { positions: 30, occupied: 29 },
      rpbm: { positions: 2, occupied: 2 },
    },
    'subdivision',
    'สกพ.',
    'กองอัตรากำลัง (อต.)',
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ กก.'
  ),
  enrichNationalUnitRow(
    'subdiv-skp-ot-pos',
    '1.1.3',
    'ฝ่ายกำหนดตำแหน่ง (กต.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 2, occupied: 2 },
      sw: { positions: 4, occupied: 4 },
      rsw: { positions: 10, occupied: 10 },
      rsw_star: { positions: 2, occupied: 2 },
      pbm: { positions: 25, occupied: 24 },
      rpbm: { positions: 2, occupied: 1 },
    },
    'subdivision',
    'สกพ.',
    'กองอัตรากำลัง (อต.)',
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ กก.'
  ),

  enrichNationalUnitRow(
    'div-skp-tp',
    '1.2',
    'กองทะเบียนพล (ทพ.)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 3, occupied: 3 },
      pgk: { positions: 6, occupied: 6 },
      rpgk: { positions: 14, occupied: 13 },
      sw: { positions: 32, occupied: 30 },
      rsw: { positions: 78, occupied: 74 },
      rsw_star: { positions: 18, occupied: 17 },
      pbm: { positions: 195, occupied: 185 },
      rpbm: { positions: 14, occupied: 12 },
    },
    'division',
    'สกพ.',
    undefined,
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'subdiv-skp-tp-app',
    '1.2.1',
    'ฝ่ายแต่งตั้ง (ตต.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 2, occupied: 2 },
      sw: { positions: 6, occupied: 6 },
      rsw: { positions: 15, occupied: 14 },
      rsw_star: { positions: 3, occupied: 3 },
      pbm: { positions: 38, occupied: 36 },
      rpbm: { positions: 3, occupied: 3 },
    },
    'subdivision',
    'สกพ.',
    'กองทะเบียนพล (ทพ.)',
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ กก.'
  ),
  enrichNationalUnitRow(
    'subdiv-skp-tp-recruit',
    '1.2.2',
    'ฝ่ายบรรจุและสรรหา (บจ.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 2, occupied: 2 },
      sw: { positions: 5, occupied: 5 },
      rsw: { positions: 14, occupied: 13 },
      rsw_star: { positions: 3, occupied: 3 },
      pbm: { positions: 35, occupied: 33 },
      rpbm: { positions: 2, occupied: 2 },
    },
    'subdivision',
    'สกพ.',
    'กองทะเบียนพล (ทพ.)',
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ กก.'
  ),
  enrichNationalUnitRow(
    'subdiv-skp-tp-rec',
    '1.2.3',
    'ฝ่ายทะเบียนประวัติและสถิติ (ทป.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 2, occupied: 2 },
      sw: { positions: 5, occupied: 5 },
      rsw: { positions: 12, occupied: 11 },
      rsw_star: { positions: 3, occupied: 3 },
      pbm: { positions: 32, occupied: 30 },
      rpbm: { positions: 2, occupied: 2 },
    },
    'subdivision',
    'สกพ.',
    'กองทะเบียนพล (ทพ.)',
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ กก.'
  ),

  enrichNationalUnitRow(
    'div-skp-sk',
    '1.3',
    'กองสวัสดิการ (สก.)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 3, occupied: 3 },
      pgk: { positions: 5, occupied: 5 },
      rpgk: { positions: 10, occupied: 10 },
      sw: { positions: 26, occupied: 25 },
      rsw: { positions: 60, occupied: 57 },
      rsw_star: { positions: 14, occupied: 13 },
      pbm: { positions: 150, occupied: 142 },
      rpbm: { positions: 10, occupied: 9 },
    },
    'division',
    'สกพ.',
    undefined,
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'div-skp-adm',
    '1.4',
    'ฝ่ายอำนวยการ สำนักงานกำลังพล (ฝอ.สกพ.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 1, occupied: 1 },
      pgk: { positions: 2, occupied: 2 },
      rpgk: { positions: 4, occupied: 4 },
      sw: { positions: 12, occupied: 11 },
      rsw: { positions: 30, occupied: 28 },
      rsw_star: { positions: 8, occupied: 8 },
      pbm: { positions: 85, occupied: 80 },
      rpbm: { positions: 5, occupied: 5 },
    },
    'division',
    'สกพ.',
    undefined,
    'สกพ.',
    'command_support',
    'หน่วยงานระดับ บก.'
  ),

  // =========================================================
  // 2. กองบัญชาการตำรวจนครบาล (บช.น.) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-bchn',
    2,
    'กองบัญชาการตำรวจนครบาล (บช.น.)',
    {
      pbg: { positions: 15, occupied: 15 },
      rpbg: { positions: 52, occupied: 50 },
      pgk: { positions: 120, occupied: 118 },
      rpgk: { positions: 380, occupied: 365 },
      sw: { positions: 1250, occupied: 1190 },
      rsw: { positions: 3200, occupied: 3040 },
      rsw_star: { positions: 1100, occupied: 1050 },
      pbm: { positions: 11800, occupied: 10950 },
      rpbm: { positions: 950, occupied: 890 },
    },
    'bureau',
    undefined,
    undefined,
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ บช.'
  ),

  // บก. ในสังกัด บช.น.
  enrichNationalUnitRow(
    'div-bchn-d1',
    '2.1',
    'กองบังคับการตำรวจนครบาล 1 (บก.น.1)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 5, occupied: 5 },
      pgk: { positions: 12, occupied: 12 },
      rpgk: { positions: 38, occupied: 36 },
      sw: { positions: 125, occupied: 120 },
      rsw: { positions: 320, occupied: 305 },
      rsw_star: { positions: 110, occupied: 105 },
      pbm: { positions: 1180, occupied: 1100 },
      rpbm: { positions: 95, occupied: 88 },
    },
    'division',
    'บช.น.',
    undefined,
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'subdiv-bchn-d1-dusit',
    '2.1.1',
    'สถานีตำรวจนครบาลดุสิต (สน.ดุสิต)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 10, occupied: 9 },
      rsw: { positions: 25, occupied: 24 },
      rsw_star: { positions: 8, occupied: 8 },
      pbm: { positions: 95, occupied: 88 },
      rpbm: { positions: 6, occupied: 6 },
    },
    'subdivision',
    'บช.น.',
    'กองบังคับการตำรวจนครบาล 1 (บก.น.1)',
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),
  enrichNationalUnitRow(
    'subdiv-bchn-d1-phyathai',
    '2.1.2',
    'สถานีตำรวจนครบาลพญาไท (สน.พญาไท)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 12, occupied: 11 },
      rsw: { positions: 30, occupied: 28 },
      rsw_star: { positions: 10, occupied: 9 },
      pbm: { positions: 110, occupied: 102 },
      rpbm: { positions: 8, occupied: 7 },
    },
    'subdivision',
    'บช.น.',
    'กองบังคับการตำรวจนครบาล 1 (บก.น.1)',
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),
  enrichNationalUnitRow(
    'subdiv-bchn-d1-nangleong',
    '2.1.3',
    'สถานีตำรวจนครบาลนางเลิ้ง (สน.นางเลิ้ง)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 9, occupied: 9 },
      rsw: { positions: 22, occupied: 21 },
      rsw_star: { positions: 7, occupied: 7 },
      pbm: { positions: 85, occupied: 80 },
      rpbm: { positions: 5, occupied: 5 },
    },
    'subdivision',
    'บช.น.',
    'กองบังคับการตำรวจนครบาล 1 (บก.น.1)',
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),

  enrichNationalUnitRow(
    'div-bchn-d2',
    '2.2',
    'กองบังคับการตำรวจนครบาล 2 (บก.น.2)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 5, occupied: 5 },
      pgk: { positions: 13, occupied: 13 },
      rpgk: { positions: 40, occupied: 38 },
      sw: { positions: 135, occupied: 128 },
      rsw: { positions: 340, occupied: 322 },
      rsw_star: { positions: 115, occupied: 110 },
      pbm: { positions: 1250, occupied: 1160 },
      rpbm: { positions: 100, occupied: 92 },
    },
    'division',
    'บช.น.',
    undefined,
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'div-bchn-d5',
    '2.3',
    'กองบังคับการตำรวจนครบาล 5 (บก.น.5)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 5, occupied: 5 },
      pgk: { positions: 12, occupied: 12 },
      rpgk: { positions: 38, occupied: 37 },
      sw: { positions: 130, occupied: 124 },
      rsw: { positions: 330, occupied: 314 },
      rsw_star: { positions: 112, occupied: 107 },
      pbm: { positions: 1200, occupied: 1115 },
      rpbm: { positions: 98, occupied: 90 },
    },
    'division',
    'บช.น.',
    undefined,
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'div-bchn-spp',
    '2.4',
    'กองบังคับการสายตรวจและปฏิบัติการพิเศษ (191)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 4, occupied: 4 },
      pgk: { positions: 8, occupied: 8 },
      rpgk: { positions: 24, occupied: 23 },
      sw: { positions: 80, occupied: 76 },
      rsw: { positions: 210, occupied: 198 },
      rsw_star: { positions: 70, occupied: 66 },
      pbm: { positions: 850, occupied: 790 },
      rpbm: { positions: 60, occupied: 55 },
    },
    'division',
    'บช.น.',
    undefined,
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'div-bchn-traffic',
    '2.5',
    'กองบังคับการตำรวจจราจร (บก.จร.)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 4, occupied: 4 },
      pgk: { positions: 9, occupied: 9 },
      rpgk: { positions: 26, occupied: 25 },
      sw: { positions: 85, occupied: 81 },
      rsw: { positions: 230, occupied: 218 },
      rsw_star: { positions: 80, occupied: 76 },
      pbm: { positions: 920, occupied: 860 },
      rpbm: { positions: 70, occupied: 65 },
    },
    'division',
    'บช.น.',
    undefined,
    'บช.น.',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),

  // =========================================================
  // 3. ตำรวจภูธรภาค 1 (ภ.1) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-p1',
    3,
    'ตำรวจภูธรภาค 1 (ภ.1)',
    {
      pbg: { positions: 12, occupied: 12 },
      rpbg: { positions: 42, occupied: 41 },
      pgk: { positions: 145, occupied: 142 },
      rpgk: { positions: 420, occupied: 405 },
      sw: { positions: 1180, occupied: 1120 },
      rsw: { positions: 2950, occupied: 2810 },
      rsw_star: { positions: 980, occupied: 940 },
      pbm: { positions: 10500, occupied: 9820 },
      rpbm: { positions: 820, occupied: 760 },
    },
    'bureau',
    undefined,
    undefined,
    'ภ.1',
    'area_commands',
    'หน่วยงานระดับ บช.'
  ),
  enrichNationalUnitRow(
    'div-p1-nonthaburi',
    '3.1',
    'ตำรวจภูธรจังหวัดนนทบุรี (ภ.จว.นนทบุรี)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 4, occupied: 4 },
      pgk: { positions: 12, occupied: 12 },
      rpgk: { positions: 35, occupied: 34 },
      sw: { positions: 105, occupied: 100 },
      rsw: { positions: 260, occupied: 248 },
      rsw_star: { positions: 85, occupied: 81 },
      pbm: { positions: 920, occupied: 860 },
      rpbm: { positions: 70, occupied: 65 },
    },
    'division',
    'ภ.1',
    undefined,
    'ภ.1',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'subdiv-p1-nonthaburi-city',
    '3.1.1',
    'สถานีตำรวจภูธรเมืองนนทบุรี (สภ.เมืองนนทบุรี)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 11, occupied: 10 },
      rsw: { positions: 28, occupied: 27 },
      rsw_star: { positions: 9, occupied: 9 },
      pbm: { positions: 105, occupied: 98 },
      rpbm: { positions: 8, occupied: 7 },
    },
    'subdivision',
    'ภ.1',
    'ตำรวจภูธรจังหวัดนนทบุรี (ภ.จว.นนทบุรี)',
    'ภ.1',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),
  enrichNationalUnitRow(
    'subdiv-p1-nonthaburi-ratanathibet',
    '3.1.2',
    'สถานีตำรวจภูธรรัตนาธิเบศร์ (สภ.รัตนาธิเบศร์)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 10, occupied: 10 },
      rsw: { positions: 26, occupied: 25 },
      rsw_star: { positions: 8, occupied: 8 },
      pbm: { positions: 95, occupied: 90 },
      rpbm: { positions: 7, occupied: 6 },
    },
    'subdivision',
    'ภ.1',
    'ตำรวจภูธรจังหวัดนนทบุรี (ภ.จว.นนทบุรี)',
    'ภ.1',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),

  // =========================================================
  // 4. ตำรวจภูธรภาค 9 (ภ.9) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-p9',
    4,
    'ตำรวจภูธรภาค 9 (ภ.9)',
    {
      pbg: { positions: 11, occupied: 11 },
      rpbg: { positions: 42, occupied: 41 },
      pgk: { positions: 160, occupied: 156 },
      rpgk: { positions: 450, occupied: 432 },
      sw: { positions: 1250, occupied: 1180 },
      rsw: { positions: 3200, occupied: 3040 },
      rsw_star: { positions: 1080, occupied: 1020 },
      pbm: { positions: 12100, occupied: 11350 },
      rpbm: { positions: 910, occupied: 840 },
    },
    'bureau',
    undefined,
    undefined,
    'ภ.9',
    'area_commands',
    'หน่วยงานระดับ บช.'
  ),
  enrichNationalUnitRow(
    'div-p9-yala',
    '4.1',
    'ตำรวจภูธรจังหวัดยะลา (ภ.จว.ยะลา)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 4, occupied: 4 },
      pgk: { positions: 15, occupied: 15 },
      rpgk: { positions: 42, occupied: 40 },
      sw: { positions: 120, occupied: 114 },
      rsw: { positions: 310, occupied: 295 },
      rsw_star: { positions: 105, occupied: 99 },
      pbm: { positions: 1150, occupied: 1080 },
      rpbm: { positions: 88, occupied: 80 },
    },
    'division',
    'ภ.9',
    undefined,
    'ภ.9',
    'area_commands',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'subdiv-p9-yala-city',
    '4.1.1',
    'สถานีตำรวจภูธรเมืองยะลา (สภ.เมืองยะลา)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 12, occupied: 11 },
      rsw: { positions: 32, occupied: 30 },
      rsw_star: { positions: 11, occupied: 10 },
      pbm: { positions: 125, occupied: 118 },
      rpbm: { positions: 9, occupied: 8 },
    },
    'subdivision',
    'ภ.9',
    'ตำรวจภูธรจังหวัดยะลา (ภ.จว.ยะลา)',
    'ภ.9',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),
  enrichNationalUnitRow(
    'subdiv-p9-yala-betong',
    '4.1.2',
    'สถานีตำรวจภูธรเบตง (สภ.เบตง)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 10, occupied: 10 },
      rsw: { positions: 28, occupied: 26 },
      rsw_star: { positions: 9, occupied: 8 },
      pbm: { positions: 110, occupied: 102 },
      rpbm: { positions: 8, occupied: 7 },
    },
    'subdivision',
    'ภ.9',
    'ตำรวจภูธรจังหวัดยะลา (ภ.จว.ยะลา)',
    'ภ.9',
    'area_commands',
    'หน่วยงานระดับ กก. / สภ. / สน.'
  ),

  // =========================================================
  // 5. กองบัญชาการตำรวจสอบสวนกลาง (บช.ก.) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-cib',
    5,
    'กองบัญชาการตำรวจสอบสวนกลาง (บช.ก.)',
    {
      pbg: { positions: 14, occupied: 14 },
      rpbg: { positions: 45, occupied: 44 },
      pgk: { positions: 85, occupied: 83 },
      rpgk: { positions: 240, occupied: 232 },
      sw: { positions: 750, occupied: 720 },
      rsw: { positions: 1850, occupied: 1770 },
      rsw_star: { positions: 520, occupied: 495 },
      pbm: { positions: 6200, occupied: 5850 },
      rpbm: { positions: 410, occupied: 380 },
    },
    'bureau',
    undefined,
    undefined,
    'บช.ก.',
    'specialized',
    'หน่วยงานระดับ บช.'
  ),
  enrichNationalUnitRow(
    'div-cib-csd',
    '5.1',
    'กองบังคับการปราบปราม (บก.ป.)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 5, occupied: 5 },
      pgk: { positions: 8, occupied: 8 },
      rpgk: { positions: 24, occupied: 24 },
      sw: { positions: 75, occupied: 72 },
      rsw: { positions: 190, occupied: 182 },
      rsw_star: { positions: 50, occupied: 48 },
      pbm: { positions: 620, occupied: 590 },
      rpbm: { positions: 40, occupied: 37 },
    },
    'division',
    'บช.ก.',
    undefined,
    'บช.ก.',
    'specialized',
    'หน่วยงานระดับ บก.'
  ),
  enrichNationalUnitRow(
    'subdiv-cib-csd-1',
    '5.1.1',
    'กองกำกับการ 1 กองบังคับการปราบปราม (กก.1 บก.ป.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 10, occupied: 10 },
      rsw: { positions: 26, occupied: 25 },
      rsw_star: { positions: 7, occupied: 7 },
      pbm: { positions: 85, occupied: 81 },
      rpbm: { positions: 5, occupied: 5 },
    },
    'subdivision',
    'บช.ก.',
    'กองบังคับการปราบปราม (บก.ป.)',
    'บช.ก.',
    'specialized',
    'หน่วยงานระดับ กก.'
  ),
  enrichNationalUnitRow(
    'subdiv-cib-csd-2',
    '5.1.2',
    'กองกำกับการ 2 กองบังคับการปราบปราม (กก.2 บก.ป.)',
    {
      pbg: { positions: 0, occupied: 0 },
      rpbg: { positions: 0, occupied: 0 },
      pgk: { positions: 1, occupied: 1 },
      rpgk: { positions: 3, occupied: 3 },
      sw: { positions: 10, occupied: 9 },
      rsw: { positions: 25, occupied: 24 },
      rsw_star: { positions: 7, occupied: 7 },
      pbm: { positions: 80, occupied: 76 },
      rpbm: { positions: 5, occupied: 5 },
    },
    'subdivision',
    'บช.ก.',
    'กองบังคับการปราบปราม (บก.ป.)',
    'บช.ก.',
    'specialized',
    'หน่วยงานระดับ กก.'
  ),

  // =========================================================
  // 6. สำนักงานงบประมาณและการเงิน (สงป.) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-budget',
    6,
    'สำนักงานงบประมาณและการเงิน (สงป.)',
    {
      pbg: { positions: 4, occupied: 4 },
      rpbg: { positions: 10, occupied: 10 },
      pgk: { positions: 18, occupied: 18 },
      rpgk: { positions: 38, occupied: 36 },
      sw: { positions: 95, occupied: 90 },
      rsw: { positions: 210, occupied: 200 },
      rsw_star: { positions: 50, occupied: 47 },
      pbm: { positions: 520, occupied: 490 },
      rpbm: { positions: 35, occupied: 30 },
    },
    'bureau',
    undefined,
    undefined,
    'สงป.',
    'command_support',
    'หน่วยงานระดับ บช.'
  ),
  enrichNationalUnitRow(
    'div-budget-bg',
    '6.1',
    'กองงบประมาณ (งป.)',
    {
      pbg: { positions: 1, occupied: 1 },
      rpbg: { positions: 3, occupied: 3 },
      pgk: { positions: 5, occupied: 5 },
      rpgk: { positions: 10, occupied: 10 },
      sw: { positions: 26, occupied: 25 },
      rsw: { positions: 58, occupied: 55 },
      rsw_star: { positions: 14, occupied: 13 },
      pbm: { positions: 140, occupied: 132 },
      rpbm: { positions: 10, occupied: 8 },
    },
    'division',
    'สงป.',
    undefined,
    'สงป.',
    'command_support',
    'หน่วยงานระดับ บก.'
  ),

  // =========================================================
  // 7. สำนักงานตรวจคนเข้าเมือง (สตม.) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-ib',
    7,
    'สำนักงานตรวจคนเข้าเมือง (สตม.)',
    {
      pbg: { positions: 8, occupied: 8 },
      rpbg: { positions: 26, occupied: 25 },
      pgk: { positions: 54, occupied: 52 },
      rpgk: { positions: 160, occupied: 153 },
      sw: { positions: 490, occupied: 468 },
      rsw: { positions: 1200, occupied: 1140 },
      rsw_star: { positions: 340, occupied: 325 },
      pbm: { positions: 3800, occupied: 3560 },
      rpbm: { positions: 260, occupied: 240 },
    },
    'bureau',
    undefined,
    undefined,
    'สตม.',
    'specialized',
    'หน่วยงานระดับ บช.'
  ),

  // =========================================================
  // 8. กองบัญชาการตำรวจปราบปรามยาเสพติด (บช.ปส.) - บช.
  // =========================================================
  enrichNationalUnitRow(
    'bureau-nsb',
    8,
    'กองบัญชาการตำรวจปราบปรามยาเสพติด (บช.ปส.)',
    {
      pbg: { positions: 6, occupied: 6 },
      rpbg: { positions: 18, occupied: 17 },
      pgk: { positions: 32, occupied: 31 },
      rpgk: { positions: 95, occupied: 91 },
      sw: { positions: 280, occupied: 268 },
      rsw: { positions: 680, occupied: 645 },
      rsw_star: { positions: 190, occupied: 180 },
      pbm: { positions: 2200, occupied: 2060 },
      rpbm: { positions: 150, occupied: 135 },
    },
    'bureau',
    undefined,
    undefined,
    'บช.ปส.',
    'specialized',
    'หน่วยงานระดับ บช.'
  ),
];

/**
 * Smart Rank Mapping helper for an officer from the Roster
 */
export function categorizeOfficerRank(officer: PoliceOfficer): keyof NationalPoliceRanks {
  const posLevel = (officer.positionLevel || '').trim();
  const posTitle = (officer.positionTitle || '').trim();
  const rank = (officer.rank || '').trim();

  // 1. ผบก.
  if (
    posLevel === 'ผบก.' ||
    posTitle.includes('ผบก.') ||
    posTitle.includes('ผู้บังคับการ') ||
    rank === 'พล.ต.ต.'
  ) {
    return 'pbg';
  }

  // 2. รอง ผบก.
  if (
    posLevel === 'รอง ผบก.' ||
    posTitle.includes('รอง ผบก.') ||
    posTitle.includes('รองผู้บังคับการ')
  ) {
    return 'rpbg';
  }

  // 3. ผกก.
  if (
    posLevel === 'ผกก.' ||
    posTitle.includes('ผกก.') ||
    posTitle.includes('ผู้กำกับการ') ||
    posTitle.includes('หน.สภ.')
  ) {
    return 'pgk';
  }

  // 4. รอง ผกก.
  if (
    posLevel === 'รอง ผกก.' ||
    posTitle.includes('รอง ผกก.') ||
    posTitle.includes('รองผู้กำกับการ')
  ) {
    return 'rpgk';
  }

  // 5. สว.
  if (
    posLevel === 'สว.' ||
    posTitle.includes('สว.') ||
    posTitle.includes('สารวัตร')
  ) {
    return 'sw';
  }

  // 6. รอง สว.* (รอง สว. (ท. / ด.ต.53 ปี))
  if (
    posLevel.includes('รอง สว.*') ||
    posLevel.includes('ด.ต.53') ||
    posTitle.includes('ด.ต.53') ||
    posTitle.includes('รอง สว.*') ||
    posTitle.includes('รอง สว.(ท.)') ||
    posTitle.includes('ท.(ด.ต.53')
  ) {
    return 'rsw_star';
  }

  // 7. รอง สว.
  if (
    posLevel === 'รอง สว.' ||
    posTitle.includes('รอง สว.') ||
    posTitle.includes('รองสารวัตร')
  ) {
    return 'rsw';
  }

  // 8. รอง ผบ.หมู่
  if (
    posLevel === 'รอง ผบ.หมู่' ||
    posTitle.includes('รอง ผบ.หมู่')
  ) {
    return 'rpbm';
  }

  // 9. ผบ.หมู่
  if (
    posLevel === 'ผบ.หมู่' ||
    posTitle.includes('ผบ.หมู่') ||
    officer.commissionType === 'ประทวน'
  ) {
    return 'pbm';
  }

  // Default fallback based on rank / commission
  if (officer.commissionType === 'สัญญาบัตร') {
    if (rank.includes('พ.ต.อ.')) return 'pgk';
    if (rank.includes('พ.ต.ท.')) return 'rpgk';
    if (rank.includes('พ.ต.ต.')) return 'sw';
    return 'rsw';
  }

  return 'pbm';
}

/**
 * Intelligent function to sync all data from the Personnel Roster (ทำเนียบกำลังพล)
 * into the 3-Tier National Police Table (บช. / บก. / กก.)!
 */
export function syncNationalStatusFromRoster(
  officers: PoliceOfficer[],
  existingUnits: NationalPoliceUnitRow[]
): {
  updatedUnits: NationalPoliceUnitRow[];
  summary: NationalPoliceSyncSummary;
} {
  if (!officers || officers.length === 0) {
    return {
      updatedUnits: existingUnits,
      summary: {
        totalUnitsMatched: 0,
        totalOfficersProcessed: 0,
        newUnitsCreated: 0,
        bureausCount: 0,
        divisionsCount: 0,
        subdivisionsCount: 0,
      },
    };
  }

  // 1. Group by bureau (บช.)
  const bureauMap = new Map<string, {
    name: string;
    ranks: NationalPoliceRanks;
    count: number;
  }>();

  // 2. Group by division (บก.)
  const divisionMap = new Map<string, {
    name: string;
    bureauId: string;
    ranks: NationalPoliceRanks;
    count: number;
  }>();

  // 3. Group by subdivision (กก.)
  const subDivisionMap = new Map<string, {
    name: string;
    bureauId: string;
    divisionId: string;
    ranks: NationalPoliceRanks;
    count: number;
  }>();

  officers.forEach((o) => {
    const bureau = (o.bureau || 'สกพ.').trim();
    const div = (o.division || 'สำนักงานกำลังพล').trim();
    const sub = (o.subDivision || div).trim();

    const rankKey = categorizeOfficerRank(o);
    const isOccupied = !o.isVacant && ((o.firstName && o.firstName.trim() !== '') || (o.rank && o.rank.trim() !== ''));

    // Populate บช.
    if (!bureauMap.has(bureau)) {
      bureauMap.set(bureau, {
        name: bureau === 'สกพ.' ? 'สำนักงานกำลังพล (สกพ.)' : bureau,
        ranks: createEmptyNationalRanks(),
        count: 0,
      });
    }
    const bGroup = bureauMap.get(bureau)!;
    bGroup.count++;
    bGroup.ranks[rankKey].positions++;
    if (isOccupied) bGroup.ranks[rankKey].occupied++;

    // Populate บก.
    const divKey = `${bureau}|||${div}`;
    if (!divisionMap.has(divKey)) {
      divisionMap.set(divKey, {
        name: div,
        bureauId: bureau,
        ranks: createEmptyNationalRanks(),
        count: 0,
      });
    }
    const dGroup = divisionMap.get(divKey)!;
    dGroup.count++;
    dGroup.ranks[rankKey].positions++;
    if (isOccupied) dGroup.ranks[rankKey].occupied++;

    // Populate กก. (only if sub exists and is distinct)
    if (sub && sub !== div) {
      const subKey = `${bureau}|||${div}|||${sub}`;
      if (!subDivisionMap.has(subKey)) {
        subDivisionMap.set(subKey, {
          name: sub,
          bureauId: bureau,
          divisionId: div,
          ranks: createEmptyNationalRanks(),
          count: 0,
        });
      }
      const sGroup = subDivisionMap.get(subKey)!;
      sGroup.count++;
      sGroup.ranks[rankKey].positions++;
      if (isOccupied) sGroup.ranks[rankKey].occupied++;
    }
  });

  const nextUnits = [...existingUnits];
  let matchedCount = 0;
  let createdCount = 0;

  // Helper to merge or create
  const mergeOrCreate = (
    name: string,
    ranks: NationalPoliceRanks,
    level: UnitTierLevel,
    parentBureau?: string,
    parentDivision?: string,
    count = 0
  ) => {
    const existingIdx = nextUnits.findIndex(
      (u) =>
        u.level === level &&
        (u.unitName.toLowerCase() === name.toLowerCase() ||
          (u.bureauCode && u.bureauCode.toLowerCase() === name.toLowerCase()) ||
          u.unitName.includes(name) ||
          name.includes(u.unitName))
    );

    if (existingIdx >= 0) {
      const target = nextUnits[existingIdx];
      const mergedRanks: NationalPoliceRanks = {
        pbg: {
          positions: ranks.pbg.positions > 0 ? ranks.pbg.positions : target.ranks.pbg.positions,
          occupied: ranks.pbg.positions > 0 ? ranks.pbg.occupied : target.ranks.pbg.occupied,
        },
        rpbg: {
          positions: ranks.rpbg.positions > 0 ? ranks.rpbg.positions : target.ranks.rpbg.positions,
          occupied: ranks.rpbg.positions > 0 ? ranks.rpbg.occupied : target.ranks.rpbg.occupied,
        },
        pgk: {
          positions: ranks.pgk.positions > 0 ? ranks.pgk.positions : target.ranks.pgk.positions,
          occupied: ranks.pgk.positions > 0 ? ranks.pgk.occupied : target.ranks.pgk.occupied,
        },
        rpgk: {
          positions: ranks.rpgk.positions > 0 ? ranks.rpgk.positions : target.ranks.rpgk.positions,
          occupied: ranks.rpgk.positions > 0 ? ranks.rpgk.occupied : target.ranks.rpgk.occupied,
        },
        sw: {
          positions: ranks.sw.positions > 0 ? ranks.sw.positions : target.ranks.sw.positions,
          occupied: ranks.sw.positions > 0 ? ranks.sw.occupied : target.ranks.sw.occupied,
        },
        rsw: {
          positions: ranks.rsw.positions > 0 ? ranks.rsw.positions : target.ranks.rsw.positions,
          occupied: ranks.rsw.positions > 0 ? ranks.rsw.occupied : target.ranks.rsw.occupied,
        },
        rsw_star: {
          positions: ranks.rsw_star.positions > 0 ? ranks.rsw_star.positions : target.ranks.rsw_star.positions,
          occupied: ranks.rsw_star.positions > 0 ? ranks.rsw_star.occupied : target.ranks.rsw_star.occupied,
        },
        pbm: {
          positions: ranks.pbm.positions > 0 ? ranks.pbm.positions : target.ranks.pbm.positions,
          occupied: ranks.pbm.positions > 0 ? ranks.pbm.occupied : target.ranks.pbm.occupied,
        },
        rpbm: {
          positions: ranks.rpbm.positions > 0 ? ranks.rpbm.positions : target.ranks.rpbm.positions,
          occupied: ranks.rpbm.positions > 0 ? ranks.rpbm.occupied : target.ranks.rpbm.occupied,
        },
      };

      nextUnits[existingIdx] = enrichNationalUnitRow(
        target.id,
        target.no,
        target.unitName,
        mergedRanks,
        target.level,
        target.parentBureauId || parentBureau,
        target.parentDivisionId || parentDivision,
        target.bureauCode || parentBureau,
        target.category,
        `ซิงค์จากทำเนียบ (${count} อัตรา)`
      );
      matchedCount++;
    } else {
      createdCount++;
      const newRow = enrichNationalUnitRow(
        `unit-${level}-${Date.now()}-${createdCount}`,
        nextUnits.length + 1,
        name,
        ranks,
        level,
        parentBureau,
        parentDivision,
        parentBureau,
        'other',
        `ซิงค์จากทำเนียบ (${count} อัตรา)`
      );
      nextUnits.push(newRow);
    }
  };

  // 1. Process บช.
  bureauMap.forEach((data, bureauKey) => {
    mergeOrCreate(data.name, data.ranks, 'bureau', bureauKey, undefined, data.count);
  });

  // 2. Process บก.
  divisionMap.forEach((data) => {
    mergeOrCreate(data.name, data.ranks, 'division', data.bureauId, undefined, data.count);
  });

  // 3. Process กก.
  subDivisionMap.forEach((data) => {
    mergeOrCreate(data.name, data.ranks, 'subdivision', data.bureauId, data.divisionId, data.count);
  });

  // Re-index row numbers
  const indexed = nextUnits.map((u, idx) => ({ ...u, no: idx + 1 }));

  return {
    updatedUnits: indexed,
    summary: {
      totalUnitsMatched: matchedCount,
      totalOfficersProcessed: officers.length,
      newUnitsCreated: createdCount,
      bureausCount: bureauMap.size,
      divisionsCount: divisionMap.size,
      subdivisionsCount: subDivisionMap.size,
    },
  };
}
