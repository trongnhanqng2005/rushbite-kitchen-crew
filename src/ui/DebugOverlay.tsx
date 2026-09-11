/**
 * Performance & Engine Debug Overlay (toggled via F3).
 * Samples at 500ms intervals to prevent unnecessary React renders.
 */

import React from 'react';
import { DebugMetrics } from '../game/GameState.ts';

interface DebugOverlayProps {
  metrics: DebugMetrics;
  visible: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ metrics, visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-none select-none bg-neutral-950/90 backdrop-blur-md border border-amber-500/50 rounded-xl p-3.5 text-neutral-200 font-mono text-xs shadow-2xl min-w-[220px]">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2 font-bold text-amber-400">
        <span>ENGINE METRICS</span>
        <span className="text-[10px] text-neutral-500">F3 to Toggle</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-neutral-400">FPS:</span>
          <span className={metrics.fps >= 55 ? 'text-emerald-400 font-bold' : metrics.fps >= 30 ? 'text-amber-400' : 'text-red-400'}>
            {metrics.fps} FPS
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">Frame Time:</span>
          <span>{metrics.frameTimeMs} ms</span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">Customers:</span>
          <span>{metrics.activeCustomers} simulated</span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">Active Orders:</span>
          <span>{metrics.activeOrders}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">Draw Calls:</span>
          <span className="text-emerald-300">{metrics.drawCalls}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">Triangles:</span>
          <span className="text-neutral-300">{metrics.triangles.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">Scene Objects:</span>
          <span>{metrics.sceneObjects}</span>
        </div>

        {metrics.memoryGeometries !== undefined && (
          <div className="flex justify-between border-t border-neutral-800 pt-1 mt-1 text-[10px] text-neutral-500">
            <span>Geometries/Textures:</span>
            <span>{metrics.memoryGeometries} / {metrics.memoryTextures}</span>
          </div>
        )}
      </div>
    </div>
  );
};
