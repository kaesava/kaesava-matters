import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import MobileInput from './Input';
import { FormLabel } from './FormLabel';
import { ChipSelect } from './ChipSelect';

export interface MobileLocationOption {
  value: string;
  label: string;
}

export interface MobileLocationFieldsProps {
  country: string;
  onCountryChange: (value: string) => void;
  countryOptions: readonly MobileLocationOption[];
  countryLabel: string;
  region: string;
  onRegionChange: (value: string) => void;
  regionLabel: string;
  regionPlaceholder?: string;
  postcode: string;
  onPostcodeChange: (value: string) => void;
  postcodeLabel: string;
  postcodePlaceholder?: string;
}

export function MobileLocationFields({
  country,
  onCountryChange,
  countryOptions,
  countryLabel,
  region,
  onRegionChange,
  regionLabel,
  regionPlaceholder,
  postcode,
  onPostcodeChange,
  postcodeLabel,
  postcodePlaceholder,
}: MobileLocationFieldsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <FormLabel>{countryLabel}</FormLabel>
        <ChipSelect
          value={country}
          onChange={onCountryChange}
          options={countryOptions.map((o) => ({ value: o.value, label: o.label }))}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <MobileInput
            label={regionLabel}
            value={region}
            onChangeText={onRegionChange}
            placeholder={regionPlaceholder}
          />
        </View>
        <View style={styles.col}>
          <MobileInput
            label={postcodeLabel}
            value={postcode}
            onChangeText={onPostcodeChange}
            placeholder={postcodePlaceholder}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: DESIGN_TOKENS.spacing.stackGap,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: DESIGN_TOKENS.spacing.stackGap,
  },
  col: {
    flex: 1,
  },
});
