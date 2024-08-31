"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import ConnectButton from "./ConnectButton";
import { useState, useEffect } from "react";

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <nav
      className={`flex justify-between items-center p-4 bg-background text-foreground ${className}`}
    >
      <h1 className="text-2xl font-bold">Onboard Agent</h1>
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
