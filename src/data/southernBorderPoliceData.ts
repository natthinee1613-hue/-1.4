/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UnitManpowerRow, UnitManpowerRanks, SouthernPoliceSection, RankStat } from '../types/southernPolice';

export const SOUTHERN_POLICE_TITLE = 'สถานภาพข้าราชการตำรวจ 3 จังหวัดชายแดนภาคใต้ และพื้นที่เสี่ยงภัยเฉพาะ 4 อำเภอในสังกัด ภ.จว.สงขลา';

/**
 * Helper to compute rank sums
 */
export function computeRowStats(ranks: UnitManpowerRanks): {
  totalCommissioned: RankStat;
  totalNonCommissioned: RankStat;
  grandTotal: RankStat;
  vacant: number;
  occupancyPercent: number;
} {
  const commPos =
    ranks.pbg.positions +
    ranks.rpbg.positions +
    ranks.pgk.positions +
    ranks.rpgk.positions +
    ranks.sw.positions +
    ranks.rsw.positions;

  const commOcc =
    ranks.pbg.occupied +
    ranks.rpbg.occupied +
    ranks.pgk.occupied +
    ranks.rpgk.occupied +
    ranks.sw.occupied +
    ranks.rsw.occupied;

  const nonCommPos = ranks.rt_dt53.positions + ranks.pbm.positions + ranks.rpbm.positions;
  const nonCommOcc = ranks.rt_dt53.occupied + ranks.pbm.occupied + ranks.rpbm.occupied;

  const totalPos = commPos + nonCommPos;
  const totalOcc = commOcc + nonCommOcc;
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
 * Enrich raw unit with computed fields
 */
export function enrichUnitRow(
  id: string,
  sectionKey: string,
  no: number | string,
  unitName: string,
  ranks: UnitManpowerRanks
): UnitManpowerRow {
  const stats = computeRowStats(ranks);
  return {
    id,
    sectionKey,
    no,
    unitName,
    ranks,
    ...stats,
  };
}

/**
 * Generate standard baseline ranks for realistic initial values
 */
function createBaselineRanks(type: 'bkg' | 'division' | 'station_l' | 'station_m' | 'station_s' | 'school'): UnitManpowerRanks {
  switch (type) {
    case 'bkg': // กองบังคับการ (บก.)
      return {
        pbg: { positions: 1, occupied: 1 },
        rpbg: { positions: 4, occupied: 4 },
        pgk: { positions: 2, occupied: 2 },
        rpgk: { positions: 4, occupied: 3 },
        sw: { positions: 10, occupied: 8 },
        rsw: { positions: 18, occupied: 15 },
        rt_dt53: { positions: 6, occupied: 5 },
        pbm: { positions: 35, occupied: 30 },
        rpbm: { positions: 5, occupied: 3 },
      };
    case 'division': // กองกำกับการ (กก.) / ฝ่ายอำนวยการ
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 2, occupied: 2 },
        sw: { positions: 5, occupied: 4 },
        rsw: { positions: 12, occupied: 10 },
        rt_dt53: { positions: 4, occupied: 4 },
        pbm: { positions: 28, occupied: 24 },
        rpbm: { positions: 4, occupied: 3 },
      };
    case 'station_l': // สภ. ขนาดใหญ่ (สภ.เมือง / อ.ใหญ่)
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 4, occupied: 4 },
        sw: { positions: 9, occupied: 8 },
        rsw: { positions: 24, occupied: 20 },
        rt_dt53: { positions: 12, occupied: 10 },
        pbm: { positions: 95, occupied: 82 },
        rpbm: { positions: 15, occupied: 12 },
      };
    case 'station_m': // สภ. ขนาดกลาง
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 2, occupied: 2 },
        sw: { positions: 5, occupied: 4 },
        rsw: { positions: 14, occupied: 12 },
        rt_dt53: { positions: 6, occupied: 5 },
        pbm: { positions: 55, occupied: 47 },
        rpbm: { positions: 8, occupied: 6 },
      };
    case 'station_s': // สภ. ขนาดเล็ก / สภ.ตำบล
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 0, occupied: 0 },
        rpgk: { positions: 1, occupied: 1 },
        sw: { positions: 2, occupied: 2 },
        rsw: { positions: 6, occupied: 5 },
        rt_dt53: { positions: 3, occupied: 3 },
        pbm: { positions: 24, occupied: 20 },
        rpbm: { positions: 4, occupied: 3 },
      };
    case 'school': // ศูนย์ฝึกอบรม
      return {
        pbg: { positions: 1, occupied: 1 },
        rpbg: { positions: 3, occupied: 3 },
        pgk: { positions: 3, occupied: 2 },
        rpgk: { positions: 6, occupied: 5 },
        sw: { positions: 14, occupied: 12 },
        rsw: { positions: 22, occupied: 19 },
        rt_dt53: { positions: 8, occupied: 7 },
        pbm: { positions: 45, occupied: 38 },
        rpbm: { positions: 6, occupied: 4 },
      };
  }
}

