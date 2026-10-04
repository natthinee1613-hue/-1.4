/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PoliceOfficer } from '../types/personnel';
import { MatrixCellData } from '../types/bureauReport';
import {
  X,
  Search,
  Filter,
  Users,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Plus,
  Shield,
  Building,
} from 'lucide-react';

interface BureauMatrixCellModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  cellData: MatrixCellData | null;
  onViewOfficer: (officer: PoliceOfficer) => void;
  onEditOfficer: (officer: PoliceOfficer) => void;
  onAddOfficerPreset?: (preset: Partial<PoliceOfficer>) => void;
}

export const BureauMatrixCellModal: React.FC<BureauMatrixCellModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  cellData,
  onViewOfficer,
  onEditOfficer,
  onAddOfficerPreset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant'>('all');

  const filteredOfficers = useMemo(() => {
    if (!cellData) return [];
    return cellData.officers.filter((o) => {
      if (filterStatus === 'occupied' && o.isVacant) return false;
      if (filterStatus === 'vacant' && !o.isVacant) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const fullName = `${o.rank || ''} ${o.firstName || ''} ${o.lastName || ''}`.toLowerCase();
      const posNum = (o.positionNumber || '').toLowerCase();
      const div = (o.division || '').toLowerCase();
      const sub = (o.subDivision || '').toLowerCase();
      const posTitle = (o.positionTitle || '').toLowerCase();

      return (
        fullName.includes(term) ||
        posNum.includes(term) ||
        div.includes(term) ||
        sub.includes(term) ||
        posTitle.includes(term)
      );
    });
  }, [cellData, searchTerm, filterStatus]);

  if (!isOpen || !cellData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Chakra_Petch',sans-serif] text-slate-100">
                {title}
              </h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Pill Row */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">กรอบอัตรา:</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {cellData.authorized}
              </span>
              <span className="text-slate-500">ตำแหน่ง</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400">คนครอง:</span>
              <span className="font-bold text-emerald-300 font-mono text-sm">
                {cellData.occupied}
              </span>
              <span className="text-slate-500">นาย</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-400">ว่าง:</span>
              <span className="font-bold text-red-300 font-mono text-sm">
                {cellData.vacant}
              </span>
              <span className="text-slate-500">อัตรา</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-400">% การครอง:</span>
              <span className="font-bold text-blue-300 font-mono text-sm">
                {cellData.fillRate}%
              </span>
            </div>
          </div>

          {onAddOfficerPreset && (
            <button
              onClick={() => {
                onClose();
                onAddOfficerPreset({
                  // Will be populated by parent
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มตำแหน่งในกลุ่มนี้</span>
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, ยศ, เลขตำแหน่ง, สังกัด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ทั้งหมด ({cellData.authorized})
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                filterStatus === 'occupied'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              มีคนครอง ({cellData.occupied})
            </button>
            <button
              onClick={() => setFilterStatus('vacant')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                filterStatus === 'vacant'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ตำแหน่งว่าง ({cellData.vacant})
            </button>
          </div>
        </div>

        {/* Officers List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredOfficers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/80 text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">เลขตำแหน่ง</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3">ยศ - ชื่อ - สกุล</th>
                    <th className="py-2.5 px-3">ตำแหน่ง / ทำหน้าที่</th>
                    <th className="py-2.5 px-3">สังกัด บก. / กก.</th>
                    <th className="py-2.5 px-3">ประเภท</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOfficers.map((o) => (
                    <tr
                      key={o.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        o.isVacant ? 'bg-red-950/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {o.positionNumber}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {o.isVacant ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            ตำแหน่งว่าง
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            คนครอง
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                        {o.isVacant ? (
                          <span className="text-slate-500 italic">- (ว่าง) -</span>
                        ) : (
                          <span>
                            <strong className="text-amber-300 font-semibold mr-1">{o.rank}</strong>
                            {o.firstName} {o.lastName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <div className="font-semibold text-slate-100">{o.positionTitle || o.positionLevel}</div>
                        {o.duty && <div className="text-[10px] text-slate-400">{o.duty}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <div className="text-slate-200">{o.division}</div>
                        <div className="text-[10px] text-slate-400">{o.subDivision}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            o.commissionType === 'สัญญาบัตร'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {o.commissionType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              onClose();
                              onViewOfficer(o);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="ดูรายละเอียดข้าราชการตำรวจ"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              onEditOfficer(o);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขข้อมูล / บรรจุคนครอง"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            แสดง {filteredOfficers.length} จากทั้งหมด {cellData.authorized} รายการ
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
