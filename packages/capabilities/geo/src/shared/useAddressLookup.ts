import { useCallback, useEffect, useRef, useState } from "react";
import type { AddressSuggestion, AddressValue, SearchAddressesResult } from "../types.js";

const ADDRESS_LOOKUP_TIMEOUT_MS = 2500;
const DEBOUNCE_MS = 300;

export interface UseAddressLookupOptions {
  initialQuery?: string;
  onSearch: (query: string) => Promise<SearchAddressesResult>;
  onSelect: (address: AddressValue) => void;
}

export function useAddressLookup({ initialQuery = "", onSearch, onSelect }: UseAddressLookupOptions) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (manualMode || trimmed.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    const seq = ++requestSeqRef.current;
    const debounceId = setTimeout(async () => {
      setIsSearching(true);
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("GEO_TIMEOUT")), ADDRESS_LOOKUP_TIMEOUT_MS);
        });
        const result = await Promise.race([onSearch(trimmed), timeoutPromise]);
        if (requestSeqRef.current !== seq) return;
        setSuggestions(result.suggestions);
        setHasSearched(true);
      } catch {
        if (requestSeqRef.current !== seq) return;
        setSuggestions([]);
        setTimedOut(true);
        setManualMode(true);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (requestSeqRef.current === seq) setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceId);
  }, [query, manualMode, onSearch]);

  const handleSelectSuggestion = useCallback(
    (s: AddressSuggestion) => {
      setQuery(s.label);
      setSuggestions([]);
      setHasSearched(false);
      onSelect({
        streetLine: s.streetLine,
        suburb: s.suburb,
        state: s.state,
        postcode: s.postcode,
        country: s.country,
        lat: s.lat,
        lng: s.lng,
      });
    },
    [onSelect]
  );

  const toggleManualMode = useCallback(() => {
    setManualMode((prev) => !prev);
    setTimedOut(false);
    setSuggestions([]);
    setHasSearched(false);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isSearching,
    manualMode,
    timedOut,
    hasSearched,
    handleSelectSuggestion,
    toggleManualMode,
  };
}
