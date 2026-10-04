/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RankStat {
  positions: number; // ตำแหน่ง
  occupied: number;  // คนครอง
}

export interface NationalPoliceRanks {
  pbg: RankStat;         // ผบก.
  rpbg: RankStat;        // รอง ผบก.
  pgk: RankStat;         // ผกก.
  rpgk: RankStat;        // รอง ผกก.
  sw: RankStat;          // สว.
  rsw: RankStat;         // รอง สว.
  rsw_special: RankStat; // รอง สว.* (เลื่อนไหล / อบรมพิเศษ / ด.ต. 53 ปี)
  pbm: RankStat;         // ผบ.หมู่
  rpbm: RankStat;        // รอง ผบ.หมู่
}

export interface NationalPoliceRow {
  id: string;
  no: number | string;   // ลำดับ
  bureau: string;        // บช.
  division: string;      // บก.
  subDivision: string;   // กก.
  ranks: NationalPoliceRanks;
  // Computed values
  totalCommissioned: RankStat;    // รวมชั้นสัญญาบัตร
  totalNonCommissioned: RankStat; // รวมชั้นประทวน
  grandTotal: RankStat;           // รวมทั้งหมด
  vacant: number;                 // ตำแหน่งว่าง
  occupancyPercent: number;       // ร้อยละคนครอง
  notes?: string;
  updatedAt?: string;
}

export interface NationalPoliceSummary {
  rowCount: number;
  totalPositions: number;
  totalOccupied: number;
  totalVacant: number;
  occupancyRate: number;
  commissionedPositions: number;
  commissionedOccupied: number;
  nonCommissionedPositions: number;
  nonCommissionedOccupied: number;
  ranks: {
    pbg: RankStat;
    rpbg: RankStat;
    pgk: RankStat;
    rpgk: RankStat;
    sw: RankStat;
    rsw: RankStat;
    rsw_special: RankStat;
    pbm: RankStat;
    rpbm: RankStat;
  };
}
