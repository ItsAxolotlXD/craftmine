import React, { useState } from 'react';
import { GameSettings } from '../game/engine';
import { X, Sun, Moon, Sunrise, Sunset, Mountain, Waves, Compass, Sparkles, Volume2, Eye } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onSetTime: (val: number) => void;
  onTeleport: (landmark: 'mountain' | 'river' | 'caves' | 'pond' | 'ocean' | 'spawn') => void;
  onRegenerateWorld: (seed: number) => void;
  currentSeed: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSetTime,
  onTeleport,
  onRegenerateWorld,
  currentSeed,
}) => {
  const [seedInput, setSeedInput] = useState(currentSeed.toString());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-lg bg-[#242933] border border-white/10 shadow-2xl rounded-xl p-5 text-gray-200 font-sans max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-white tracking-wide">
              World & Game Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Game Mode */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ isCreative: false })}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  !settings.isCreative
                    ? 'bg-emerald-600/30 border-emerald-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                Survival Mode (Walking, Gravity, Water)
              </button>
              <button
                onClick={() => onUpdateSettings({ isCreative: true })}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  settings.isCreative
                    ? 'bg-amber-600/30 border-amber-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                Creative Mode (Fly with Space/Shift)
              </button>
            </div>
          </div>

          {/* Time of Day */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Time of Day
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => onSetTime(0.0)}
                className="py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium flex flex-col items-center gap-1 text-amber-300 transition-colors"
              >
                <Sunrise size={18} />
                <span>Dawn</span>
              </button>
              <button
                onClick={() => onSetTime(0.25)}
                className="py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium flex flex-col items-center gap-1 text-yellow-400 transition-colors"
              >
                <Sun size={18} />
                <span>Noon</span>
              </button>
              <button
                onClick={() => onSetTime(0.5)}
                className="py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium flex flex-col items-center gap-1 text-orange-400 transition-colors"
              >
                <Sunset size={18} />
                <span>Sunset</span>
              </button>
              <button
                onClick={() => onSetTime(0.75)}
                className="py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium flex flex-col items-center gap-1 text-indigo-300 transition-colors"
              >
                <Moon size={18} />
                <span>Night</span>
              </button>
            </div>
          </div>

          {/* Landmark Teleports */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Fast Landmark Teleports
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onTeleport('ocean');
                  onClose();
                }}
                className="py-2 px-3 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 rounded-lg text-xs font-medium flex items-center gap-2 text-cyan-200 transition-colors"
              >
                <Waves size={16} className="text-cyan-400" />
                <span>Deep Ocean</span>
              </button>
              <button
                onClick={() => {
                  onTeleport('mountain');
                  onClose();
                }}
                className="py-2 px-3 bg-white/5 hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/40 rounded-lg text-xs font-medium flex items-center gap-2 text-sky-200 transition-colors"
              >
                <Mountain size={16} className="text-sky-400" />
                <span>Big Mountains</span>
              </button>
              <button
                onClick={() => {
                  onTeleport('river');
                  onClose();
                }}
                className="py-2 px-3 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-lg text-xs font-medium flex items-center gap-2 text-blue-200 transition-colors"
              >
                <Waves size={16} className="text-blue-400" />
                <span>Winding River</span>
              </button>
              <button
                onClick={() => {
                  onTeleport('caves');
                  onClose();
                }}
                className="py-2 px-3 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 rounded-lg text-xs font-medium flex items-center gap-2 text-purple-200 transition-colors"
              >
                <Sparkles size={16} className="text-purple-400" />
                <span>Big Caves System</span>
              </button>
              <button
                onClick={() => {
                  onTeleport('pond');
                  onClose();
                }}
                className="py-2 px-3 bg-white/5 hover:bg-teal-500/20 border border-white/10 hover:border-teal-400/40 rounded-lg text-xs font-medium flex items-center gap-2 text-teal-200 transition-colors"
              >
                <Waves size={16} className="text-teal-400" />
                <span>Pond / Lake</span>
              </button>
              <button
                onClick={() => {
                  onTeleport('spawn');
                  onClose();
                }}
                className="py-2 px-3 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-400/40 rounded-lg text-xs font-medium flex items-center gap-2 text-emerald-200 transition-colors col-span-2 sm:col-span-1"
              >
                <Compass size={16} className="text-emerald-400" />
                <span>World Spawn</span>
              </button>
            </div>
          </div>

          {/* Graphics & Viewport */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Render Distance */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Eye size={14} className="text-sky-400" />
                  Render Distance
                </span>
                <span className="text-sky-400 font-mono">{settings.renderDistance} Chunks</span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                step="1"
                value={settings.renderDistance}
                onChange={(e) => onUpdateSettings({ renderDistance: parseInt(e.target.value, 10) })}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>3 (Fastest)</span>
                <span>5 (Balanced)</span>
                <span>8 (Far / High End)</span>
              </div>
            </div>

            {/* FOV */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-gray-300">Field of View (FOV)</span>
                <span className="text-sky-400 font-mono">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min="60"
                max="105"
                step="5"
                value={settings.fov}
                onChange={(e) => onUpdateSettings({ fov: parseInt(e.target.value, 10) })}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Sound Volume */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Volume2 size={14} className="text-sky-400" />
                  Sound Volume
                </span>
                <span className="text-sky-400 font-mono">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
          </div>

          {/* World Seed & Generator */}
          <div className="pt-2 border-t border-white/10">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              World Seed
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="World Seed..."
                className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-hidden focus:border-sky-400 font-mono"
              />
              <button
                onClick={() => {
                  const s = parseInt(seedInput, 10) || Math.floor(Math.random() * 999999);
                  onRegenerateWorld(s);
                  onClose();
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Generate New
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Resume Game (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
