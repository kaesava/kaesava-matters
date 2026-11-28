"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Input } from "@kaesava/ui/web";
import type { AddressValue } from "../types.js";

export interface ManualAddressInputsProps {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  disabled?: boolean;
}

export function ManualAddressInputs({ value, onChange, disabled }: ManualAddressInputsProps) {
  const update = (field: keyof AddressValue) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [field]: e.target.value, lat: undefined, lng: undefined });
  };

  return (
    <div className="space-y-3">
      <Input
        label={t("geo.streetLabel")}
        placeholder={t("geo.streetPlaceholder")}
        value={value.streetLine}
        onChange={update("streetLine")}
        disabled={disabled}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label={t("geo.suburbLabel")}
          placeholder={t("geo.suburbPlaceholder")}
          value={value.suburb}
          onChange={update("suburb")}
          disabled={disabled}
        />
        <Input
          label={t("geo.stateLabel")}
          placeholder={t("geo.statePlaceholder")}
          value={value.state}
          onChange={update("state")}
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label={t("geo.postcodeLabel")}
          placeholder={t("geo.postcodePlaceholder")}
          value={value.postcode}
          onChange={update("postcode")}
          disabled={disabled}
        />
        <Input
          label={t("geo.countryLabel")}
          placeholder={t("geo.countryPlaceholder")}
          value={value.country}
          onChange={update("country")}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