// 1. ภ.9 / บก.สส.ภ.9
const P9_SS_UNITS_RAW = [
  { no: '1', name: 'กก.ปฏิบัติการพิเศษ ภ.9', type: 'division' },
  { no: '1', name: 'บก.สืบสวนสอบสวน ภ.9', type: 'bkg' },
  { no: '2', name: 'ฝ่ายอำนวยการ บก.สส.ภ.9', type: 'division' },
  { no: '3', name: 'กก.วิเคราะห์ข่าวและเครื่องมือพิเศษ บก.สส.ภ.9', type: 'division' },
  { no: '4', name: 'กก.ปฏิบัติการพิเศษ บก.สส.ภ.9', type: 'division' },
  { no: '5', name: 'กก.สืบสวน 1 บก.สส.ภ.9', type: 'division' },
  { no: '6', name: 'กก.สืบสวน 2 บก.สส.ภ.9', type: 'division' },
  { no: '7', name: 'กก.สืบสวน 3 บก.สส.ภ.9', type: 'division' },
];

// 2. บก.สืบสวนสอบสวน จชต.
const SS_JCHT_UNITS_RAW = [
  { no: '1', name: 'บก.สืบสวนสอบสวน จชต.', type: 'bkg' },
  { no: '2', name: 'ฝ่ายอำนวยการ บก.สส.จชต.', type: 'division' },
  { no: '3', name: 'กลุ่มงานสอบสวน บก.สส.จชต.', type: 'division' },
  { no: '4', name: 'กก.เก็บกู้และตรวจสอบวัตถุระเบิด บก.สส.จชต.', type: 'division' },
  { no: '5', name: 'กก.สืบสวนสอบสวน 1 บก.สส.จชต.', type: 'division' },
  { no: '6', name: 'กก.สืบสวนสอบสวน 2 บก.สส.จชต.', type: 'division' },
  { no: '7', name: 'กก.สืบสวนสอบสวน 3 บก.สส.จชต.', type: 'division' },
  { no: '8', name: 'กก.ซักถาม 1 บก.สส.จชต.', type: 'division' },
  { no: '9', name: 'กก.ซักถาม 2 บก.สส.จชต.', type: 'division' },
];

// 3. ศฝร.ภ.9
const SFR_P9_UNITS_RAW = [
  { no: '1', name: 'ศฝร.ภ.9', type: 'school' },
  { no: '2', name: 'ฝ่ายอำนวยการ ศฝร.ภ.9', type: 'division' },
  { no: '3', name: 'ฝ่ายบริการการศึกษา ศฝร.ภ.9', type: 'division' },
  { no: '4', name: 'ฝ่ายปกครองและการฝึก ศฝร.ภ.9', type: 'division' },
  { no: '5', name: 'กลุ่มงานอาจารย์ ศฝร.ภ.9', type: 'division' },
];

