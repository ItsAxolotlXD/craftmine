import React, { useRef, useState, useEffect } from 'react';
import { Pickaxe, Box, ArrowUp, Feather } from 'lucide-react';

interface MobileControlsProps {
  onMove: (dx: number, dy: number) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onBreak: () => void;
  onPlace: () => void;
  onLook: (dx: number, dy: number) => void;
  isCreative: boolean;
  isFlying: boolean;
  onToggleFly: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onJumpStart,
  onJumpEnd,
  onBreak,
  onPlace,
  onLook,
  isCreative,
  isFlying,
  onToggleFly,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number } | null>(null);

  // Check if touch device
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      setIsTouchDevice(true);
    }
  }, []);

  if (!isTouchDevice) return null;

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxRadius = rect.width / 2 - 10;

    let knobX = deltaX;
    let knobY = deltaY;

    if (distance > maxRadius) {
      knobX = (deltaX / distance) * maxRadius;
      knobY = (deltaY / distance) * maxRadius;
    }

    setKnobPos({ x: knobX, y: knobY });
    onMove(knobX / maxRadius, knobY / maxRadius);
  };

  // Right-screen swipe to look
  const handleLookTouchStart = (e: React.TouchEvent) => {
    if (lookTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current && lastLookPos.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        onLook(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lastLookPos.current = null;
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Right-half screen look-around swipe area */}
      <div
        className="absolute top-16 right-0 bottom-32 left-1/2 pointer-events-auto touch-none"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
      />

      {/* Left Virtual Joystick */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        className="absolute left-6 bottom-24 w-28 h-28 rounded-full bg-black/40 backdrop-blur-xs border-2 border-white/20 pointer-events-auto touch-none flex items-center justify-center shadow-lg"
      >
        <div
          className="w-12 h-12 rounded-full bg-white/40 border border-white/60 shadow-md"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: joystickTouchId.current === null ? 'transform 0.15s ease-out' : 'none',
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="absolute right-5 bottom-24 flex flex-col items-center gap-3 pointer-events-auto">
        {/* Fly Toggle (Creative) */}
        {isCreative && (
          <button
            onClick={onToggleFly}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white border shadow-lg active:scale-95 transition-transform ${
              isFlying ? 'bg-amber-600 border-amber-300' : 'bg-black/50 border-white/20'
            }`}
          >
            <Feather size={20} />
          </button>
        )}

        {/* Place Block */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onPlace();
          }}
          className="w-13 h-13 rounded-full bg-emerald-700/80 active:bg-emerald-600 border-2 border-emerald-400 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Place Block"
        >
          <Box size={22} />
        </button>

        {/* Break Block */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onBreak();
          }}
          className="w-13 h-13 rounded-full bg-rose-700/80 active:bg-rose-600 border-2 border-rose-400 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Break Block"
        >
          <Pickaxe size={22} />
        </button>

        {/* Jump Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onJumpStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onJumpEnd();
          }}
          className="w-14 h-14 rounded-full bg-sky-600/80 active:bg-sky-500 border-2 border-sky-300 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Jump"
        >
          <ArrowUp size={26} />
        </button>
      </div>
    </div>
  );
};
