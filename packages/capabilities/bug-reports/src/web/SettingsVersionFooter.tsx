"use client";

import React from "react";

export interface SettingsVersionFooterProps {
  appName: string;
  formattedVersion: string;
  channel?: string;
  onCopyDiagnostics: () => void;
}

export function SettingsVersionFooter({
  appName,
  formattedVersion,
  channel,
  onCopyDiagnostics,
}: SettingsVersionFooterProps) {
  return (
    <button
      type="button"
      onClick={onCopyDiagnostics}
      className="w-full py-3 text-center text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
    >
      {channel ? `${appName} ${formattedVersion} • ${channel}` : `${appName} ${formattedVersion}`}
    </button>
  );
}
