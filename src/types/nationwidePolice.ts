/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PoliceGroup } from '../data/rtpStructure';

export interface RankStat {
  positions: number; // กรอบอัตรา / ตำแหน่ง
  occupied: number;  // กำลังพลคนครอง
}

export interface UnitManpowerRanks {
  pbg: RankStat;      // ผบช. / ผบก. (หรือเทียบเท่า)
  rpbg: RankStat;     // รอง ผบก. (หรือเทียบเท่า)
  pgk: RankStat;      // ผกก. (หรือเทียบเท่า)
  rpgk: RankStat;     // รอง ผกก. (หรือเทียบเท่า)
  sw: RankStat;       // สว. (หรือเทียบเท่า)
  rsw: RankStat;      // รอง สว. (หรือเทียบเท่า)
  rt_dt53: RankStat;  // รอง สว.(ท.(ด.ต.53 ปี))
  pbm: RankStat;      // ผบ.หมู่
  rpbm: RankStat;     // รอง ผบ.หมู่
}

export type UnitTierLevel = 'บช.' | 'บก.' | 'กก.';

export interface NationwideUnitRow {
  id: string;
  unitLevel: UnitTierLevel;   // 'บช.' = กองบัญชาการ, 'บก.' = กองบังคับการ/กอง, 'กก.' = กองกำกับการ/สภ./สน./ฝ่าย
  parentId?: string;          // ID ของหน่วยเหนือ (เช่น บก. มี parent เป็น บช., กก. มี parent เป็น บก.)
  bureauId: string;           // รหัส บช. (เช่น สกพ., บช.น., ภ.1, บช.ก.)
  bureauName: string;         // ชื่อเต็ม บช.
  divisionId?: string;        // รหัส บก. (เช่น บก.น.1, บก.ป., กองอัตรากำลัง)
  divisionName?: string;      // ชื่อเต็ม บก.
  no: number | string;        // ลำดับ
  unitName: string;           // ชื่อหน่วยงาน เช่น "กองบัญชาการตำรวจนครบาล", "บก.น.1", "สน.ชนะสงคราม"
  shortName?: string;         // ชื่อย่อ
  group: PoliceGroup;         // กลุ่มภารกิจ ตร.
  groupName: string;          // ชื่อกลุ่มภารกิจ เช่น "ส่วนอำนวยการและสนับสนุน", "ส่วนป้องกันและปราบปรามพื้นที่"
  category?: string;          // หมวดหมู่งาน เช่น "อำนวยการ", "สืบสวน", "ป้องกันปราบปราม", "เฉพาะทาง"
  ranks: UnitManpowerRanks;
  
  // คำนวณอัตโนมัติ (Computed values)
  totalCommissioned: RankStat;    // รวมสัญญาบัตร (ผบก. ถึง รอง สว.)
  totalNonCommissioned: RankStat; // รวมประทวน (รอง สว.ท. ถึง รอง ผบ.หมู่)
  grandTotal: RankStat;           // รวมทั้งหมด (สัญญาบัตร + ประทวน)
  vacant: number;                 // ขาด / ว่าง (ตำแหน่ง - คนครอง)
  occupancyPercent: number;       // ร้อยละคนครอง (%)
  
  // โครงสร้างต้นไม้ (Tree view helpers)
  childrenIds?: string[];
  depth?: number;                 // 0 = บช., 1 = บก., 2 = กก.
}

export interface NationwideManpowerSummary {
  totalUnits: number;
  totalBureaus: number;
  totalDivisions: number;
  totalSubDivisions: number;
  totals: {
    ranks: UnitManpowerRanks;
    totalCommissioned: RankStat;
    totalNonCommissioned: RankStat;
    grandTotal: RankStat;
    vacant: number;
    occupancyPercent: number;
  };
}
