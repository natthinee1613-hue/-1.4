/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UnitTierLevel = 'bureau' | 'division' | 'subdivision'; // บช. | บก. | กก.

export interface NationalPoliceRankStat {
  positions: number; // ตำแหน่ง
  occupied: number;  // คนครอง
}

export interface NationalPoliceRanks {
  pbg: NationalPoliceRankStat;      // ผบก.
  rpbg: NationalPoliceRankStat;     // รอง ผบก.
  pgk: NationalPoliceRankStat;      // ผกก.
  rpgk: NationalPoliceRankStat;     // รอง ผกก.
  sw: NationalPoliceRankStat;       // สว.
  rsw: NationalPoliceRankStat;      // รอง สว.
  rsw_star: NationalPoliceRankStat; // รอง สว.* (หรือ รอง สว.(ท.(ด.ต.53 ปี)))
  pbm: NationalPoliceRankStat;      // ผบ.หมู่
  rpbm: NationalPoliceRankStat;     // รอง ผบ.หมู่
}

export interface NationalPoliceUnitRow {
  id: string;
  no: number | string;
  unitName: string;
  level: UnitTierLevel; // 'bureau' (บช.) | 'division' (บก.) | 'subdivision' (กก.)
  parentBureauId?: string; // รหัส บช. ต้นสังกัด เช่น 'สกพ.', 'บช.น.'
  parentDivisionId?: string; // รหัส บก. ต้นสังกัด เช่น 'กองอัตรากำลัง (อต.)', 'บก.น.1'
  bureauCode?: string;
  category?: 'area_commands' | 'command_support' | 'specialized' | 'education' | 'other';
  ranks: NationalPoliceRanks;
  // Computed values
  totalCommissioned: NationalPoliceRankStat;   // รวมชั้นสัญญาบัตร (ผบก. + รอง ผบก. + ผกก. + รอง ผกก. + สว. + รอง สว.)
  totalNonCommissioned: NationalPoliceRankStat; // รวมชั้นประทวน (รอง สว.* + ผบ.หมู่)
  grandTotal: NationalPoliceRankStat;           // รวมทั้งหมด (สัญญาบัตร + ประทวน + รอง ผบ.หมู่)
  vacant: number;                               // ตำแหน่งว่าง (ตำแหน่ง - คนครอง)
  occupancyPercent: number;                     // ร้อยละคนครอง (%)
  notes?: string;
  updatedAt?: string;
}

export interface NationalPoliceSyncSummary {
  totalUnitsMatched: number;
  totalOfficersProcessed: number;
  newUnitsCreated: number;
  bureausCount: number;
  divisionsCount: number;
  subdivisionsCount: number;
}
