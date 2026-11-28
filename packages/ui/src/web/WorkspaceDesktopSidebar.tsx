"use client";

import React from "react";

export interface WorkspaceNavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

export interface WorkspaceDesktopSidebarProps {
  brand?: React.ReactNode;
  headerSlot?: React.ReactNode;
  navItems: readonly WorkspaceNavItem[];
  renderLink?: (
    item: WorkspaceNavItem,
    className: string,
    children: React.ReactNode
  ) => React.ReactNode;
  footerSlot?: React.ReactNode;
  className?: string;
}

export function WorkspaceDesktopSidebar({
  brand,
  headerSlot,
  navItems,
  renderLink,
  footerSlot,
  className = "",
}: WorkspaceDesktopSidebarProps) {
  return (
    <aside
      className={`hidden md:flex md:flex-col w-64 shrink-0 border-r border-slate-200 bg-white min-h-screen ${className}`}
    >
      {brand && (
        <div className="px-5 h-16 flex items-center border-b border-slate-100">{brand}</div>
      )}
      {headerSlot && <div className="px-4 py-3 border-b border-slate-100">{headerSlot}</div>}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const itemClass = `w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            item.active
              ? "bg-[#2563eb]/10 text-[#2563eb] font-semibold"
              : "text-[#1B2B4B] hover:bg-slate-50 font-medium"
          }`;
          const content = (
            <>
              <span className="flex items-center gap-2.5 min-w-0">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700">
                  {item.badge}
                </span>
              )}
            </>
          );
          if (renderLink && item.href) {
            return <React.Fragment key={item.id}>{renderLink(item, itemClass, content)}</React.Fragment>;
          }
          if (item.href) {
            return (
              <a key={item.id} href={item.href} onClick={item.onClick} className={itemClass}>
                {content}
              </a>
            );
          }
          return (
            <button key={item.id} type="button" onClick={item.onClick} className={itemClass}>
              {content}
            </button>
          );
        })}
      </nav>
      {footerSlot && <div className="p-4 border-t border-slate-100">{footerSlot}</div>}
    </aside>
  );
}
