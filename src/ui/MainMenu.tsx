/**
 * Main Menu component for RushBite: Kitchen Crew.
 * Styled with warm fast-food aesthetic, low-poly vibe, and clear options.
 */

import React, { useState } from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
  highestShift: number;
  totalCash: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenSettings,
  highestShift,
  totalCash,
}) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/85 backdrop-blur-md p-6 select-none font-sans">
      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Accent top banner bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        {/* Logo and Brand Title */}
        <div className="mt-2 mb-2">
          <span className="text-4xl">🍔</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white uppercase mb-1">
          RushBite
        </h1>
        <p className="text-amber-400 font-bold text-sm tracking-widest uppercase mb-6">
          Kitchen Crew • 3D Restaurant Simulator
        </p>

        {/* Stats card */}
        <div className="flex items-center justify-center gap-6 bg-neutral-800/80 border border-neutral-700/60 rounded-xl px-6 py-3 w-full mb-8">
          <div>
            <div className="text-xs text-neutral-400 font-semibold uppercase">Current Shift</div>
            <div className="text-xl font-bold text-white font-mono">Shift #{highestShift}</div>
          </div>
          <div className="h-8 w-px bg-neutral-700" />
          <div>
            <div className="text-xs text-neutral-400 font-semibold uppercase">Bank Balance</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">${totalCash.toFixed(2)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onStartGame}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-neutral-950 font-black text-lg shadow-lg cursor-pointer transition-all border border-amber-300 tracking-wide uppercase"
          >
            Clock In & Start Shift
          </button>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm border border-neutral-700 cursor-pointer transition-all"
          >
            How To Play & Recipes
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm border border-neutral-700 cursor-pointer transition-all"
          >
            Settings & Graphics
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-xs text-neutral-500">
          First-Person 3D Kitchen Vertical Slice • 60 FPS Optimized
        </div>
      </div>

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 text-left text-neutral-200 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span>📖</span> How To Operate The Kitchen
            </h3>

            <div className="space-y-3 text-sm text-neutral-300">
              <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700">
                <strong className="text-amber-400 block mb-1">1. Take Customer Orders</strong>
                Wait at the Cash Register. When a customer walks up, press <strong className="text-white">[E]</strong> to record their order ticket.
              </div>

              <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700">
                <strong className="text-amber-400 block mb-1">2. Grill the Patties</strong>
                Pick up a Raw Patty from the left dispenser with <strong className="text-white">[E]</strong>, place it on the Grill, and wait until it cooks to golden brown! Remove before it burns!
              </div>

              <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700">
                <strong className="text-amber-400 block mb-1">3. Assemble On The Board</strong>
                Place bottom bun on the Assembly Board. Add your cooked patty, cheese, lettuce, and tomato, then top it with a top bun. Press <strong className="text-white">[E]</strong> with empty hands to pick up the burger.
              </div>

              <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700">
                <strong className="text-amber-400 block mb-1">4. Serve & Get Paid</strong>
                Carry the burger to the front counter and press <strong className="text-white">[E]</strong> at the Cash Register to serve and earn cash + tips!
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-5 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl cursor-pointer"
            >
              Got It, Let's Cook!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
