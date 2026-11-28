import { z } from "zod";

export const SearchAddressesInput = z
  .object({
    query: z.string().trim().min(3).max(200),
    countryCode: z.string().trim().length(2).optional(),
    limit: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export type SearchAddressesInputType = z.infer<typeof SearchAddressesInput>;

export interface AddressSuggestion {
  id: string;
  label: string;
  streetLine: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
}

export interface AddressValue {
  streetLine: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface SearchAddressesResult {
  suggestions: AddressSuggestion[];
  rateLimited: boolean;
}
