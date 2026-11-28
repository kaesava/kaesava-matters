"use client";

import React from "react";
import { Menu } from "lucide-react";

export interface WorkspaceMobileHeaderProps {
  title?: string;
  brand?: React.ReactNode;
  onOpenMenu: () => void;
  menuAriaLabel?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function WorkspaceMobileHeader({
  title,
  brand,
  onOpenMenu,
  menuAriaLabel = "Open navigation menu",
  rightSlot,
  className = "",
}: WorkspaceMobileHeaderProps) {
  return (
    <header
      className={`md:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200 sticky top-0 z-30 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={menuAriaLabel}
          className="inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-[#1B2B4B] hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        {brand}
        {title && !brand && (
          <span className="text-base font-bold text-[#1B2B4B] truncate">{title}</span>
        )}
      </div>
      {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
    </header>
  );
}
