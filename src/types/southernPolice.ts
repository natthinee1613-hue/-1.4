/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RankStat {
  positions: number; // ตำแหน่ง
  occupied: number;  // คนครอง
}

export interface UnitManpowerRanks {
  pbg: RankStat;      // ผบก.
  rpbg: RankStat;     // รอง ผบก.
  pgk: RankStat;      // ผกก.
  rpgk: RankStat;     // รอง ผกก.
  sw: RankStat;       // สว.
  rsw: RankStat;      // รอง สว.
  rt_dt53: RankStat;  // รอง สว.(ท.(ด.ต.53 ปี))
  pbm: RankStat;      // ผบ.หมู่
  rpbm: RankStat;     // รอง ผบ.หมู่
}

export interface UnitManpowerRow {
  id: string;
  sectionKey: string;
  no: number | string;
  unitName: string;
  ranks: UnitManpowerRanks;
  // Computed values
  totalCommissioned?: RankStat;    // รวมชั้นสัญญาบัตร
  totalNonCommissioned?: RankStat; // รวมชั้นประทวน
  grandTotal?: RankStat;           // รวมทั้งหมด
  vacant?: number;                 // ตำแหน่งว่าง
  occupancyPercent?: number;       // ร้อยละคนครอง
}

export interface SouthernPoliceSection {
  key: string;
  title: string;
  shortName: string;
  sheetName: string; // Max 31 chars for Excel
  description?: string;
  units: UnitManpowerRow[];
}