// 4. ภ.จว.ยะลา
const YALA_UNITS_RAW = [
  { no: '1', name: 'ภ.จว.ยะลา', type: 'bkg' },
  { no: '2', name: 'ฝ่ายอำนวยการ ภ.จว.ยะลา', type: 'division' },
  { no: '3', name: 'กก.ปฏิบัติการพิเศษ ภ.จว.ยะลา', type: 'division' },
  { no: '4', name: 'กก.สืบสวน ภ.จว.ยะลา', type: 'division' },
  { no: '5', name: 'กลุ่มงานสอบสวน ภ.จว.ยะลา', type: 'division' },
  { no: '6', name: 'สภ.เมืองยะลา จว.ยะลา', type: 'station_l' },
  { no: '7', name: 'สภ.ลำใหม่ อ.เมือง จว.ยะลา', type: 'station_s' },
  { no: '8', name: 'สภ.ยะหา จว.ยะลา', type: 'station_m' },
  { no: '9', name: 'สภ.กาบัง จว.ยะลา', type: 'station_s' },
  { no: '10', name: 'สภ.ปะแต อ.ยะหา จว.ยะลา', type: 'station_s' },
  { no: '11', name: 'สภ.รามัน จว.ยะลา', type: 'station_m' },
  { no: '12', name: 'สภ.โกตาบารู อ.รามัน จว.ยะลา', type: 'station_s' },
  { no: '13', name: 'สภ.จะกว๊ะ อ.รามัน จว.ยะลา', type: 'station_s' },
  { no: '14', name: 'สภ.ท่าธง อ.รามัน จว.ยะลา', type: 'station_s' },
  { no: '15', name: 'สภ.บันนังสตา จว.ยะลา', type: 'station_m' },
  { no: '16', name: 'สภ.บาตูตาโมง อ.บันนังสตา จว.ยะลา', type: 'station_s' },
  { no: '17', name: 'สภ.ธารโต จว.ยะลา', type: 'station_m' },
  { no: '18', name: 'สภ.แม่หวาด อ.ธารโต จว.ยะลา', type: 'station_s' },
  { no: '19', name: 'สภ.เบตง จว.ยะลา', type: 'station_l' },
  { no: '20', name: 'สภ.อัยเยอร์เวง อ.เบตง จว.ยะลา', type: 'station_s' },
  { no: '21', name: 'สภ.ยะรม อ.เบตง จว.ยะลา', type: 'station_s' },
  { no: '22', name: 'สภ.กรงปินัง จว.ยะลา', type: 'station_s' },
  { no: '23', name: 'สภ.ตาเซะ จว.ยะลา', type: 'station_s' },
];

// 5. ภ.จว.ปัตตานี
const PATTANI_UNITS_RAW = [
  { no: '1', name: 'ภ.จว.ปัตตานี', type: 'bkg' },
  { no: '2', name: 'ฝ่ายอำนวยการ ภ.จว.ปัตตานี', type: 'division' },
  { no: '3', name: 'กก.ปฏิบัติการพิเศษ ภ.จว.ปัตตานี', type: 'division' },
  { no: '4', name: 'กก.สืบสวน ภ.จว.ปัตตานี', type: 'division' },
  { no: '5', name: 'กลุ่มงานสอบสวน ภ.จว.ปัตตานี', type: 'division' },
  { no: '6', name: 'สภ.เมืองปัตตานี ภ.จว.ปัตตานี', type: 'station_l' },
  { no: '7', name: 'สภ.นาประดู่ อ.โคกโพธิ์ ภ.จว.ปัตตานี', type: 'station_s' },
  { no: '8', name: 'สภ.สายบุรี ภ.จว.ปัตตานี', type: 'station_m' },
  { no: '9', name: 'สภ.โคกโพธิ์ จว.ปัตตานี', type: 'station_m' },
  { no: '10', name: 'สภ.แม่ลาน จว.ปัตตานี', type: 'station_s' },
  { no: '11', name: 'สภ.มายอ จว.ปัตตานี', type: 'station_m' },
  { no: '12', name: 'สภ.ปะนาเระ จว.ปัตตานี', type: 'station_m' },
  { no: '13', name: 'สภ.ยะรัง จว.ปัตตานี', type: 'station_m' },
  { no: '14', name: 'สภ.บ้านโสร่ง อ.ยะรัง จว.ปัตตานี', type: 'station_s' },
  { no: '15', name: 'สภ.ยะหริ่ง จว.ปัตตานี', type: 'station_m' },
  { no: '16', name: 'สภ.ราตาปันยัง อ.ยะหริ่ง จว.ปัตตานี', type: 'station_s' },
  { no: '17', name: 'สภ.หนองจิก จว.ปัตตานี', type: 'station_m' },
  { no: '18', name: 'สภ.ไม้แก่น จว.ปัตตานี', type: 'station_s' },
  { no: '19', name: 'สภ.ทุ่งยางแดง จว.ปัตตานี', type: 'station_s' },
  { no: '20', name: 'สภ.กะพ้อ จว.ปัตตานี', type: 'station_s' },
  { no: '21', name: 'สภ.ตุยง จว.ปัตตานี', type: 'station_s' },
];

