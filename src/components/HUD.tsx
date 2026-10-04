import React from 'react';
import { BlockType, BLOCK_DEFS, getBlockTextureUrl } from '../game/blocks';
import { getBlockSprite } from '../game/textureAtlas';

interface HUDProps {
  hotbarBlocks: BlockType[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  playerPos: { x: number; y: number; z: number };
  isLocked: boolean;
  onLockPointer: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hotbarBlocks,
  selectedSlot,
  onSelectSlot,
  playerPos,
}) => {
  const currentBlock = BLOCK_DEFS[hotbarBlocks[selectedSlot]];

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between overflow-hidden font-minecraft">
      {/* 1. Top-Left: Minimal Coordinates in authentic Minecraft font */}
      <div className="p-3 sm:p-4">
        <div className="text-white text-xs sm:text-sm tracking-wider mc-shadow">
          XYZ: {Math.floor(playerPos.x)} / {Math.floor(playerPos.y)} / {Math.floor(playerPos.z)}
        </div>
      </div>

      {/* 2. Center: Classic Crosshair (Click to play button removed) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-4 h-4 flex items-center justify-center opacity-85">
          <div className="absolute w-4 h-[2px] bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" />
          <div className="absolute h-4 w-[2px] bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" />
        </div>
      </div>

      {/* 3. Bottom: Item Name Tooltip & 9-Slot Texture Hotbar */}
      <div className="pb-4 flex flex-col items-center pointer-events-auto">
        {/* Selected Item Name */}
        {currentBlock && (
          <div className="mb-2 text-white text-sm tracking-wider mc-shadow drop-shadow-md">
            {currentBlock.name}
          </div>
        )}

        {/* 9-Slot Hotbar with Real Pixel Block Textures */}
        <div className="flex items-center gap-1 p-1 bg-[#8f8f8f]/85 border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#373737] border-b-[#373737] shadow-2xl rounded-xs">
          {hotbarBlocks.map((blockId, index) => {
            const isSelected = index === selectedSlot;
            const officialUrl = getBlockTextureUrl(blockId);
            const spriteUrl = officialUrl || getBlockSprite(blockId);

            return (
              <button
                key={index}
                onClick={() => onSelectSlot(index)}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/35 border-2 border-white scale-105 shadow-md'
                    : 'bg-[#555555]/60 hover:bg-white/20 border border-black/40'
                }`}
              >
                {/* Hotbar Slot Number */}
                <span className="absolute top-0.5 left-1 text-[10px] text-gray-200 mc-shadow font-bold">
                  {index + 1}
                </span>

                {/* Block Texture Image */}
                {spriteUrl ? (
                  <img
                    src={spriteUrl}
                    alt={`Slot ${index + 1}`}
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain [image-rendering:pixelated] drop-shadow-xs pointer-events-none"
                  />
                ) : (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xs border border-black/30"
                    style={{ backgroundColor: currentBlock?.colorHex || '#888888' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
