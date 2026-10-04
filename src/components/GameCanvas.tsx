import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameSettings } from '../game/engine';
import { BlockType } from '../game/blocks';
import { HUD } from './HUD';
import { InventoryModal } from './InventoryModal';
import { SettingsModal } from './SettingsModal';
import { MobileControls } from './MobileControls';
import { MainMenu } from './MainMenu';
import { ChatOverlay, ChatMessage } from './ChatOverlay';

const DEFAULT_HOTBAR: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.COBBLESTONE,
  BlockType.WOOD_PLANK,
  BlockType.OAK_LOG,
  BlockType.TORCH,
  BlockType.TNT,
  BlockType.FLINT_AND_STEEL,
  BlockType.GLASS,
];

export const GameCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Main Menu State
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);

  // Chat & Commands State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', text: 'Craftmine Beta 1.2 started in Creative Flight mode.', color: '#ffff55' },
    { id: '2', text: 'Press / for commands (e.g. /gamemode survival or /gamemode creative).', color: '#aaaaaa' },
  ]);

  // Hotbar & Selected Block
  const [hotbarBlocks, setHotbarBlocks] = useState<BlockType[]>(DEFAULT_HOTBAR);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // UI Modals
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Live state from engine
  const [isLocked, setIsLocked] = useState(false);
  const [isFlying, setIsFlying] = useState(true);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 0 });
  const [currentSeed, setCurrentSeed] = useState(4289);

  // Settings State - Default Creative Mode with Flight Enabled
  const [settings, setSettings] = useState<GameSettings>({
    fov: 75,
    renderDistance: 3,
    daySpeed: 1,
    isCreative: true,
    soundVolume: 0.5,
  });

  // Sync held block with first-person hand
  useEffect(() => {
    if (engineRef.current && hotbarBlocks[selectedSlot] !== undefined) {
      engineRef.current.setHeldBlock(hotbarBlocks[selectedSlot]);
    }
  }, [selectedSlot, hotbarBlocks]);

  // Add a chat message helper
  const addChatMessage = useCallback((text: string, color?: string, sender?: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random(), text, color, sender },
    ]);
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, currentSeed);
    engineRef.current = engine;

    engine.start();

    // Periodic state sync for HUD
    const syncInterval = window.setInterval(() => {
      if (!engineRef.current) return;
      const p = engineRef.current.player;
      setPlayerPos({ x: p.position.x, y: p.position.y, z: p.position.z });
      setIsFlying(p.isFlying);
    }, 150);

    return () => {
      clearInterval(syncInterval);
      engine.dispose();
      engineRef.current = null;
    };
  }, [currentSeed]);

  // Pointer Lock handling
  const handleLockPointer = useCallback(() => {
    if (!containerRef.current || isInventoryOpen || isSettingsOpen || isMainMenuOpen) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock?.().catch(() => {});
    }
  }, [isInventoryOpen, isSettingsOpen, isMainMenuOpen]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement !== null;
      setIsLocked(locked);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // Keyboard & Mouse controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      // When in chat or typing in an input, do not process game hotkeys (e.g. typing 'e' will not open inventory)
      if (isChatOpen || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Handle modals toggle
      if (e.code === 'KeyE') {
        if (isMainMenuOpen) return;
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        setIsInventoryOpen((prev) => {
          if (!prev && document.pointerLockElement) {
            document.exitPointerLock();
          }
          return !prev;
        });
        return;
      }

      if (e.code === 'Escape') {
        if (isInventoryOpen) {
          setIsInventoryOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        // Toggle main menu on ESC if no other modal is open
        if (!isMainMenuOpen) {
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          setIsMainMenuOpen(true);
          return;
        }
      }

      if (e.code === 'F3') {
        e.preventDefault();
        return;
      }

      // Slash key '/' opens chat / command line
      if (e.key === '/' || e.code === 'Slash') {
        if (!isMainMenuOpen && !isInventoryOpen && !isSettingsOpen) {
          e.preventDefault();
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          setIsChatOpen(true);
          return;
        }
      }

      // If in modal, chat, or main menu, ignore game input
      if (isMainMenuOpen || isInventoryOpen || isSettingsOpen || isChatOpen) return;

      // Hotbar selection numbers 1 to 9
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 9) {
          setSelectedSlot(digit - 1);
        }
      }

      // Creative Fly toggle
      if (e.code === 'KeyC') {
        if (engine.player.isCreative) {
          engine.player.isFlying = !engine.player.isFlying;
          setIsFlying(engine.player.isFlying);
        }
      }

      // Movement keys
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          engine.input.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          engine.input.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          engine.input.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          engine.input.right = true;
          break;
        case 'Space':
          engine.input.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          engine.input.sprint = true;
          engine.input.crouch = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          engine.input.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          engine.input.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          engine.input.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          engine.input.right = false;
          break;
        case 'Space':
          engine.input.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          engine.input.sprint = false;
          engine.input.crouch = false;
          break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement && engineRef.current) {
        engineRef.current.player.onMouseMove(e.movementX, e.movementY);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!document.pointerLockElement || isMainMenuOpen || isInventoryOpen || isSettingsOpen) return;
      const engine = engineRef.current;
      if (!engine) return;

      if (e.button === 0) {
        // Left click: Break Block
        engine.breakTargetedBlock();
      } else if (e.button === 2) {
        // Right click: Place Block
        const blockToPlace = hotbarBlocks[selectedSlot];
        engine.placeBlockOnTarget(blockToPlace);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!document.pointerLockElement) return;
      setSelectedSlot((prev) => {
        if (e.deltaY > 0) return (prev + 1) % 9;
        return (prev - 1 + 9) % 9;
      });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [hotbarBlocks, selectedSlot, isMainMenuOpen, isInventoryOpen, isSettingsOpen]);

  // Equip selected block from Inventory into active slot
  const handleSelectBlockFromInventory = (block: BlockType) => {
    setHotbarBlocks((prev) => {
      const next = [...prev];
      next[selectedSlot] = block;
      return next;
    });
  };

  // Command Execution Handler for chat
  const handleExecuteCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add command to chat log
    addChatMessage(trimmed, '#ffffff');

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === '/gamemode') {
      const mode = args[0]?.toLowerCase();
      if (mode === 'survival' || mode === '0' || mode === 's') {
        handleUpdateSettings({ isCreative: false });
        if (engineRef.current) {
          engineRef.current.player.isCreative = false;
          engineRef.current.player.isFlying = false;
        }
        addChatMessage('[Game] Set game mode to Survival Mode', '#55ff55');
      } else if (mode === 'creative' || mode === '1' || mode === 'c') {
        handleUpdateSettings({ isCreative: true });
        if (engineRef.current) {
          engineRef.current.player.isCreative = true;
          engineRef.current.player.isFlying = true;
        }
        addChatMessage('[Game] Set game mode to Creative Mode', '#55ff55');
      } else {
        addChatMessage('Usage: /gamemode <survival/creative>', '#ff5555');
      }
    } else if (command === '/time') {
      if (args[0]?.toLowerCase() === 'set') {
        const timeVal = args[1]?.toLowerCase();
        if (timeVal === 'day' || timeVal === 'noon' || timeVal === '1000' || timeVal === '6000') {
          handleSetTime(0.25);
          addChatMessage('[Game] Set the time to 6000 (Day)', '#55ff55');
        } else if (timeVal === 'night' || timeVal === 'midnight' || timeVal === '13000' || timeVal === '18000') {
          handleSetTime(0.75);
          addChatMessage('[Game] Set the time to 18000 (Night)', '#55ff55');
        } else if (timeVal === 'sunset') {
          handleSetTime(0.5);
          addChatMessage('[Game] Set the time to 12000 (Sunset)', '#55ff55');
        } else {
          addChatMessage('Usage: /time set <day/noon/sunset/night>', '#ff5555');
        }
      } else {
        addChatMessage('Usage: /time set <day/night>', '#ff5555');
      }
    } else if (command === '/tp') {
      const target = args[0]?.toLowerCase();
      if (target === 'mountain' || target === 'ocean' || target === 'caves' || target === 'river' || target === 'spawn') {
        handleTeleport(target as any);
        addChatMessage(`[Game] Teleported to ${target}`, '#55ff55');
      } else if (args.length >= 3) {
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        const z = parseFloat(args[2]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z) && engineRef.current) {
          engineRef.current.player.teleport(x, y, z);
          addChatMessage(`[Game] Teleported to ${x}, ${y}, ${z}`, '#55ff55');
        } else {
          addChatMessage('Invalid coordinates', '#ff5555');
        }
      } else {
        addChatMessage('Usage: /tp <mountain/ocean/caves/river/spawn> or /tp <x> <y> <z>', '#ff5555');
      }
    } else if (command === '/help') {
      addChatMessage('Commands: /gamemode <survival/creative>, /time set <day/night>, /tp <mountain/ocean/caves/river/spawn>', '#ffff55');
    } else {
      addChatMessage(`Unknown command: ${command}. Type /help for help.`, '#ff5555');
    }
  };

  // Update Settings handler
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      if (engineRef.current) {
        engineRef.current.updateSettings(newSettings);
      }
      return merged;
    });
  };

  // Teleport handler
  const handleTeleport = (landmark: 'mountain' | 'river' | 'caves' | 'pond' | 'ocean' | 'spawn') => {
    if (engineRef.current) {
      engineRef.current.teleportToLandmark(landmark);
    }
  };

  // Set time of day
  const handleSetTime = (val: number) => {
    if (engineRef.current) {
      engineRef.current.setTime(val);
    }
  };

  // Regenerate World with new seed
  const handleRegenerateWorld = (seed: number) => {
    setCurrentSeed(seed);
  };

  // Start game from Main Menu
  const handleStartGame = () => {
    setIsMainMenuOpen(false);
    setTimeout(() => {
      handleLockPointer();
    }, 100);
  };

  // Mobile virtual joystick movement
  const handleMobileMove = (dx: number, dy: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    const threshold = 0.25;
    engine.input.right = dx > threshold;
    engine.input.left = dx < -threshold;
    engine.input.backward = dy > threshold;
    engine.input.forward = dy < -threshold;
  };

  const handleMobileLook = (dx: number, dy: number) => {
    if (engineRef.current) {
      engineRef.current.player.onMouseMove(dx * 1.5, dy * 1.5);
    }
  };

  const handleMobileJump = (pressed: boolean) => {
    if (engineRef.current) {
      engineRef.current.input.jump = pressed;
    }
  };

  const handleMobileBreak = () => {
    if (engineRef.current) {
      engineRef.current.breakTargetedBlock();
    }
  };

  const handleMobilePlace = () => {
    if (engineRef.current) {
      const blockToPlace = hotbarBlocks[selectedSlot];
      engineRef.current.placeBlockOnTarget(blockToPlace);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Three.js 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleLockPointer}
        className="w-full h-full cursor-crosshair"
      />

      {/* Main Menu Screen (Craftmine Beta 1.2) */}
      {isMainMenuOpen && (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Clean Minecraft HUD - only coords, item name, and texture hotbar */}
      {!isMainMenuOpen && (
        <HUD
          hotbarBlocks={hotbarBlocks}
          selectedSlot={selectedSlot}
          onSelectSlot={(slot) => setSelectedSlot(slot)}
          playerPos={playerPos}
          isLocked={isLocked}
          onLockPointer={handleLockPointer}
        />
      )}

      {/* Minecraft Command & Chat Line (triggered by / key) */}
      <ChatOverlay
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setTimeout(() => handleLockPointer(), 80);
        }}
        onExecuteCommand={handleExecuteCommand}
        messages={chatMessages}
      />

      {/* Mobile Touch Controls Overlay - visible when game is active */}
      {!isMainMenuOpen && (
        <MobileControls
          onMove={handleMobileMove}
          onJumpStart={() => handleMobileJump(true)}
          onJumpEnd={() => handleMobileJump(false)}
          onBreak={handleMobileBreak}
          onPlace={handleMobilePlace}
          onLook={handleMobileLook}
          isCreative={settings.isCreative}
          isFlying={isFlying}
          onToggleFly={() => {
            if (engineRef.current && settings.isCreative) {
              engineRef.current.player.isFlying = !engineRef.current.player.isFlying;
              setIsFlying(engineRef.current.player.isFlying);
            }
          }}
        />
      )}

      {/* Creative Inventory Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        onSelectBlock={handleSelectBlockFromInventory}
        selectedBlock={hotbarBlocks[selectedSlot]}
      />

      {/* Settings & Teleport Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onSetTime={handleSetTime}
        onTeleport={handleTeleport}
        onRegenerateWorld={handleRegenerateWorld}
        currentSeed={currentSeed}
      />
    </div>
  );
};

