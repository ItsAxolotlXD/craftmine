import React, { useState } from 'react';
import { Play, Settings, LogOut, RotateCcw } from 'lucide-react';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenSettings }) => {
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between items-center select-none bg-black/55 backdrop-blur-xs p-6 text-white overflow-hidden">
      {/* Subtle dirt/stone patterned vignette overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.85)_100%)]" />

      {/* Top spacer */}
      <div className="w-full flex justify-between items-center text-xs text-gray-400 font-mono tracking-wider pt-2 z-10">
        <span>Infinite 3D Voxel Engine</span>
        <span className="text-emerald-400 font-semibold">Creative & Flying Enabled</span>
      </div>

      {/* Center Container: Logo & Buttons */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md my-auto">
        {/* <logo>: CRAFTMINE */}
        <div className="relative mb-10 text-center">
          <h1
            className="text-5xl sm:text-7xl font-extrabold tracking-widest text-[#cccccc] font-sans drop-shadow-[0_6px_0_#2b2b2b] uppercase"
            style={{
              textShadow: '3px 3px 0 #1b1b1b, -2px -2px 0 #ffffff22, 0 8px 16px rgba(0,0,0,0.9)',
              letterSpacing: '0.12em',
            }}
          >
            CRAFTMINE
          </h1>

          {/* Yellow Minecraft Splash Text */}
          <div className="absolute -bottom-3 right-0 transform rotate-[-12deg] animate-pulse">
            <span className="bg-yellow-400 text-black px-2 py-0.5 text-xs sm:text-sm font-black tracking-wide rounded-xs shadow-lg uppercase">
              Now with Infinite Oceans!
            </span>
          </div>
        </div>

        {/* <buttons> */}
        <div className="w-full space-y-3 px-4">
          {/* Create New World */}
          <button
            onClick={onStartGame}
            className="w-full py-3.5 px-6 bg-[#666666] hover:bg-[#777777] active:bg-[#555555] text-white font-bold text-base sm:text-lg rounded-xs border-2 border-t-[#aaaaaa] border-l-[#aaaaaa] border-r-[#333333] border-b-[#333333] shadow-xl flex items-center justify-center gap-3 transition-all active:translate-y-0.5 tracking-wider uppercase cursor-pointer"
          >
            <Play size={20} className="fill-white" />
            <span>Create New World</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-full py-3.5 px-6 bg-[#666666] hover:bg-[#777777] active:bg-[#555555] text-white font-bold text-base sm:text-lg rounded-xs border-2 border-t-[#aaaaaa] border-l-[#aaaaaa] border-r-[#333333] border-b-[#333333] shadow-xl flex items-center justify-center gap-3 transition-all active:translate-y-0.5 tracking-wider uppercase cursor-pointer"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>

          {/* Quit and Close */}
          <button
            onClick={() => setShowQuitDialog(true)}
            className="w-full py-3.5 px-6 bg-[#666666] hover:bg-[#777777] active:bg-[#555555] text-white font-bold text-base sm:text-lg rounded-xs border-2 border-t-[#aaaaaa] border-l-[#aaaaaa] border-r-[#333333] border-b-[#333333] shadow-xl flex items-center justify-center gap-3 transition-all active:translate-y-0.5 tracking-wider uppercase cursor-pointer"
          >
            <LogOut size={20} />
            <span>Quit and Close</span>
          </button>
        </div>
      </div>

      {/* <version>: Craftmine Beta 1.2 */}
      <div className="w-full flex justify-between items-center text-xs text-gray-400 font-mono z-10 pb-2">
        <span className="font-semibold text-gray-300">Craftmine Beta 1.2</span>
        <span>Mountains · Oceans · Big Caves · Rivers</span>
      </div>

      {/* Quit Dialog Modal */}
      {showQuitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-[#242933] border border-white/20 p-6 rounded-xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Game Closed</h3>
            <p className="text-xs text-gray-300 mb-5 leading-relaxed">
              Thanks for exploring Craftmine Beta 1.2! You can now safely close this browser window or return to the main menu.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQuitDialog(false)}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Return to Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
