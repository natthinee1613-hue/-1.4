/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RankStat,
  UnitManpowerRanks,
  NationwideUnitRow,
  UnitTierLevel,
} from '../types/nationwidePolice';
import { RTP_BUREAUS_DATA, PoliceBureauNode } from './rtpStructure';

export const NATIONWIDE_POLICE_TITLE = 'สถานภาพกำลังพลข้าราชการตำรวจ สำนักงานตำรวจแห่งชาติ (ทั่วประเทศ)';

/**
 * คำนวณยอดรวมของแต่ละแถว (สัญญาบัตร, ประทวน, รวมทั้งหมด, ว่าง, % ครอง)
 */
export function computeNationwideRowStats(ranks: UnitManpowerRanks): {
  totalCommissioned: RankStat;
  totalNonCommissioned: RankStat;
  grandTotal: RankStat;
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

  const nonCommPos =
    (ranks.rt_dt53?.positions || 0) +
    (ranks.pbm?.positions || 0) +
    (ranks.rpbm?.positions || 0);

  const nonCommOcc =
    (ranks.rt_dt53?.occupied || 0) +
    (ranks.pbm?.occupied || 0) +
    (ranks.rpbm?.occupied || 0);

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
 * สร้างข้อมูลแถวพร้อมผลรวม
 */
export function enrichNationwideUnitRow(
  data: Omit<
    NationwideUnitRow,
    'totalCommissioned' | 'totalNonCommissioned' | 'grandTotal' | 'vacant' | 'occupancyPercent'
  >
): NationwideUnitRow {
  const stats = computeNationwideRowStats(data.ranks);
  return {
    ...data,
    ...stats,
  };
}

/**
 * ฟังก์ชันรวมสถิติจากอาเรย์ของแถว
 */
export function calculateTotalsForNationwideRows(rows: NationwideUnitRow[]): {
  ranks: UnitManpowerRanks;
  totalCommissioned: RankStat;
  totalNonCommissioned: RankStat;
  grandTotal: RankStat;
  vacant: number;
  occupancyPercent: number;
} {
  const initialRanks: UnitManpowerRanks = {
    pbg: { positions: 0, occupied: 0 },
    rpbg: { positions: 0, occupied: 0 },
    pgk: { positions: 0, occupied: 0 },
    rpgk: { positions: 0, occupied: 0 },
    sw: { positions: 0, occupied: 0 },
    rsw: { positions: 0, occupied: 0 },
    rt_dt53: { positions: 0, occupied: 0 },
    pbm: { positions: 0, occupied: 0 },
    rpbm: { positions: 0, occupied: 0 },
  };

  rows.forEach((r) => {
    (Object.keys(initialRanks) as Array<keyof UnitManpowerRanks>).forEach((k) => {
      initialRanks[k].positions += r.ranks[k]?.positions || 0;
      initialRanks[k].occupied += r.ranks[k]?.occupied || 0;
    });
  });

  const stats = computeNationwideRowStats(initialRanks);
  return {
    ranks: initialRanks,
    ...stats,
  };
}

/**
 * แม่แบบกรอบอัตรามาตรฐานตามประเภทและระดับหน่วยงาน
 */
export function getStandardPresetRanks(
  level: UnitTierLevel,
  type: 'bureau' | 'division' | 'station_l' | 'station_m' | 'station_s' | 'support_dept'
): UnitManpowerRanks {
  if (level === 'บช.') {
    return {
      pbg: { positions: 1, occupied: 1 },     // ผบช.
      rpbg: { positions: 6, occupied: 5 },    // รอง ผบช.
      pgk: { positions: 8, occupied: 7 },
      rpgk: { positions: 16, occupied: 14 },
      sw: { positions: 45, occupied: 40 },
      rsw: { positions: 90, occupied: 82 },
      rt_dt53: { positions: 30, occupied: 28 },
      pbm: { positions: 220, occupied: 195 },
      rpbm: { positions: 35, occupied: 28 },
    };
  }

  if (level === 'บก.') {
    if (type === 'division') {
      return {
        pbg: { positions: 1, occupied: 1 },     // ผบก.
        rpbg: { positions: 4, occupied: 4 },    // รอง ผบก.
        pgk: { positions: 3, occupied: 3 },
        rpgk: { positions: 6, occupied: 5 },
        sw: { positions: 18, occupied: 16 },
        rsw: { positions: 38, occupied: 34 },
        rt_dt53: { positions: 12, occupied: 11 },
        pbm: { positions: 95, occupied: 85 },
        rpbm: { positions: 14, occupied: 11 },
      };
    }
  }

  // ระดับ กก. / สภ. / สน. / ฝ่าย
  switch (type) {
    case 'station_l': // สภ./สน. ขนาดใหญ่
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },     // ผกก.
        rpgk: { positions: 4, occupied: 4 },    // รอง ผกก.
        sw: { positions: 8, occupied: 7 },      // สว.
        rsw: { positions: 22, occupied: 19 },   // รอง สว.
        rt_dt53: { positions: 8, occupied: 7 },
        pbm: { positions: 78, occupied: 68 },
        rpbm: { positions: 10, occupied: 8 },
      };
    case 'station_m': // สภ./สน. ขนาดกลาง / กก.ปฏิบัติการ
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 2, occupied: 2 },
        sw: { positions: 5, occupied: 4 },
        rsw: { positions: 14, occupied: 12 },
        rt_dt53: { positions: 5, occupied: 5 },
        pbm: { positions: 48, occupied: 42 },
        rpbm: { positions: 6, occupied: 5 },
      };
    case 'station_s': // สภ. ขนาดเล็ก / กก. ย่อย
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 1, occupied: 1 },
        sw: { positions: 3, occupied: 3 },
        rsw: { positions: 8, occupied: 7 },
        rt_dt53: { positions: 3, occupied: 3 },
        pbm: { positions: 26, occupied: 22 },
        rpbm: { positions: 4, occupied: 3 },
      };
    default: // ฝ่ายอำนวยการ / กองกำกับการสนับสนุน
      return {
        pbg: { positions: 0, occupied: 0 },
        rpbg: { positions: 0, occupied: 0 },
        pgk: { positions: 1, occupied: 1 },
        rpgk: { positions: 2, occupied: 2 },
        sw: { positions: 4, occupied: 4 },
        rsw: { positions: 10, occupied: 9 },
        rt_dt53: { positions: 4, occupied: 4 },
        pbm: { positions: 30, occupied: 26 },
        rpbm: { positions: 4, occupied: 3 },
      };
  }
}

