/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { BureauStatusReportData } from '../types/bureauReport';
import { PoliceEmblem } from './PoliceEmblem';
import { Printer, X, Download } from 'lucide-react';

interface OfficialBureauPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BureauStatusReportData;
  bureauName: string;
}

export const OfficialBureauPrintModal: React.FC<OfficialBureauPrintModalProps> = ({
  isOpen,
  onClose,
  report,
  bureauName,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayThai = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Modal Toolbar (Non-printed) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-800 rounded-lg">
              <Printer className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-['Chakra_Petch',sans-serif]">
                พิมพ์รายงานสถานภาพกำลังพลทางการ (ระดับ บช.)
              </h3>
              <p className="text-xs text-slate-500">
                รูปแบบเอกสารราชการทางการ พร้อมพิมพ์ออกทางเครื่องพิมพ์หรือบันทึกเป็น PDF (แนวนอน A4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              สั่งพิมพ์รายงาน (Print / Save as PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          ref={printAreaRef}
          className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white font-['Sarabun',sans-serif] text-slate-900 printable-document"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <PoliceEmblem size={64} />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 font-['Chakra_Petch',sans-serif]">
                  สำนักงานตำรวจแห่งชาติ
                </h1>
                <h2 className="text-base font-semibold text-slate-800">
                  รายงานสถานภาพอัตรากำลังพล แยกสายงานและระดับตำแหน่ง
                </h2>
                <p className="text-xs text-slate-600">
                  หน่วยงาน: <span className="font-bold text-slate-900">{bureauName}</span>
                  {report.selectedDivision !== 'all' && ` · ${report.selectedDivision}`}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="font-semibold text-slate-800">เอกสารราชการเพื่อการบริหาร</div>
              <div>ข้อมูล ณ วันที่ {todayThai}</div>
              <div className="mt-1 inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500">
                สถานะ: ยืนยันข้อมูลล่าสุด
              </div>
            </div>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-4 gap-3 mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs">
            <div>
              <span className="text-slate-500 block">กรอบอัตรากำลังอนุมัติ</span>
              <span className="font-bold text-base text-slate-900">
                {report.grandTotal.authorized.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">อัตรา</span>
            </div>
            <div>
              <span className="text-slate-500 block">กำลังพลมีตัวอยู่จริง (คนครอง)</span>
              <span className="font-bold text-base text-emerald-700">
                {report.grandTotal.occupied.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">นาย</span>
            </div>
            <div>
              <span className="text-slate-500 block">ตำแหน่งว่าง</span>
              <span className="font-bold text-base text-red-600">
                {report.grandTotal.vacant.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">อัตรา</span>
            </div>
            <div>
              <span className="text-slate-500 block">ร้อยละการครองตำแหน่ง</span>
              <span className="font-bold text-base text-blue-700">
                {report.grandTotal.fillRate}%
              </span>
            </div>
          </div>

          {/* Official Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-800 text-[11px]">
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-bold border-b border-slate-800">
                  <th rowSpan={2} className="border border-slate-800 px-2 py-1.5 text-center w-8">ที่</th>
                  <th rowSpan={2} className="border border-slate-800 px-3 py-1.5 text-left min-w-[150px]">สายงาน</th>
                  {report.levels.map((lvl) => (
                    <th key={lvl} colSpan={3} className="border border-slate-800 px-1 py-1 text-center whitespace-nowrap">
                      {lvl}
                    </th>
                  ))}
                  <th colSpan={4} className="border border-slate-800 px-2 py-1 text-center bg-slate-300">
                    รวมทั้งสิ้น
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-800 text-[10px]">
                  {report.levels.map((lvl) => (
                    <React.Fragment key={`${lvl}-sub`}>
                      <th className="border border-slate-800 px-1 py-0.5 text-center">กรอบ</th>
                      <th className="border border-slate-800 px-1 py-0.5 text-center">ครอง</th>
                      <th className="border border-slate-800 px-1 py-0.5 text-center">ว่าง</th>
                    </React.Fragment>
                  ))}
                  <th className="border border-slate-800 px-1 py-0.5 text-center bg-slate-200">กรอบ</th>
                  <th className="border border-slate-800 px-1 py-0.5 text-center bg-slate-200">ครอง</th>
                  <th className="border border-slate-800 px-1 py-0.5 text-center bg-slate-200 text-red-600">ว่าง</th>
                  <th className="border border-slate-800 px-1 py-0.5 text-center bg-slate-200">%ครอง</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, idx) => (
                  <tr key={row.jobLine} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="border border-slate-800 px-1.5 py-1 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-800 px-2.5 py-1 font-semibold text-slate-900">
                      {row.jobLine}
                    </td>
                    {report.levels.map((lvl) => {
                      const c = row.cells[lvl];
                      const hasAuth = c && c.authorized > 0;
                      return (
                        <React.Fragment key={`${row.jobLine}-${lvl}`}>
                          <td className="border border-slate-800 px-1 py-1 text-center font-mono">
                            {hasAuth ? c.authorized : '-'}
                          </td>
                          <td className="border border-slate-800 px-1 py-1 text-center font-mono text-emerald-800 font-medium">
                            {hasAuth ? c.occupied : '-'}
                          </td>
                          <td className={`border border-slate-800 px-1 py-1 text-center font-mono ${
                            hasAuth && c.vacant > 0 ? 'text-red-600 font-bold bg-red-50/40' : 'text-slate-400'
                          }`}>
                            {hasAuth ? (c.vacant > 0 ? c.vacant : '0') : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border border-slate-800 px-1.5 py-1 text-center font-mono font-bold bg-slate-100">
                      {row.rowTotal.authorized}
                    </td>
                    <td className="border border-slate-800 px-1.5 py-1 text-center font-mono font-bold text-emerald-800 bg-slate-100">
                      {row.rowTotal.occupied}
                    </td>
                    <td className="border border-slate-800 px-1.5 py-1 text-center font-mono font-bold text-red-600 bg-slate-100">
                      {row.rowTotal.vacant}
                    </td>
                    <td className="border border-slate-800 px-1.5 py-1 text-center font-mono font-bold text-blue-800 bg-slate-100">
                      {row.rowTotal.fillRate}%
                    </td>
                  </tr>
                ))}

                {/* Grand Total Row */}
                <tr className="bg-slate-300 font-bold border-t-2 border-slate-900 text-slate-950">
                  <td colSpan={2} className="border border-slate-800 px-3 py-2 text-center">
                    รวมทุกสายงานทั้งสิ้น
                  </td>
                  {report.levels.map((lvl) => {
                    const c = report.colTotals[lvl];
                    return (
                      <React.Fragment key={`tot-${lvl}`}>
                        <td className="border border-slate-800 px-1 py-2 text-center font-mono">
                          {c ? c.authorized : 0}
                        </td>
                        <td className="border border-slate-800 px-1 py-2 text-center font-mono text-emerald-900">
                          {c ? c.occupied : 0}
                        </td>
                        <td className="border border-slate-800 px-1 py-2 text-center font-mono text-red-700">
                          {c ? c.vacant : 0}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="border border-slate-800 px-1.5 py-2 text-center font-mono bg-slate-400/50">
                    {report.grandTotal.authorized}
                  </td>
                  <td className="border border-slate-800 px-1.5 py-2 text-center font-mono text-emerald-900 bg-slate-400/50">
                    {report.grandTotal.occupied}
                  </td>
                  <td className="border border-slate-800 px-1.5 py-2 text-center font-mono text-red-700 bg-slate-400/50">
                    {report.grandTotal.vacant}
                  </td>
                  <td className="border border-slate-800 px-1.5 py-2 text-center font-mono text-blue-950 bg-slate-400/50">
                    {report.grandTotal.fillRate}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Signatures & Remarks */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs text-slate-700">
            <div>
              <p className="font-semibold text-slate-900 mb-1">หมายเหตุ:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                <li>ข้อมูลดังกล่าวสรุปจากฐานข้อมูลทำเนียบกำลังพลระบบบริหารงานบุคคล สำนักงานตำรวจแห่งชาติ</li>
                <li>ตำแหน่งว่างหมายถึงตำแหน่งที่มีกรอบอัตรากำลังอนุมัติแต่ยังไม่มีผู้ดำรงตำแหน่งหรืออยู่ระหว่างการแต่งตั้ง</li>
                <li>เอกสารนี้ใช้สำหรับราชการเท่านั้น</li>
              </ul>
            </div>

            <div className="text-center w-64">
              <div className="h-14"></div>
              <div className="border-b border-dotted border-slate-600 mb-1.5"></div>
              <p className="font-bold text-slate-900">( .............................................................. )</p>
              <p className="text-slate-600 text-[11px] mt-0.5">ผู้จัดทำรายงาน / เจ้าหน้าที่กำลังพล</p>
              <p className="text-slate-500 text-[10px]">วันที่ .......... / .......... / ..............</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
