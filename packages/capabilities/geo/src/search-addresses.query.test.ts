import { describe, expect, it, vi } from "vitest";
import { searchAddressesQuery } from "./search-addresses.query.js";
import { createGeoRouter } from "./router/index.js";

describe("searchAddressesQuery", () => {
  it("maps Photon GeoJSON features into AddressSuggestion items", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [144.9631, -37.8136] },
            properties: {
              osm_id: 12345,
              osm_type: "N",
              housenumber: "123",
              street: "Collins Street",
              city: "Melbourne",
              state: "VIC",
              postcode: "3000",
              country: "Australia",
              countrycode: "au",
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await searchAddressesQuery(
      { query: "123 Collins Street", countryCode: "AU", limit: 5 },
      { rateLimitKey: "tenant-test-1", fetchFn: fetchMock }
    );

    expect(result.rateLimited).toBe(false);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toEqual({
      id: "N-12345",
      label: "123 Collins Street, Melbourne, VIC 3000, Australia",
      streetLine: "123 Collins Street",
      suburb: "Melbourne",
      state: "VIC",
      postcode: "3000",
      country: "Australia",
      countryCode: "AU",
      lat: -37.8136,
      lng: 144.9631,
    });
  });

  it("returns empty suggestions when Photon returns non-OK response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const result = await searchAddressesQuery(
      { query: "Collins Street" },
      { rateLimitKey: "tenant-test-2", fetchFn: fetchMock }
    );
    expect(result).toEqual({ suggestions: [], rateLimited: false });
  });

  it("exposes searchAddresses procedure via createGeoRouter", () => {
    const queryFn = vi.fn((fn) => fn);
    const router = createGeoRouter({
      authenticatedProcedure: {
        input: () => ({ query: queryFn }),
      },
    });
    expect(typeof router.searchAddresses).toBe("function");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
