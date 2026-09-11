/**
 * Pause Menu component triggered via ESC key.
 */

import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onRestartShift: () => void;
  onOpenSettings: () => void;
  onQuitToMenu: () => void;
  currentShift: number;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestartShift,
  onOpenSettings,
  onQuitToMenu,
  currentShift,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6 select-none font-sans">
      <div className="max-w-sm w-full bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center">
        <h2 className="text-2xl font-black text-white uppercase mb-1">Shift Paused</h2>
        <p className="text-xs text-amber-400 font-semibold uppercase mb-6">
          Shift #{currentShift} in progress
        </p>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-neutral-950 font-bold text-base shadow-md cursor-pointer transition-all"
          >
            Resume Shift (ESC)
          </button>

          <button
            onClick={onRestartShift}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm border border-neutral-700 cursor-pointer transition-all"
          >
            Restart Current Shift
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm border border-neutral-700 cursor-pointer transition-all"
          >
            Settings & Audio
          </button>

          <button
            onClick={onQuitToMenu}
            className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-semibold text-sm border border-red-800/60 cursor-pointer transition-all mt-2"
          >
            Clock Out (Main Menu)
          </button>
        </div>
      </div>
    </div>
  );
};
