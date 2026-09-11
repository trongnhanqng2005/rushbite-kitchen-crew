/**
 * Settings modal for Graphics Quality, Mouse Sensitivity, and Audio.
 */

import React, { useState } from 'react';
import { GameConfig, GraphicsSettings } from '../game/GameConfig.ts';
import { SoundManager } from '../audio/SoundManager.ts';

interface SettingsModalProps {
  onClose: () => void;
  onApplyGraphics: (preset: 'LOW' | 'MEDIUM' | 'HIGH') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onApplyGraphics }) => {
  const [quality, setQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(GameConfig.graphics.quality);
  const [sensitivity, setSensitivity] = useState(GameConfig.player.mouseSensitivity);
  const [invertY, setInvertY] = useState(GameConfig.player.invertY);
  const [masterVol, setMasterVol] = useState(GameConfig.audio.masterVolume);
  const [sfxVol, setSfxVol] = useState(GameConfig.audio.sfxVolume);

  const handleQualityChange = (q: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setQuality(q);
    onApplyGraphics(q);
  };

  const handleSensChange = (val: number) => {
    setSensitivity(val);
    GameConfig.player.mouseSensitivity = val;
  };

  const handleInvertChange = (val: boolean) => {
    setInvertY(val);
    GameConfig.player.invertY = val;
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    SoundManager.getInstance().setMasterVolume(val);
  };

  const handleSfxVolChange = (val: number) => {
    setSfxVol(val);
    SoundManager.getInstance().setSfxVolume(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none font-sans">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 text-neutral-200 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> Game Settings
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          {/* Graphics Preset */}
          <div>
            <label className="block font-bold text-neutral-300 mb-2">Graphics Quality</label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleQualityChange(preset)}
                  className={`py-2 px-3 rounded-lg font-bold text-xs cursor-pointer border transition-all ${
                    quality === preset
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              LOW: No shadows, 1.0x pixel ratio. HIGH: Soft PCF shadows, 1.5x pixel ratio.
            </p>
          </div>

          {/* Mouse Sensitivity */}
          <div>
            <div className="flex justify-between font-bold text-neutral-300 mb-1">
              <span>Mouse Sensitivity</span>
              <span className="font-mono text-amber-400">{(sensitivity * 1000).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.005"
              step="0.0002"
              value={sensitivity}
              onChange={(e) => handleSensChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Invert Mouse Y */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-300">Invert Mouse Y</span>
            <input
              type="checkbox"
              checked={invertY}
              onChange={(e) => handleInvertChange(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Audio Volume */}
          <div>
            <div className="flex justify-between font-bold text-neutral-300 mb-1">
              <span>Master Volume</span>
              <span className="font-mono text-amber-400">{Math.round(masterVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVol}
              onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-neutral-300 mb-1">
              <span>Sound Effects (SFX)</span>
              <span className="font-mono text-amber-400">{Math.round(sfxVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVol}
              onChange={(e) => handleSfxVolChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl cursor-pointer"
        >
          Save & Back
        </button>
      </div>
    </div>
  );
};
