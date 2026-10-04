/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PoliceOfficer } from '../types/personnel';

// Realistic generator for Bureau (บช.) status reporting data
export function generateRealisticBureauData(): PoliceOfficer[] {
  const officers: PoliceOfficer[] = [];

  const bureaus = [
    {
      code: 'บช.น.',
      name: 'กองบัญชาการตำรวจนครบาล',
      divisions: ['บก.น.1', 'บก.น.2', 'บก.น.5', 'บก.สส.บช.น.', 'บก.จร.', 'บก.อคฝ.'],
      commander: { rank: 'พล.ต.ท.', first: 'ธิติ', last: 'แสงสว่าง' },
    },
    {
      code: 'สกพ.',
      name: 'สำนักงานกำลังพล',
      divisions: ['สกพ.', 'กองอัตรากำลัง สกพ.', 'กองทะเบียนพล สกพ.', 'กองสวัสดิการ สกพ.'],
      commander: { rank: 'พล.ต.ท.', first: 'ยิ่งยศ', last: 'เทพจำนงค์' },
    },
    {
      code: 'ภ.1',
      name: 'ตำรวจภูธรภาค 1',
      divisions: ['ภ.จว.นนทบุรี', 'ภ.จว.ปทุมธานี', 'ภ.จว.พระนครศรีอยุธยา', 'บก.สส.ภ.1', 'ฝอ.ภ.1'],
      commander: { rank: 'พล.ต.ท.', first: 'วัฒนา', last: 'ยี่จีน' },
    },
    {
      code: 'บช.ก.',
      name: 'กองบัญชาการตำรวจสอบสวนกลาง',
      divisions: ['บก.ป.', 'บก.ปอท.', 'บก.ปอศ.', 'บก.ทล.', 'บก.รน.', 'ฝอ.บช.ก.'],
      commander: { rank: 'พล.ต.ท.', first: 'จิรภพ', last: 'ภูริเดช' },
    },
  ];

  // Standard RTP Job Lines
  const jobLinesByBureau: Record<string, Array<{ line: string; group: string; duty: string }>> = {
    'บช.น.': [
      { line: 'บริหารงานอำนวยการและสนับสนุน', group: 'อำนวยการและสนับสนุน', duty: 'งานธุรการและนโยบาย' },
      { line: 'ป้องกันปราบปราม', group: 'ป้องกันปราบปราม', duty: 'สายตรวจและระงับเหตุ' },
      { line: 'สืบสวน', group: 'สืบสวนคดีอาญา', duty: 'สืบสวนคดีอาชญากรรม' },
      { line: 'สอบสวน', group: 'สอบสวน', duty: 'พนักงานสอบสวน' },
      { line: 'จราจร', group: 'จราจร', duty: 'อำนวยการจราจรและตรวจความปลอดภัย' },
      { line: 'ความมั่นคงและกิจการพิเศษ', group: 'ความมั่นคง', duty: 'ควบคุมฝูงชนและอารักขา' },
      { line: 'เทคโนโลยีสารสนเทศและการสื่อสาร', group: 'เทคโนโลยี', duty: 'เทคโนโลยีเครือข่าย' },
    ],
    'สกพ.': [
      { line: 'บริหารงานอำนวยการและสนับสนุน', group: 'อำนวยการและสนับสนุน', duty: 'บริหารงานอำนวยการ' },
      { line: 'ทรัพยากรบุคคลและอัตรากำลัง', group: 'อำนวยการและสนับสนุน', duty: 'วางแผนกรอบอัตรากำลัง' },
      { line: 'ทะเบียนพลและประวัติ', group: 'อำนวยการและสนับสนุน', duty: 'จัดทำทะเบียนประวัติ' },
      { line: 'สวัสดิการและคุณภาพชีวิต', group: 'อำนวยการและสนับสนุน', duty: 'งานสิทธิประโยชน์ข้าราชการ' },
      { line: 'พัฒนาระบบบริหารงานบุคคล', group: 'อำนวยการและสนับสนุน', duty: 'ประเมินผลสัมฤทธิ์' },
    ],
    'ภ.1': [
      { line: 'บริหารงานอำนวยการและสนับสนุน', group: 'อำนวยการและสนับสนุน', duty: 'งานอำนวยการ' },
      { line: 'ป้องกันปราบปราม', group: 'ป้องกันปราบปราม', duty: 'สายตรวจตำบล/สภ.' },
      { line: 'สืบสวน', group: 'สืบสวนคดีอาญา', duty: 'สืบสวนปราบปรามยาเสพติด' },
      { line: 'สอบสวน', group: 'สอบสวน', duty: 'รับแจ้งความและรวบรวมพยานหลักฐาน' },
      { line: 'จราจร', group: 'จราจร', duty: 'จัดการจราจรสายหลัก' },
      { line: 'ความมั่นคงและกิจการพิเศษ', group: 'ความมั่นคง', duty: 'รักษาความสงบเรียบร้อย' },
    ],
    'บช.ก.': [
      { line: 'บริหารงานอำนวยการและสนับสนุน', group: 'อำนวยการและสนับสนุน', duty: 'งานอำนวยการส่วนกลาง' },
      { line: 'ป้องกันปราบปราม', group: 'ป้องกันปราบปราม', duty: 'ปฏิบัติการพิเศษหนุมาน' },
      { line: 'สืบสวน', group: 'สืบสวนคดีอาญา', duty: 'สืบสวนคดีสำคัญระดับประเทศ' },
      { line: 'สอบสวน', group: 'สอบสวน', duty: 'สอบสวนคดีอาญาเศรษฐกิจและคอมพิวเตอร์' },
      { line: 'จราจรและทางหลวง', group: 'จราจร', duty: 'ตรวจตราทางหลวงแผ่นดิน' },
      { line: 'ปราบปรามอาชญากรรมทางเทคโนโลยี', group: 'เทคโนโลยี', duty: 'สืบสวนสอบสวนไซเบอร์' },
    ],
  };

  const thaiFirstNamesMale = [
    'สมชาย', 'วิชาญ', 'เกียรติศักดิ์', 'สุรชัย', 'อนุชา', 'พงษ์ศักดิ์', 'นพดล', 'ธีรยุทธ',
    'ปกรณ์', 'เอกชัย', 'ชัยวัฒน์', 'วรวิทย์', 'กิตติศักดิ์', 'ศราวุธ', 'จตุรงค์', 'ภาณุเดช',
    'อดิศร', 'ศักดิ์ชัย', 'สิทธิพร', 'ชลธิศ', 'ธนากร', 'รณชัย', 'อรรถพล', 'วีระศักดิ์'
  ];

  const thaiFirstNamesFemale = [
    'กาญจนา', 'สุดารัตน์', 'วราภรณ์', 'กัญญารัตน์', 'ศิริพร', 'พรทิพย์', 'จิราภรณ์', 'นฤมล',
    'ปิยะดา', 'พัชรินทร์', 'รัชนีวรรณ', 'ชลิตา', 'สุภาพร', 'อารียา', 'นภัสสร', 'วรรณภา'
  ];

  const thaiLastNames = [
    'มีสุข', 'สุขประเสริฐ', 'ศรีสวัสดิ์', 'วงษ์สุวรรณ', 'ทองดี', 'เจริญสุข', 'แก้วประสิทธิ์',
    'รัตนโกสินทร์', 'วิเศษสมบัติ', 'ตั้งเจริญ', 'พงษ์ไพศาล', 'บริสุทธิ์', 'อินทร์จันทร์',
    'วัฒนศิริ', 'ชัยประสงค์', 'มังกรแก้ว', 'บุญญารัตน์', 'ชินวัตร', 'มงคลทรัพย์', 'จิตรเจริญ'
  ];

  const ranksByLevel: Record<string, string[]> = {
    'ผบช.': ['พล.ต.ท.'],
    'รอง ผบช.': ['พล.ต.ต.'],
    'ผบก.': ['พล.ต.ต.'],
    'รอง ผบก.': ['พ.ต.อ.'],
    'ผกก.': ['พ.ต.อ.'],
    'รอง ผกก.': ['พ.ต.ท.'],
    'สว.': ['พ.ต.ท.', 'พ.ต.ต.'],
    'รอง สว.': ['ร.ต.อ.', 'ร.ต.ท.', 'ร.ต.ต.'],
    'ผบ.หมู่': ['ด.ต.', 'จ.ส.ต.', 'ส.ต.อ.', 'ส.ต.ท.', 'ส.ต.ต.'],
  };

  let posCounter = 1000;

  bureaus.forEach((bureau, bIndex) => {
    const jobLines = jobLinesByBureau[bureau.code] || jobLinesByBureau['บช.น.'];

    // 1. Add ผบช. (Commander of Bureau)
    posCounter++;
    officers.push({
      id: `off-${posCounter}`,
      positionNumber: `0${bIndex + 1}00 01101 ${String(posCounter).slice(-4)}`,
      bureau: bureau.code,
      division: bureau.code,
      subDivision: bureau.code,
      jobGroup: 'อำนวยการและสนับสนุน',
      jobLine: 'บริหารงานอำนวยการและสนับสนุน',
      duty: `ผู้บัญชาการ ${bureau.name}`,
      positionLevel: 'ผบช.',
      positionTitle: `ผบช.${bureau.code}`,
      commissionType: 'สัญญาบัตร',
      rank: bureau.commander.rank,
      firstName: bureau.commander.first,
      lastName: bureau.commander.last,
      gender: 'ชาย',
      isVacant: false,
    });

    // 2. Add รอง ผบช. (3-4 positions per Bureau)
    const deputyCount = bureau.code === 'บช.น.' ? 5 : 3;
    for (let d = 1; d <= deputyCount; d++) {
      posCounter++;
      const isVacant = d === deputyCount && bureau.code === 'บช.น.'; // 1 vacant deputy in บช.น.
      const isFemale = d === 2;
      officers.push({
        id: `off-${posCounter}`,
        positionNumber: `0${bIndex + 1}00 01201 000${d}`,
        bureau: bureau.code,
        division: bureau.code,
        subDivision: bureau.code,
        jobGroup: 'อำนวยการและสนับสนุน',
        jobLine: 'บริหารงานอำนวยการและสนับสนุน',
        duty: `รองผู้บัญชาการ ${bureau.name}`,
        positionLevel: 'รอง ผบช.',
        positionTitle: `รอง ผบช.${bureau.code}`,
        commissionType: 'สัญญาบัตร',
        rank: 'พล.ต.ต.',
        firstName: isVacant ? '' : (isFemale ? thaiFirstNamesFemale[d] : thaiFirstNamesMale[d]),
        lastName: isVacant ? '' : thaiLastNames[d + 2],
        gender: isVacant ? '-' : (isFemale ? 'หญิง' : 'ชาย'),
        isVacant,
      });
    }

    // 3. For each Job Line, generate positions across levels: ผบก. -> รอง ผบก. -> ผกก. -> รอง ผกก. -> สว. -> รอง สว. -> ผบ.หมู่
    jobLines.forEach((jl, jlIndex) => {
      // Config of positions per level for this job line
      const levelConfigs: Array<{
        level: string;
        quota: number;
        vacantChance: number;
        commissionType: 'สัญญาบัตร' | 'ประทวน';
      }> = [
        { level: 'ผบก.', quota: jlIndex < 3 ? 1 : 0, vacantChance: 0.1, commissionType: 'สัญญาบัตร' },
        { level: 'รอง ผบก.', quota: jlIndex < 4 ? (jlIndex % 2 === 0 ? 2 : 1) : 1, vacantChance: 0.15, commissionType: 'สัญญาบัตร' },
        { level: 'ผกก.', quota: 2 + (jlIndex % 3), vacantChance: 0.2, commissionType: 'สัญญาบัตร' },
        { level: 'รอง ผกก.', quota: 3 + (jlIndex % 2), vacantChance: 0.25, commissionType: 'สัญญาบัตร' },
        { level: 'สว.', quota: 5 + (jlIndex % 4), vacantChance: 0.2, commissionType: 'สัญญาบัตร' },
        { level: 'รอง สว.', quota: 8 + (jlIndex % 5), vacantChance: 0.15, commissionType: 'สัญญาบัตร' },
        { level: 'ผบ.หมู่', quota: 14 + (jlIndex % 7), vacantChance: 0.18, commissionType: 'ประทวน' },
      ];

      levelConfigs.forEach(({ level, quota, vacantChance, commissionType }) => {
        for (let q = 1; q <= quota; q++) {
          posCounter++;
          const isVacant = (posCounter % 10) < vacantChance * 10;
          const isFemale = (posCounter % 5 === 0);
          const division = bureau.divisions[posCounter % bureau.divisions.length];
          const subDiv = level === 'ผบ.หมู่' || level === 'รอง สว.' ? `กลุ่มงานปฏิบัติการ ${q}` : `ฝ่ายอำนวยการ / กก.${q}`;

          const possibleRanks = ranksByLevel[level] || ['พ.ต.ท.'];
          const rank = possibleRanks[posCounter % possibleRanks.length];

          const firstName = isVacant
            ? ''
            : (isFemale
                ? thaiFirstNamesFemale[posCounter % thaiFirstNamesFemale.length]
                : thaiFirstNamesMale[posCounter % thaiFirstNamesMale.length]);
          const lastName = isVacant
            ? ''
            : thaiLastNames[(posCounter + jlIndex) % thaiLastNames.length];

          officers.push({
            id: `off-${posCounter}`,
            positionNumber: `0${bIndex + 1}${String(jlIndex + 1).padStart(2, '0')} ${String(posCounter).padStart(5, '0')}`,
            bureau: bureau.code,
            division,
            subDivision: subDiv,
            jobGroup: jl.group,
            jobLine: jl.line,
            duty: jl.duty,
            positionLevel: level,
            positionTitle: level === 'ผบ.หมู่' ? `ผบ.หมู่ (${jl.line})` : `${level} (${jl.line})`,
            commissionType,
            rank: isVacant ? '' : rank,
            firstName,
            lastName,
            gender: isVacant ? '-' : (isFemale ? 'หญิง' : 'ชาย'),
            isVacant,
          });
        }
      });
    });
  });

  return officers;
}
