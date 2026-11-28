"use client";

import React from "react";
import { SlideOverDrawer } from "./SlideOverDrawer";

export interface DetailDrawerProps {
  title: React.ReactNode;
  subtitle?: string;
  statusBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  widthClass?: string;
  isDirty?: boolean;
  children: React.ReactNode;
}

export function DetailDrawer({
  title,
  subtitle,
  statusBadge,
  headerActions,
  footer,
  onClose,
  onBack,
  widthClass = "max-w-lg",
  isDirty = false,
  children,
}: DetailDrawerProps) {
  return (
    <SlideOverDrawer
      title={
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {statusBadge}
        </span>
      }
      subtitle={subtitle}
      headerActions={headerActions}
      onClose={onClose}
      onBack={onBack}
      widthClass={widthClass}
      isDirty={isDirty}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6 space-y-4">{children}</div>
        {footer ? (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </SlideOverDrawer>
  );
}

export default DetailDrawer;
