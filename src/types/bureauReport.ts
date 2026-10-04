/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PoliceOfficer } from './personnel';

export interface MatrixCellData {
  authorized: number;      // กรอบอัตราอนุมัติ
  occupied: number;        // คนครอง
  vacant: number;          // อัตราว่าง
  fillRate: number;        // ร้อยละการครองตำแหน่ง (0 - 100)
  commissioned: number;    // สัญญาบัตร
  nonCommissioned: number; // ประทวน
  male: number;            // เพศชาย
  female: number;          // เพศหญิง
  officers: PoliceOfficer[]; // ข้าราชการตำรวจในตำแหน่งนี้
}

export interface BureauMatrixRow {
  jobLine: string;         // สายงาน (เช่น ป้องกันปราบปราม, สืบสวน, สอบสวน, จราจร, อำนวยการและสนับสนุน)
  jobGroup: string;        // กลุ่มสายงาน
  cells: Record<string, MatrixCellData>; // key = positionLevel (เช่น 'ผบช.', 'รอง ผบช.', 'ผบก.', ...)
  rowTotal: MatrixCellData; // ผลรวมทุกระดับตำแหน่งในสายงานนี้
}

export interface BureauStatusReportData {
  selectedBureau: string;
  selectedDivision: string;
  selectedJobGroup: string;
  levels: string[];        // รายการระดับตำแหน่งที่แสดงในคอลัมน์ (เรียงลำดับมาตรฐาน)
  rows: BureauMatrixRow[];  // รายการแถวสายงาน
  colTotals: Record<string, MatrixCellData>; // ผลรวมแนวตั้ง แยกตามระดับตำแหน่ง
  grandTotal: MatrixCellData; // ยอดรวมสุทธิของทั้ง บช.
  allBureaus: string[];    // รายชื่อ บช. ทั้งหมดที่มีในระบบ
  allDivisions: string[];  // รายชื่อ บก. ใน บช. ที่เลือก
  allJobGroups: string[];  // รายชื่อกลุ่มสายงานทั้งหมด
}

export type MatrixDisplayMode = 'all' | 'occupied' | 'vacant' | 'percentage' | 'compact';
