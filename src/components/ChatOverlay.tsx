import React, { useState, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  sender?: string;
  text: string;
  color?: string;
}

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string) => void;
  messages: ChatMessage[];
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
  messages,
}) => {
  const [inputVal, setInputVal] = useState('/');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputVal('/');
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // If chat is not open, do not render anything on screen (as requested: "chat only shows when press / do not show all the time")
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop all key events from propagating to game window (e.g. typing 'e' won't open inventory)
    e.stopPropagation();

    if (e.key === 'Enter') {
      const trimmed = inputVal.trim();
      if (trimmed) {
        onExecuteCommand(trimmed);
      }
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end p-4 font-minecraft select-none bg-black/35 pointer-events-auto"
      onClick={(e) => {
        // Clicking outside closes chat
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Messages container on bottom-left */}
      <div className="w-full max-w-lg mb-2 max-h-48 overflow-y-auto space-y-1">
        {messages.slice(-8).map((msg) => (
          <div
            key={msg.id}
            className="text-xs sm:text-sm px-2 py-0.5 rounded-xs bg-black/60 backdrop-blur-xs text-white mc-shadow break-words"
            style={{ color: msg.color || '#ffffff' }}
          >
            {msg.sender && <span className="text-yellow-400 font-bold">{msg.sender}: </span>}
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Command Input Box */}
      <div className="w-full max-w-xl flex items-center bg-black/85 border-2 border-white/50 px-2 py-1.5 shadow-2xl">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Type /placestructure, /locatebiome, /gamemode, or /help..."
          className="w-full bg-transparent text-white font-minecraft text-sm focus:outline-hidden placeholder-gray-400 mc-shadow"
        />
      </div>
    </div>
  );
};
