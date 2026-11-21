"use client";

import React from "react";
import { Tabs } from "../Tabs";

export interface PlatformSettingsTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface PlatformSettingsShellProps {
  title: string;
  headerAction?: React.ReactNode;
  tabs: readonly PlatformSettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  footer?: React.ReactNode;
}

export function PlatformSettingsShell({
  title,
  headerAction,
  tabs,
  activeTab,
  onTabChange,
  footer,
}: PlatformSettingsShellProps) {
  return (
    <div className="flex flex-col gap-6 max-w-5xl pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{title}</h1>
        {headerAction}
      </div>
      <Tabs
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTab={activeTab}
        onChange={onTabChange}
      />
      {tabs.map((tab) => (
        <div key={tab.id} className={activeTab === tab.id ? "space-y-6" : "hidden"}>
          {tab.content}
        </div>
      ))}
      {footer}
    </div>
  );
}
