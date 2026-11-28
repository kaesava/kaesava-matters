"use client";

import React, { useState } from "react";
import { Check, Copy, Mail, MapPin, Phone } from "lucide-react";
import { t } from "@kaesava/i18n";

interface BaseContactLinkProps {
  label?: string;
  className?: string;
  onCopied?: (message: string) => void;
}

export interface PhoneActionLinkProps extends BaseContactLinkProps {
  phone: string;
}

export interface EmailActionLinkProps extends BaseContactLinkProps {
  email: string;
}

export interface AddressMapActionLinkProps extends BaseContactLinkProps {
  address: string;
}

function CopyButton({ value, onCopied }: { value: string; onCopied?: (msg: string) => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard?.writeText(value);
    const msg = t("contactLinks.copied");
    setCopied(true);
    onCopied?.(msg);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t("contactLinks.copied")}
      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

const LINK_CLS =
  "min-h-[44px] inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#2563eb] hover:bg-blue-50 no-underline transition-colors";

export function PhoneActionLink({ phone, label, className = "", onCopied }: PhoneActionLinkProps) {
  const sanitized = phone.replace(/[^\d+]/g, "");
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <a href={`tel:${sanitized}`} aria-label={t("contactLinks.call")} className={LINK_CLS}>
        <Phone className="w-4 h-4 shrink-0" />
        <span>{label ?? phone}</span>
      </a>
      <CopyButton value={phone} onCopied={onCopied} />
    </div>
  );
}

export function EmailActionLink({ email, label, className = "", onCopied }: EmailActionLinkProps) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <a href={`mailto:${email}`} aria-label={t("contactLinks.email")} className={LINK_CLS}>
        <Mail className="w-4 h-4 shrink-0" />
        <span>{label ?? email}</span>
      </a>
      <CopyButton value={email} onCopied={onCopied} />
    </div>
  );
}

export function AddressMapActionLink({
  address,
  label,
  className = "",
  onCopied,
}: AddressMapActionLinkProps) {
  const href = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("contactLinks.openMap")}
        className={LINK_CLS}
      >
        <MapPin className="w-4 h-4 shrink-0" />
        <span>{label ?? address}</span>
      </a>
      <CopyButton value={address} onCopied={onCopied} />
    </div>
  );
}