// 6. ภ.จว.นราธิวาส
const NARATHIWAT_UNITS_RAW = [
  { no: '1', name: 'ภ.จว.นราธิวาส', type: 'bkg' },
  { no: '2', name: 'ฝ่ายอำนวยการ ภ.จว.นราธิวาส', type: 'division' },
  { no: '3', name: 'กก.ปฏิบัติการพิเศษ ภ.จว.นราธิวาส', type: 'division' },
  { no: '4', name: 'กก.สืบสวน ภ.จว.นราธิวาส', type: 'division' },
  { no: '5', name: 'กลุ่มงานสอบสวน ภ.จว.นราธิวาส', type: 'division' },
  { no: '6', name: 'สภ.เมืองนราธิวาส จว.นราธิวาส', type: 'station_l' },
  { no: '7', name: 'สภ.โคกเคียน อ.เมือง จว.นราธิวาส', type: 'station_s' },
  { no: '8', name: 'สภ.ตันหยง อ.เมือง จว.นราธิวาส', type: 'station_s' },
  { no: '9', name: 'สภ.ยี่งอ จว.นราธิวาส', type: 'station_m' },
  { no: '10', name: 'สภ.บาเจาะ จว.นราธิวาส', type: 'station_m' },
  { no: '11', name: 'สภ.ปะลุกาสาเมาะ อ.บาเจาะ จว.นราธิวาส', type: 'station_s' },
  { no: '12', name: 'สภ.รือเสาะ จว.นราธิวาส', type: 'station_m' },
  { no: '13', name: 'สภ.ระแงะ จว.นราธิวาส', type: 'station_m' },
  { no: '14', name: 'สภ.สุไหงปาดี จว.นราธิวาส', type: 'station_m' },
  { no: '15', name: 'สภ.สากอ อ.สุไหงปาดี จว.นราธิวาส', type: 'station_s' },
  { no: '16', name: 'สภ.สุไหงโก-ลก จว.นราธิวาส', type: 'station_l' },
  { no: '17', name: 'สภ.มูโนะ อ.สุไหงโก-ลก จว.นราธิวาส', type: 'station_s' },
  { no: '18', name: 'สภ.ตากใบ จว.นราธิวาส', type: 'station_m' },
  { no: '19', name: 'สภ.แว้ง จว.นราธิวาส', type: 'station_m' },
  { no: '20', name: 'สภ.บูเก๊ะตา อ.แว้ง จว.นราธิวาส', type: 'station_s' },
  { no: '21', name: 'สภ.สุคิริน จว.นราธิวาส', type: 'station_s' },
  { no: '22', name: 'สภ.ศรีสาคร จว.นราธิวาส', type: 'station_s' },
  { no: '23', name: 'สภ.จะแนะ จว.นราธิวาส', type: 'station_s' },
  { no: '24', name: 'สภ.เจาะไอร้อง จว.นราธิวาส', type: 'station_s' },
];

