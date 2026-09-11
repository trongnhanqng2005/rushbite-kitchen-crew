/**
 * Main Application Component.
 * Hosts the Three.js 3D viewport canvas and manages top-level UI states
 * (HUD, Main Menu, Pause Menu, Shift Results, Settings, and F3 Debug Overlay).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './game/Game.ts';
import { GameState, GamePhase } from './game/GameState.ts';
import { HUD } from './ui/HUD.tsx';
import { MainMenu } from './ui/MainMenu.tsx';
import { PauseMenu } from './ui/PauseMenu.tsx';
import { ShiftResults } from './ui/ShiftResults.tsx';
import { DebugOverlay } from './ui/DebugOverlay.tsx';
import { SettingsModal } from './ui/SettingsModal.tsx';
import { EventBus } from './core/EventBus.ts';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  // Synchronized state for UI rendering
  const [phase, setPhase] = useState<GamePhase>('MAIN_MENU');
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Lightweight snapshot updated at throttled intervals for HUD reactivity
  const [hudSnapshot, setHudSnapshot] = useState<GameState>(() => new GameState());

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Game Engine
    const game = new Game(containerRef.current);
    gameRef.current = game;
    setHudSnapshot({ ...game.state });

    const eventBus = EventBus.getInstance();

    const unsubPointer = eventBus.on('POINTER_LOCK_CHANGED', (locked: boolean) => {
      setIsPointerLocked(locked);
    });

    const unsubShiftEnded = eventBus.on('SHIFT_ENDED', () => {
      setPhase('SHIFT_RESULTS');
    });

    // Throttled UI state synchronization (every 80ms ~ 12 Hz) to decouple React from 60fps Three.js loop
    const uiInterval = window.setInterval(() => {
      if (gameRef.current) {
        setPhase(gameRef.current.state.phase);
        setHudSnapshot({
          ...gameRef.current.state,
          debugMetrics: { ...gameRef.current.state.debugMetrics },
        });
      }
    }, 80);

    // F3 keyboard shortcut for Debug Overlay toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setDebugVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearInterval(uiInterval);
      window.removeEventListener('keydown', handleKeyDown);
      unsubPointer();
      unsubShiftEnded();
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const handleStartShift = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.startShift();
      setPhase('PLAYING');
    }
  }, []);

  const handleResumeShift = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resumeGame();
      setPhase('PLAYING');
    }
  }, []);

  const handleRestartShift = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.startShift();
      setPhase('PLAYING');
    }
  }, []);

  const handleQuitToMenu = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.quitToMainMenu();
      setPhase('MAIN_MENU');
    }
  }, []);

  const handleNextShift = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.nextShift();
      setPhase('PLAYING');
    }
  }, []);

  const handleRequestPointerLock = useCallback(() => {
    if (gameRef.current?.player) {
      gameRef.current.player.requestPointerLock();
    }
  }, []);

  const handleApplyGraphics = useCallback((preset: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (gameRef.current) {
      gameRef.current.applyGraphicsQuality(preset);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Heads-Up Display (during active shift) */}
      {phase === 'PLAYING' && (
        <HUD
          state={hudSnapshot}
          isPointerLocked={isPointerLocked}
          onRequestPointerLock={handleRequestPointerLock}
        />
      )}

      {/* Main Menu */}
      {phase === 'MAIN_MENU' && (
        <MainMenu
          onStartGame={handleStartShift}
          onOpenSettings={() => setShowSettings(true)}
          highestShift={hudSnapshot.currentShift}
          totalCash={hudSnapshot.cash}
        />
      )}

      {/* Pause Menu */}
      {phase === 'PAUSED' && (
        <PauseMenu
          onResume={handleResumeShift}
          onRestartShift={handleRestartShift}
          onOpenSettings={() => setShowSettings(true)}
          onQuitToMenu={handleQuitToMenu}
          currentShift={hudSnapshot.currentShift}
        />
      )}

      {/* Shift Results Screen */}
      {phase === 'SHIFT_RESULTS' && (
        <ShiftResults
          results={hudSnapshot.lastShiftResults}
          totalBankCash={hudSnapshot.cash}
          onNextShift={handleNextShift}
          onQuitToMenu={handleQuitToMenu}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onApplyGraphics={handleApplyGraphics}
        />
      )}

      {/* F3 Development Engine Debug Overlay */}
      <DebugOverlay metrics={hudSnapshot.debugMetrics} visible={debugVisible} />
    </div>
  );
}
