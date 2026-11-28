"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, Input } from "@kaesava/ui/web";

export interface ChatThreadMessageItem {
  id: string;
  senderName: string;
  body: string;
  createdAtLabel: string;
}

export interface ChatThreadPanelProps {
  title?: string;
  messages: ChatThreadMessageItem[];
  isSending?: boolean;
  onSendMessage: (body: string) => Promise<void> | void;
  onMarkRead?: () => Promise<void> | void;
}

export function ChatThreadPanel({
  title,
  messages,
  isSending = false,
  onSendMessage,
  onMarkRead,
}: ChatThreadPanelProps) {
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isSending) return;
    await onSendMessage(trimmed);
    setBody("");
  };

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1B2B4B] dark:text-slate-100">
          {title || t("chat.title")}
        </h3>
        {onMarkRead ? (
          <Button type="button" variant="secondary" size="sm" onClick={onMarkRead}>
            {t("chat.markReadCta")}
          </Button>
        ) : null}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 max-h-80">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("chat.emptyState")}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{msg.senderName}</span>
                <span>{msg.createdAtLabel}</span>
              </div>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{msg.body}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-3">
        <Input
          value={body}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBody(e.target.value)}
          placeholder={t("chat.messagePlaceholder")}
          className="flex-1"
        />
        <Button type="submit" variant="primary" loading={isSending} disabled={!body.trim()}>
          {t("chat.sendCta")}
        </Button>
      </form>
    </section>
  );
}
