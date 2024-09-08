"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import ConnectButton from "./ConnectButton";
import { useState, useEffect } from "react";
import { useWeb3ModalTheme } from '@web3modal/ethers/react';
import Image from 'next/image';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { setThemeMode: setWeb3ModalTheme, setThemeVariables } = useWeb3ModalTheme()
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (theme) {
      // Sync Web3Modal theme with app theme
      setWeb3ModalTheme(theme as 'light' | 'dark')
    }
  }, [theme])

  if (!mounted) {
    return null;
  }

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-10
        flex justify-between items-center p-4
        bg-background text-foreground
        transition-all duration-300
        ${isScrolled ? 'bg-white/70 dark:bg-black/50 backdrop-blur-sm shadow-sm' : ''}
        ${className}
      `}
    >
      <div className="flex items-center">
        <Image src="/logo.webp" alt="Onboard Agent Logo" width={40} height={40} />
        <h1 className="text-2xl font-bold ml-2">Onboard Agent</h1>
      </div>
      <div className="flex items-center space-x-2">
        <ConnectButton />
        <Sun className="h-5 w-5" />
        <Switch
          checked={theme === "dark"}
          onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <Moon className="h-5 w-5" />
      </div>
    </nav>
  );
};