// 7. ภ.จว.สงขลา (เน้น 4 อำเภอความมั่นคงเสี่ยงภัย และพื้นที่ สภ.สงขลา)
const SONGKHLA_UNITS_RAW = [
  { no: '1', name: 'ภ.จว.สงขลา', type: 'bkg' },
  { no: '2', name: 'ฝ่ายอำนวยการ ภ.จว.สงขลา', type: 'division' },
  { no: '3', name: 'กก.ปฏิบัติการพิเศษ ภ.จว.สงขลา', type: 'division' },
  { no: '4', name: 'กก.สืบสวน ภ.จว.สงขลา', type: 'division' },
  { no: '5', name: 'กลุ่มงานสอบสวน ภ.จว.สงขลา', type: 'division' },
  { no: '6', name: 'สภ.เมืองสงขลา จว.สงขลา', type: 'station_l' },
  { no: '7', name: 'สภ.ม่วงงาม อ.สิงหนคร จว.สงขลา', type: 'station_s' },
  { no: '8', name: 'สภ.ระโนด จว.สงขลา', type: 'station_m' },
  { no: '9', name: 'สภ.คลองแดน อ.ระโนด จว.สงขลา', type: 'station_s' },
  { no: '10', name: 'สภ.สามบ่อ อ.ระโนด จว.สงขลา', type: 'station_s' },
  { no: '11', name: 'สภ.สทิงพระ จว.สงขลา', type: 'station_m' },
  { no: '12', name: 'สภ.ชุมพล อ.สทิงพระ จว.สงขลา', type: 'station_s' },
  { no: '13', name: 'สภ.กระแสสินธุ์ จว.สงขลา', type: 'station_s' },
  { no: '14', name: 'สภ.สิงหนคร จว.สงขลา', type: 'station_m' },
  { no: '15', name: 'สภ.ปากรอ อ.สิงหนคร จว.สงขลา', type: 'station_s' },
  { no: '16', name: 'สภ.หาดใหญ่ จว.สงขลา', type: 'station_l' },
  { no: '17', name: 'สภ.ทุ่งตำเสา อ.หาดใหญ่ จว.สงขลา', type: 'station_s' },
  { no: '18', name: 'สภ.ทุ่งลุง อ.หาดใหญ่ จว.สงขลา', type: 'station_m' },
  { no: '19', name: 'สภ.คูเต่า อ.หาดใหญ่ จว.สงขลา', type: 'station_s' },
  { no: '20', name: 'สภ.รัตภูมิ จว.สงขลา', type: 'station_m' },
  { no: '21', name: 'สภ.นาหม่อม จว.สงขลา', type: 'station_s' },
  { no: '22', name: 'สภ.ควนเนียง จว.สงขลา', type: 'station_s' },
  { no: '23', name: 'สภ.บางกล่ำ จว.สงขลา', type: 'station_s' },
  { no: '24', name: 'สภ.นาทวี จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_m' },
  { no: '25', name: 'สภ.สะท้อน อ.นาทวี จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_s' },
  { no: '26', name: 'สภ.เทพา จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_m' },
  { no: '27', name: 'สภ.ห้วยปลิง อ.เทพา จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_s' },
  { no: '28', name: 'สภ.สะบ้าย้อย จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_m' },
  { no: '29', name: 'สภ.บ้านโหนด อ.สะบ้าย้อย จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_s' },
  { no: '30', name: 'สภ.จะนะ จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_m' },
  { no: '31', name: 'สภ.ควนมีด อ.จะนะ จว.สงขลา (4 อ.เสี่ยงภัย)', type: 'station_s' },
  { no: '32', name: 'สภ.สะเดา จว.สงขลา', type: 'station_m' },
  { no: '33', name: 'สภ.ปาดังเบซาร์ อ.สะเดา จว.สงขลา', type: 'station_m' },
  { no: '34', name: 'สภ.คลองแงะ อ.สะเดา จว.สงขลา', type: 'station_s' },
  { no: '35', name: 'สภ.คอหงส์ จว.สงขลา', type: 'station_m' },
  { no: '36', name: 'สภ.คลองหอยโข่ง จว.สงขลา', type: 'station_s' },
];

function buildSectionUnits(sectionKey: string, rawList: Array<{ no: string; name: string; type: any }>): UnitManpowerRow[] {
  return rawList.map((item, idx) => {
    const id = `${sectionKey}-${idx + 1}`;
    const ranks = createBaselineRanks(item.type);
    return enrichUnitRow(id, sectionKey, item.no, item.name, ranks);
  });
}

export const INITIAL_SOUTHERN_POLICE_SECTIONS: SouthernPoliceSection[] = [
  {
    key: 'p9_ss',
    title: 'บก.สืบสวนสอบสวน ภ.9 และ กก.ปฏิบัติการพิเศษ ภ.9',
    shortName: 'บก.สส.ภ.9',
    sheetName: 'บก.สส.ภ.9',
    units: buildSectionUnits('p9_ss', P9_SS_UNITS_RAW),
  },
  {
    key: 'ss_jcht',
    title: 'กองบังคับการสืบสวนสอบสวนจังหวัดชายแดนภาคใต้ (บก.สส.จชต.)',
    shortName: 'บก.สส.จชต.',
    sheetName: 'บก.สส.จชต.',
    units: buildSectionUnits('ss_jcht', SS_JCHT_UNITS_RAW),
  },
  {
    key: 'sfr_p9',
    title: 'ศูนย์ฝึกอบรมตำรวจภูธรภาค 9 (ศฝร.ภ.9)',
    shortName: 'ศฝร.ภ.9',
    sheetName: 'ศฝร.ภ.9',
    units: buildSectionUnits('sfr_p9', SFR_P9_UNITS_RAW),
  },
  {
    key: 'yala',
    title: 'ตำรวจภูธรจังหวัดยะลา (ภ.จว.ยะลา - 23 สถานี/หน่วยงาน)',
    shortName: 'ภ.จว.ยะลา',
    sheetName: 'ภ.จว.ยะลา',
    units: buildSectionUnits('yala', YALA_UNITS_RAW),
  },
  {
    key: 'pattani',
    title: 'ตำรวจภูธรจังหวัดปัตตานี (ภ.จว.ปัตตานี - 21 สถานี/หน่วยงาน)',
    shortName: 'ภ.จว.ปัตตานี',
    sheetName: 'ภ.จว.ปัตตานี',
    units: buildSectionUnits('pattani', PATTANI_UNITS_RAW),
  },
  {
    key: 'narathiwat',
    title: 'ตำรวจภูธรจังหวัดนราธิวาส (ภ.จว.นราธิวาส - 24 สถานี/หน่วยงาน)',
    shortName: 'ภ.จว.นราธิวาส',
    sheetName: 'ภ.จว.นราธิวาส',
    units: buildSectionUnits('narathiwat', NARATHIWAT_UNITS_RAW),
  },
  {
    key: 'songkhla',
    title: 'ตำรวจภูธรจังหวัดสงขลา (ภ.จว.สงขลา 36 สภ./หน่วยงาน รวม 4 อ.ความมั่นคงเสี่ยงภัย)',
    shortName: 'ภ.จว.สงขลา',
    sheetName: 'ภ.จว.สงขลา (4 อ.เสี่ยงภัย)',
    units: buildSectionUnits('songkhla', SONGKHLA_UNITS_RAW),
  },
];

/**
 * Compute total for an entire array of units
 */
export function calculateTotalsForUnits(units: UnitManpowerRow[]): {
  ranks: UnitManpowerRanks;
  totalCommissioned: RankStat;
  totalNonCommissioned: RankStat;
  grandTotal: RankStat;
  vacant: number;
  occupancyPercent: number;
} {
  const sumRank = (getter: (u: UnitManpowerRow) => RankStat): RankStat => {
    let positions = 0;
    let occupied = 0;
    for (const u of units) {
      const s = getter(u);
      positions += s.positions || 0;
      occupied += s.occupied || 0;
    }
    return { positions, occupied };
  };

  const pbg = sumRank((u) => u.ranks.pbg);
  const rpbg = sumRank((u) => u.ranks.rpbg);
  const pgk = sumRank((u) => u.ranks.pgk);
  const rpgk = sumRank((u) => u.ranks.rpgk);
  const sw = sumRank((u) => u.ranks.sw);
  const rsw = sumRank((u) => u.ranks.rsw);
  const rt_dt53 = sumRank((u) => u.ranks.rt_dt53);
  const pbm = sumRank((u) => u.ranks.pbm);
  const rpbm = sumRank((u) => u.ranks.rpbm);

  const ranks: UnitManpowerRanks = {
    pbg,
    rpbg,
    pgk,
    rpgk,
    sw,
    rsw,
    rt_dt53,
    pbm,
    rpbm,
  };

  const stats = computeRowStats(ranks);
  return {
    ranks,
    ...stats,
  };
}
