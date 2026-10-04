import React from 'react';
import { PoliceOfficer } from '../types/personnel';
import { AppTheme } from '../data/themes';

interface PersonnelSummaryProps {
  officers: PoliceOfficer[];
  currentTheme?: AppTheme;
}

export const PersonnelSummary: React.FC<PersonnelSummaryProps> = ({
  officers,
  currentTheme,
}) => {
  const total = officers.length;
  const occupied = officers.filter((o) => !o.isVacant).length;
  const vacant = officers.filter((o) => o.isVacant).length;
  const commissioned = officers.filter((o) => o.commissionType === 'สัญญาบัตร').length;
  const nonCommissioned = officers.filter((o) => o.commissionType === 'ประทวน').length;
  const male = officers.filter((o) => !o.isVacant && o.gender === 'ชาย').length;
  const female = officers.filter((o) => !o.isVacant && o.gender === 'หญิง').length;

  const occupancyRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : '0';
  const isDark = currentTheme?.isDark;

  const cardBase = `p-3 rounded-2xl border shadow-2xs ${
    isDark
      ? 'bg-slate-900 border-slate-800 text-slate-100'
      : 'bg-white border-slate-200 text-slate-800'
  }`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">กรอบรวม</div>
        <div className="text-xl font-bold font-mono tabular-nums">{total}</div>
      </div>
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">มีผู้ครอง</div>
        <div className="text-xl font-bold font-mono tabular-nums">{occupied}</div>
        <div className="text-[9px] text-emerald-500">{occupancyRate}%</div>
      </div>
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">ตำแหน่งว่าง</div>
        <div className="text-xl font-bold font-mono tabular-nums">{vacant}</div>
      </div>
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">สัญญาบัตร</div>
        <div className="text-xl font-bold font-mono tabular-nums">{commissioned}</div>
      </div>
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">ประทวน</div>
        <div className="text-xl font-bold font-mono tabular-nums">{nonCommissioned}</div>
      </div>
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400">เพศ</div>
        <div className="text-lg font-bold font-mono tabular-nums flex gap-1">
            <span className="text-sky-600">{male}</span>:<span className="text-pink-600">{female}</span>
        </div>
      </div>
      <div className={cardBase}>
        <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400">อัปเดตล่าสุด</div>
        <div className="text-sm font-bold font-mono tabular-nums">
            {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
