import React, { useState, useEffect, useRef } from 'react';
import { Command } from '@/types/agent';
import { FarcasterLogo, LensLogo } from './logos';
import { Paintbrush } from 'lucide-react';

const COMMANDS: Command[] = [
  {
    name: '/cast_to_farcaster',
    description: 'Cast content to Farcaster',
    icon: <FarcasterLogo className="w-5 h-5" />,
  },
  {
    name: '/post_to_lens',
    description: 'Post content to Lens',
    icon: <LensLogo className="w-5 h-5" />,
  },
  {
    name: '/generate_nft',
    description: 'Generate a new NFT',
    icon: <Paintbrush className="w-5 h-5" />,
  },
];

interface CommandMenuProps {
  isOpen: boolean;
  onSelect: (command: Command) => void;
  onClose: () => void;
  inputValue: string;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({ isOpen, onSelect, onClose, inputValue }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
  
    const filteredCommands = COMMANDS.filter(command => 
      command.name.toLowerCase().includes(inputValue.slice(1).toLowerCase())
    );
  
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
  
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
            break;
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
            break;
          case 'Enter':
            e.preventDefault();
            onSelect(filteredCommands[selectedIndex]);
            break;
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      };
  
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, onSelect, onClose, filteredCommands]);
  
    useEffect(() => {
      setSelectedIndex(0);
    }, [inputValue]);
  
    if (!isOpen) return null;
  
    return (
      <div
        ref={menuRef}
        className="command-menu absolute bottom-full left-0 w-full max-h-64 overflow-y-auto mb-2 z-50"
      >
        {filteredCommands.map((command, index) => (
          <div
            key={command.name}
            className={`command-item flex items-center ${
              index === selectedIndex ? 'command-item-selected' : ''
            }`}
            onClick={() => onSelect(command)}
          >
            <div className="flex-shrink-0 mr-3">{command.icon}</div>
            <div className="flex-grow">
              <div className="font-semibold">{command.name}</div>
              <div className="text-sm opacity-70">{command.description}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };