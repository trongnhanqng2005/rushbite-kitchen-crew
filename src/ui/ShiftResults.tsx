/**
 * Shift Results Screen displaying financial performance, accuracy, and progression.
 */

import React from 'react';
import { ShiftResultsData } from '../systems/ShiftSystem.ts';

interface ShiftResultsProps {
  results: ShiftResultsData | null;
  totalBankCash: number;
  onNextShift: () => void;
  onQuitToMenu: () => void;
}

export const ShiftResults: React.FC<ShiftResultsProps> = ({
  results,
  totalBankCash,
  onNextShift,
  onQuitToMenu,
}) => {
  if (!results) return null;

  const gradeColors: Record<string, string> = {
    S: 'text-amber-300 border-amber-400 bg-amber-950/40',
    A: 'text-emerald-300 border-emerald-400 bg-emerald-950/40',
    B: 'text-blue-300 border-blue-400 bg-blue-950/40',
    C: 'text-orange-300 border-orange-400 bg-orange-950/40',
    F: 'text-red-400 border-red-500 bg-red-950/40',
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none font-sans">
      <div className="max-w-lg w-full bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Top Gold Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        <div className="flex items-center justify-between w-full mb-6">
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block">
              Shift #{results.shiftNumber} Concluded
            </span>
            <h2 className="text-3xl font-black text-white uppercase">
              Shift Evaluation
            </h2>
          </div>

          {/* Large Stamp Grade */}
          <div
            className={`w-16 h-16 rounded-2xl border-4 flex items-center justify-center text-4xl font-black shadow-xl rotate-6 ${
              gradeColors[results.ratingGrade] || gradeColors.B
            }`}
          >
            {results.ratingGrade}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
          {/* Revenue */}
          <div className="bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-700/80">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Shift Revenue
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ${results.totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Includes ${results.totalTips.toFixed(2)} tips
            </span>
          </div>

          {/* Total Bank Balance */}
          <div className="bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-700/80">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Total Bank Balance
            </span>
            <span className="text-2xl font-black text-white font-mono">
              ${totalBankCash.toFixed(2)}
            </span>
            <span className="text-[11px] text-emerald-400 block mt-0.5">
              Available for upgrades
            </span>
          </div>

          {/* Orders Served */}
          <div className="bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-700/80">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Orders Completed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {results.ordersCompleted}
              </span>
              <span className="text-xs text-red-400 font-semibold">
                ({results.ordersFailed} failed)
              </span>
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-700/80">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Avg Satisfaction
            </span>
            <span className="text-2xl font-black text-amber-300 font-mono">
              {Math.round(results.averageSatisfaction * 100)}%
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Best prep: {results.bestOrderTime}s
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onQuitToMenu}
            className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm border border-neutral-700 cursor-pointer transition-all"
          >
            Main Menu
          </button>

          <button
            onClick={onNextShift}
            className="flex-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-neutral-950 font-black text-base shadow-xl cursor-pointer transition-all border border-amber-300 uppercase tracking-wider"
          >
            Start Shift #{results.shiftNumber + 1} →
          </button>
        </div>
      </div>
    </div>
  );
};
