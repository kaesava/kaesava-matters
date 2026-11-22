"use client";

import React from "react";
import { Plus } from "lucide-react";

export interface WebFloatingActionButtonProps {
  onClick: () => void;
  ariaLabel: string;
  icon?: React.ReactNode;
  dataTour?: string;
  className?: string;
}

/**
 * Generic mobile-viewport floating action button (`+` FAB) for Web.
 */
export function WebFloatingActionButton({
  onClick,
  ariaLabel,
  icon,
  dataTour,
  className = "",
}: WebFloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-tour={dataTour}
      className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:bg-blue-700 active:scale-95 md:hidden ${className}`}
    >
      {icon ?? <Plus className="h-6 w-6" />}
    </button>
  );
}
