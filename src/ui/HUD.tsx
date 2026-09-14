/**
 * Heads-Up Display for RushBite: Kitchen Crew.
 * Renders active order tickets, crosshair, interaction prompt,
 * held item status, shift countdown, and financial tracker.
 */

import React from 'react';
import { GameState } from '../game/GameState.ts';
import { INGREDIENT_DEFINITIONS } from '../data/ingredients.ts';

interface HUDProps {
  state: GameState;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
}

export const HUD: React.FC<HUDProps> = ({ state, isPointerLocked, onRequestPointerLock }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const heldDef = state.heldItem ? INGREDIENT_DEFINITIONS[state.heldItem.type] : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 overflow-hidden font-sans">
      {/* Top Header Bar: Stats on left, Orders in center */}
      <div className="flex items-start justify-between w-full max-w-7xl mx-auto gap-4">
        {/* Left: Shift & Finances */}
        <div className="flex items-center gap-3 bg-neutral-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-neutral-700/80 shadow-lg text-white">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
              Shift #{state.currentShift}
            </span>
            <span className={`text-2xl font-black font-mono ${state.remainingShiftSeconds < 30 ? 'text-red-400 animate-pulse' : 'text-neutral-100'}`}>
              ⏱ {formatTime(state.remainingShiftSeconds)}
            </span>
          </div>

          <div className="h-8 w-px bg-neutral-700 mx-1" />

          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
              Cash Earned
            </span>
            <span className="text-2xl font-black text-emerald-300 font-mono">
              ${state.cash.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Center-Top: Active Order Tickets */}
        <div className="flex items-start gap-2.5 overflow-x-auto max-w-[65vw] pb-2 scrollbar-none">
          {state.activeOrders.length === 0 ? (
            <div className="bg-neutral-900/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-neutral-700/50 text-neutral-400 text-xs flex items-center gap-2">
              <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-amber-400" />
              Waiting for customer orders...
            </div>
          ) : (
            state.activeOrders.map((order) => {
              const patiencePercent = order.patiencePercent;
              const barColor =
                patiencePercent > 60
                  ? 'bg-emerald-500'
                  : patiencePercent > 25
                  ? 'bg-amber-500'
                  : 'bg-red-500 animate-pulse';

              return (
                <div
                  key={order.orderId}
                  className="bg-neutral-900/95 backdrop-blur-md rounded-lg border border-amber-500/40 p-2.5 min-w-[170px] shadow-xl text-white flex flex-col gap-1.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-100">
                      <span>{order.recipeIcon}</span>
                      <span className="truncate max-w-[105px]">{order.recipeName}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-400">
                      ${order.basePrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Ingredients Stack preview chips */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {order.requiredIngredients.map((ing, i) => (
                      <span
                        key={i}
                        className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700/60"
                      >
                        {INGREDIENT_DEFINITIONS[ing]?.iconText || '•'}{' '}
                        {INGREDIENT_DEFINITIONS[ing]?.name || ing}
                      </span>
                    ))}
                  </div>

                  {/* Patience progress bar */}
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-200 ${barColor}`}
                      style={{ width: `${patiencePercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Center Screen: Crosshair & Interaction Prompt */}
      <div className="flex flex-col items-center justify-center self-center my-auto pointer-events-none">
        {/* Precision Crosshair dot */}
        <div className="relative flex items-center justify-center w-8 h-8">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <div className="absolute w-4 h-4 border border-white/40 rounded-full" />
        </div>

        {/* Dynamic Contextual Action Prompt */}
        {state.currentPrompt && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <div className="bg-neutral-900/95 backdrop-blur-md text-amber-300 px-3.5 py-1.5 rounded-lg border border-amber-500/60 shadow-2xl font-bold text-sm tracking-wide animate-fade-in flex items-center gap-2">
              <span className="inline-block px-1.5 py-0.5 bg-amber-500 text-neutral-950 font-black text-xs rounded">
                E
              </span>
              <span>{state.currentPrompt.replace('[E]', '').trim()}</span>
            </div>

            {state.secondaryPrompt && (
              <div className="text-xs text-neutral-400 bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-700">
                {state.secondaryPrompt}
              </div>
            )}
          </div>
        )}

        {/* Click to lock mouse prompt if pointer not locked */}
        {!isPointerLocked && (
          <button
            onClick={onRequestPointerLock}
            className="mt-6 pointer-events-auto bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold px-5 py-2.5 rounded-xl shadow-2xl cursor-pointer transition-all border border-amber-300"
          >
            Click to Control Kitchen (Lock Mouse)
          </button>
        )}
      </div>

      {/* Bottom Bar: Instructions on Left, Held Item on Right */}
      <div className="flex items-end justify-between w-full max-w-7xl mx-auto">
        {/* Controls Keybinding helper */}
        <div className="bg-neutral-900/85 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-3">
          <span><strong className="text-neutral-200">WASD</strong> Move</span>
          <span><strong className="text-neutral-200">Shift</strong> Sprint</span>
          <span><strong className="text-neutral-200">E</strong> Interact</span>
          <span><strong className="text-neutral-200">RMB</strong> Board Clear</span>
          <span><strong className="text-neutral-200">ESC</strong> Pause</span>
          <span><strong className="text-neutral-200">F3</strong> Debug</span>
        </div>

        {/* Held Item Status Card */}
        <div className="bg-neutral-900/95 backdrop-blur-md rounded-xl border border-neutral-700/80 p-3 shadow-2xl text-white min-w-[200px] flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl">
            {heldDef ? heldDef.iconText : '✋'}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
              Carrying in Hands
            </span>
            <span className="text-sm font-bold text-neutral-100">
              {heldDef ? heldDef.name : 'Empty Hands'}
            </span>

            {state.heldItem && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    state.heldItem.state === 'COOKED'
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                      : state.heldItem.state === 'BURNT'
                      ? 'bg-red-900/60 text-red-300 border border-red-700'
                      : state.heldItem.state === 'ASSEMBLED'
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {state.heldItem.state}
                </span>

                {state.heldItem.layers && state.heldItem.layers.length > 0 && (
                  <span className="text-[10px] text-neutral-400">
                    ({state.heldItem.layers.length} layers)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