/**
 * สร้างตัวอย่าง กก. / สภ. / สน. / ฝ่าย ภายใต้แต่ละ บก.
 */
function createSubDivisionsForDivision(
  divName: string,
  bureau: PoliceBureauNode,
  divId: string,
  bureauSeq: number,
  divSeq: number
): NationwideUnitRow[] {
  const cleanDiv = divName.replace(/\(.*?\)/g, '').trim();
  const subRows: NationwideUnitRow[] = [];

  // ตรวจสอบลักษณะ บก. เพื่อสร้าง กก./สภ./สน./ฝ่าย ให้สมจริงตามโครงสร้างจริง
  if (cleanDiv.includes('บก.น.') || cleanDiv.includes('นครบาล')) {
    // บก.น.1 - บก.น.9
    const numMatch = cleanDiv.match(/\d+/);
    const n = numMatch ? numMatch[0] : '1';

    // รายชื่อ สน. ตัวอย่างในแต่ละ บก.น.
    const stationsByN: { [k: string]: string[] } = {
      '1': ['สน.ชนะสงคราม', 'สน.ดุสิต', 'สน.นางเลิ้ง', 'สน.พญาไท', 'สน.ดินแดง', 'สน.ห้วยขวาง', 'สน.มักกะสัน', 'สน.สามเสน'],
      '2': ['สน.บางเขน', 'สน.คันนายาว', 'สน.ดอนเมือง', 'สน.สายไหม', 'สน.ทุ่งสองห้อง', 'สน.พหลโยธิน', 'สน.โคกคราม'],
      '3': ['สน.มีนบุรี', 'สน.นิมิตรใหม่', 'สน.หนองจอก', 'สน.ลาดกระบัง', 'สน.ร่มเกล้า', 'สน.จรเข้น้อย', 'สน.ฉลองกรุง'],
      '4': ['สน.วังทองหลาง', 'สน.หัวหมาก', 'สน.ลาดพร้าว', 'สน.โชคชัย', 'สน.บึงกุ่ม', 'สน.ประเวศ', 'สน.อุดมสุข'],
      '5': ['สน.ทองหล่อ', 'สน.ลุมพินี', 'สน.คลองตัน', 'สน.พระโขนง', 'สน.บางนา', 'สน.ท่าเรือ', 'สน.วัดพระยาไกร'],
      '6': ['สน.ปทุมวัน', 'สน.ยานนาวา', 'สน.บางรัก', 'สน.พลับพลาไชย 1', 'สน.พลับพลาไชย 2', 'สน.สำราญราษฎร์', 'สน.พระราชวัง'],
      '7': ['สน.บางกอกใหญ่', 'สน.บางกอกน้อย', 'สน.บางขุนนนท์', 'สน.บางพลัด', 'สน.บางยี่ขัน', 'สน.ท่าพระ', 'สน.ตลิ่งชัน', 'สน.ธรรมศาลา'],
      '8': ['สน.บุปผาราม', 'สน.สมเด็จเจ้าพระยา', 'สน.ปากคลองสาน', 'สน.บุคคโล', 'สน.ตลาดพลู', 'สน.บางมด', 'สน.ราษฎร์บูรณะ'],
      '9': ['สน.เพชรเกษม', 'สน.ภาษีเจริญ', 'สน.บางขุนเทียน', 'สน.บางบอน', 'สน.เทียนทะเล', 'สน.หนองแขม', 'สน.หนองค้างพลู'],
    };

    const stations = stationsByN[n] || ['สน.เมือง', 'สน.ย่อย 1', 'สน.ย่อย 2', 'สน.ย่อย 3'];

    // 1. ฝอ.
    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-sub-0`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.1`,
        unitName: `ฝ่ายอำนวยการ (${cleanDiv})`,
        shortName: `ฝอ.${cleanDiv}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'อำนวยการ',
        ranks: getStandardPresetRanks('กก.', 'support_dept'),
        depth: 2,
      })
    );

    // 2. กก.สส.
    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-sub-ss`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.2`,
        unitName: `กองกำกับการสืบสวน (${cleanDiv})`,
        shortName: `กก.สส.${cleanDiv}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'สืบสวนสอบสวน',
        ranks: getStandardPresetRanks('กก.', 'station_m'),
        depth: 2,
      })
    );

    // 3. สน. ในสังกัด
    stations.forEach((st, idx) => {
      subRows.push(
        enrichNationwideUnitRow({
          id: `${divId}-st-${idx + 1}`,
          unitLevel: 'กก.',
          parentId: divId,
          bureauId: bureau.id,
          bureauName: bureau.fullName,
          divisionId: divId,
          divisionName: cleanDiv,
          no: `${bureauSeq}.${divSeq}.${idx + 3}`,
          unitName: st,
          shortName: st,
          group: bureau.group,
          groupName: bureau.groupName,
          category: 'ป้องกันปราบปรามพื้นที่',
          ranks: getStandardPresetRanks('กก.', idx < 3 ? 'station_l' : 'station_m'),
          depth: 2,
        })
      );
    });
  } else if (cleanDiv.includes('ภ.จว.') || cleanDiv.includes('ภูธรจังหวัด')) {
    // ตำรวจภูธรจังหวัด
    const provName = cleanDiv.replace(/ตำรวจภูธรจังหวัด|ภ\.จว\./g, '').trim();

    // 1. ฝอ.
    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-sub-fo`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.1`,
        unitName: `ฝ่ายอำนวยการ ภ.จว.${provName}`,
        shortName: `ฝอ.ภ.จว.${provName}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'อำนวยการ',
        ranks: getStandardPresetRanks('กก.', 'support_dept'),
        depth: 2,
      })
    );

    // 2. กก.สส.
    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-sub-ss`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.2`,
        unitName: `กองกำกับการสืบสวน ภ.จว.${provName}`,
        shortName: `กก.สส.ภ.จว.${provName}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'สืบสวนสอบสวน',
        ranks: getStandardPresetRanks('กก.', 'station_m'),
        depth: 2,
      })
    );

    // 3. สภ.เมือง
    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-st-muang`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.3`,
        unitName: `สภ.เมือง${provName}`,
        shortName: `สภ.เมือง${provName}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'ป้องกันปราบปรามพื้นที่',
        ranks: getStandardPresetRanks('กก.', 'station_l'),
        depth: 2,
      })
    );

    // 4. สภ.อำเภอสำคัญตัวอย่าง
    const sampleDistricts = ['สภ.บ้านค่าย', 'สภ.บางปะอิน', 'สภ.แม่ริม', 'สภ.หาดใหญ่', 'สภ.วารินชำราบ', 'สภ.ศรีราชา'];
    const chosenDistrict = sampleDistricts[divSeq % sampleDistricts.length];

    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-st-sub1`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.4`,
        unitName: `${chosenDistrict} (${provName})`,
        shortName: `${chosenDistrict}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'ป้องกันปราบปรามพื้นที่',
        ranks: getStandardPresetRanks('กก.', 'station_m'),
        depth: 2,
      })
    );
  } else if (cleanDiv.includes('บก.สส.') || cleanDiv.includes('สืบสวนสอบสวน')) {
    // กองบังคับการสืบสวนสอบสวน
    for (let k = 1; k <= 4; k++) {
      subRows.push(
        enrichNationwideUnitRow({
          id: `${divId}-sub-kk${k}`,
          unitLevel: 'กก.',
          parentId: divId,
          bureauId: bureau.id,
          bureauName: bureau.fullName,
          divisionId: divId,
          divisionName: cleanDiv,
          no: `${bureauSeq}.${divSeq}.${k}`,
          unitName: `กก.สืบสวน ${k} (${cleanDiv})`,
          shortName: `กก.สืบสวน ${k}`,
          group: bureau.group,
          groupName: bureau.groupName,
          category: 'สืบสวนสอบสวน',
          ranks: getStandardPresetRanks('กก.', 'station_m'),
          depth: 2,
        })
      );
    }
  } else if (cleanDiv.includes('กองอัตรากำลัง') || cleanDiv.includes('กองทะเบียนพล') || cleanDiv.includes('กองสวัสดิการ')) {
    // กองในสังกัด สกพ.
    const deptMap: { [k: string]: string[] } = {
      กองอัตรากำลัง: ['ฝ่ายกำหนดตำแหน่ง (กต.)', 'ฝ่ายบริหารอัตรากำลัง (บอ.)', 'ฝ่ายวิจัยและประเมินผล (วป.)'],
      กองทะเบียนพล: ['ฝ่ายแต่งตั้ง 1 (ตต.1)', 'ฝ่ายแต่งตั้ง 2 (ตต.2)', 'ฝ่ายประวัติและบำเหน็จ (ปบ.)', 'ฝ่ายข้อมูลบุคคล (ขบ.)'],
      กองสวัสดิการ: ['ฝ่ายการเงินและบัญชีสวัสดิการ', 'ฝ่ายฌาปนกิจสงเคราะห์', 'ฝ่ายสงเคราะห์และสิทธิประโยชน์'],
    };

    const key = Object.keys(deptMap).find((k) => cleanDiv.includes(k));
    const depts = (key && deptMap[key]) || ['ฝ่ายอำนวยการ', 'ฝ่ายงานหลัก 1', 'ฝ่ายงานหลัก 2'];

    depts.forEach((dp, idx) => {
      subRows.push(
        enrichNationwideUnitRow({
          id: `${divId}-dept-${idx + 1}`,
          unitLevel: 'กก.',
          parentId: divId,
          bureauId: bureau.id,
          bureauName: bureau.fullName,
          divisionId: divId,
          divisionName: cleanDiv,
          no: `${bureauSeq}.${divSeq}.${idx + 1}`,
          unitName: `${dp} (${cleanDiv})`,
          shortName: dp,
          group: bureau.group,
          groupName: bureau.groupName,
          category: 'อำนวยการ',
          ranks: getStandardPresetRanks('กก.', 'support_dept'),
          depth: 2,
        })
      );
    });
  } else {
    // กองบังคับการ / กอง ทั่วไป (สร้าง กก.1 - กก.3 และ ฝอ.)
    subRows.push(
      enrichNationwideUnitRow({
        id: `${divId}-sub-fo`,
        unitLevel: 'กก.',
        parentId: divId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}.1`,
        unitName: `ฝ่ายอำนวยการ (${cleanDiv})`,
        shortName: `ฝอ.${cleanDiv}`,
        group: bureau.group,
        groupName: bureau.groupName,
        category: 'อำนวยการ',
        ranks: getStandardPresetRanks('กก.', 'support_dept'),
        depth: 2,
      })
    );

    for (let k = 1; k <= 3; k++) {
      subRows.push(
        enrichNationwideUnitRow({
          id: `${divId}-sub-k${k}`,
          unitLevel: 'กก.',
          parentId: divId,
          bureauId: bureau.id,
          bureauName: bureau.fullName,
          divisionId: divId,
          divisionName: cleanDiv,
          no: `${bureauSeq}.${divSeq}.${k + 1}`,
          unitName: `กองกำกับการ ${k} (${cleanDiv})`,
          shortName: `กก.${k} ${cleanDiv}`,
          group: bureau.group,
          groupName: bureau.groupName,
          category: 'ปฏิบัติการ',
          ranks: getStandardPresetRanks('กก.', 'station_m'),
          depth: 2,
        })
      );
    }
  }

  return subRows;
}

/**
 * สร้างข้อมูลเริ่มต้นสถานภาพกำลังพลตำรวจทั้งประเทศ (บช. ➔ บก. ➔ กก.)
 * เชื่อมโยงครอบคลุมทุกหน่วยงานในสำนักงานตำรวจแห่งชาติ 100%
 */
export function buildInitialNationwidePoliceRows(): NationwideUnitRow[] {
  const allRows: NationwideUnitRow[] = [];
  let bureauSequence = 1;

  RTP_BUREAUS_DATA.forEach((bureau) => {
    const bureauRowId = `bureau-${bureau.id}`;
    const bureauSeq = bureauSequence++;

    // 1. ระดับ บช. (กองบัญชาการ / สำนักงาน)
    const bureauRow: NationwideUnitRow = enrichNationwideUnitRow({
      id: bureauRowId,
      unitLevel: 'บช.',
      bureauId: bureau.id,
      bureauName: bureau.fullName,
      no: bureauSeq,
      unitName: `${bureau.fullName} (${bureau.code})`,
      shortName: bureau.code,
      group: bureau.group,
      groupName: bureau.groupName,
      category: bureau.groupName,
      ranks: getStandardPresetRanks('บช.', 'bureau'),
      depth: 0,
      childrenIds: [],
    });

    const divisionRows: NationwideUnitRow[] = [];
    let divSequence = 1;

    // 2. ระดับ บก. (กองบังคับการ / กอง ในสังกัด บช.)
    bureau.subDivisions.forEach((subDivName) => {
      const cleanDiv = subDivName.replace(/\(.*?\)/g, '').trim();
      const divRowId = `div-${bureau.id}-${cleanDiv.replace(/\s+/g, '_')}`;
      const divSeq = divSequence++;

      const divRow: NationwideUnitRow = enrichNationwideUnitRow({
        id: divRowId,
        unitLevel: 'บก.',
        parentId: bureauRowId,
        bureauId: bureau.id,
        bureauName: bureau.fullName,
        divisionId: divRowId,
        divisionName: cleanDiv,
        no: `${bureauSeq}.${divSeq}`,
        unitName: subDivName,
        shortName: cleanDiv,
        group: bureau.group,
        groupName: bureau.groupName,
        category: subDivName.includes('อำนวยการ')
          ? 'อำนวยการ'
          : subDivName.includes('สืบสวน')
          ? 'สืบสวนสอบสวน'
          : 'ปฏิบัติการพื้นที่',
        ranks: getStandardPresetRanks('บก.', 'division'),
        depth: 1,
        childrenIds: [],
      });

      // 3. ระดับ กก. / สภ. / สน. / ฝ่าย ภายใต้ บก.
      const subDivs = createSubDivisionsForDivision(
        subDivName,
        bureau,
        divRowId,
        bureauSeq,
        divSeq
      );

      divRow.childrenIds = subDivs.map((s) => s.id);
      divisionRows.push(divRow, ...subDivs);
    });

    bureauRow.childrenIds = divisionRows
      .filter((d) => d.unitLevel === 'บก.')
      .map((d) => d.id);

    allRows.push(bureauRow, ...divisionRows);
  });

  return allRows;
}

/**
 * คำนวณสรุปภาพรวมทั้งประเทศ
 */
export function getInitialNationwidePoliceData(): NationwideUnitRow[] {
  return buildInitialNationwidePoliceRows();
}
