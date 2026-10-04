import React, { useState } from 'react';
import { BlockType, BLOCK_DEFS, getBlockTextureUrl } from '../game/blocks';
import { getBlockSprite } from '../game/textureAtlas';
import { X, Search } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (block: BlockType) => void;
  selectedBlock: BlockType;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  onSelectBlock,
  selectedBlock,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  // Filter available blocks (exclude AIR)
  const allBlocks = Object.values(BLOCK_DEFS).filter(
    (b) => b.id !== BlockType.AIR && b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-xl bg-[#c6c6c6] border-4 border-t-[#ffffff] border-l-[#ffffff] border-r-[#555555] border-b-[#555555] shadow-2xl p-4 text-[#333333] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#888888] mb-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wide uppercase text-[#222222]">
              Creative Inventory
            </span>
            <span className="text-xs text-[#555555] font-medium">({allBlocks.length} blocks)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#a0a0a0] active:bg-[#888888] rounded text-[#222222] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-[#666666]" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks (stone, diamond, wood...)"
            className="w-full pl-9 pr-3 py-1.5 bg-[#8b8b8b] border-2 border-t-[#373737] border-l-[#373737] border-r-[#ffffff] border-b-[#ffffff] text-white placeholder-gray-300 text-sm focus:outline-hidden"
            autoFocus
          />
        </div>

        {/* Grid of Blocks */}
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-80 overflow-y-auto p-2 bg-[#8b8b8b] border-2 border-t-[#373737] border-l-[#373737] border-r-[#ffffff] border-b-[#ffffff]">
          {allBlocks.map((block) => {
            const isEquipped = block.id === selectedBlock;
            return (
              <button
                key={block.id}
                onClick={() => {
                  onSelectBlock(block.id);
                  onClose();
                }}
                title={block.name}
                className={`relative flex flex-col items-center justify-center p-1.5 aspect-square rounded-xs transition-all ${
                  isEquipped
                    ? 'bg-[#ffe600]/30 border-2 border-[#ffe600]'
                    : 'bg-[#b0b0b0] hover:bg-[#d0d0d0] border border-[#777777]'
                }`}
              >
                {/* Block Texture Preview */}
                <img
                  src={getBlockTextureUrl(block.id) || getBlockSprite(block.id)}
                  alt={block.name}
                  className="w-8 h-8 object-contain [image-rendering:pixelated] drop-shadow-xs"
                />
                <span className="text-[10px] text-center text-black font-semibold truncate w-full mt-1">
                  {block.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer instructions */}
        <div className="mt-3 flex items-center justify-between text-xs text-[#444444]">
          <span>Click any block to place in active hotbar slot</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#d6d6d6] hover:bg-[#e0e0e0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#555555] border-b-[#555555] font-semibold text-xs active:translate-y-0.5"
          >
            Close (E)
          </button>
        </div>
      </div>
    </div>
  );
};
