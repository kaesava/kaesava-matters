import { checkRateLimit } from "@kaesava/core";
import { z } from "zod";
import type {
  AddressSuggestion,
  SearchAddressesInputType,
  SearchAddressesResult,
} from "./types.js";

const PHOTON_ENDPOINT = "https://photon.komoot.io/api";
const PHOTON_TIMEOUT_MS = 2500;
const GEO_RATE_LIMIT_MAX = 30;
const GEO_RATE_LIMIT_WINDOW_SEC = 60;

const PhotonFeatureSchema = z.object({
  geometry: z.object({
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z.object({
    osm_id: z.number().optional(),
    osm_type: z.string().optional(),
    name: z.string().optional(),
    housenumber: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    village: z.string().optional(),
    suburb: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    countrycode: z.string().optional(),
  }),
});

const PhotonResponseSchema = z.object({
  features: z.array(PhotonFeatureSchema).default([]),
});

type PhotonFeature = z.infer<typeof PhotonFeatureSchema>;

export interface SearchAddressesOptions {
  rateLimitKey: string;
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string };
  fetchFn?: typeof fetch;
}

function buildStreetLine(props: PhotonFeature["properties"]): string {
  const streetPart = [props.housenumber, props.street].filter(Boolean).join(" ").trim();
  if (streetPart) return streetPart;
  return props.name?.trim() ?? "";
}

function mapPhotonFeature(feature: PhotonFeature, index: number): AddressSuggestion {
  const { properties: p, geometry } = feature;
  const streetLine = buildStreetLine(p);
  const suburb = (p.city ?? p.town ?? p.village ?? p.suburb ?? p.district ?? "").trim();
  const state = (p.state ?? "").trim();
  const postcode = (p.postcode ?? "").trim();
  const country = (p.country ?? "").trim();
  const labelParts = [streetLine, suburb, [state, postcode].filter(Boolean).join(" "), country].filter(Boolean);
  const id = p.osm_id ? `${p.osm_type ?? "osm"}-${p.osm_id}` : `photon-${index}`;
  return {
    id,
    label: labelParts.join(", "),
    streetLine,
    suburb,
    state,
    postcode,
    country,
    countryCode: (p.countrycode ?? "").toUpperCase(),
    lng: geometry.coordinates[0],
    lat: geometry.coordinates[1],
  };
}

function buildPhotonUrl(input: SearchAddressesInputType): string {
  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set("q", input.query.trim());
  url.searchParams.set("limit", String(input.limit ?? 5));
  url.searchParams.set("lang", "en");
  return url.toString();
}

async function fetchPhotonFeatures(
  url: string,
  fetchFn: typeof fetch
): Promise<PhotonFeature[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);
  try {
    const res = await fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const parsed = PhotonResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data.features : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stateless OSM Photon address lookup proxy with Upstash rate limiting.
 */
export async function searchAddressesQuery(
  input: SearchAddressesInputType,
  opts: SearchAddressesOptions
): Promise<SearchAddressesResult> {
  const { allowed } = await checkRateLimit(
    `geo:search:${opts.rateLimitKey}`,
    GEO_RATE_LIMIT_MAX,
    GEO_RATE_LIMIT_WINDOW_SEC,
    opts.env
  );
  if (!allowed) return { suggestions: [], rateLimited: true };

  const features = await fetchPhotonFeatures(buildPhotonUrl(input), opts.fetchFn ?? fetch);
  const mapped = features.map(mapPhotonFeature).filter((s) => s.label.length > 0);
  const cc = input.countryCode?.toUpperCase();
  const suggestions = cc
    ? mapped.filter((s) => !s.countryCode || s.countryCode === cc)
    : mapped;
  return { suggestions, rateLimited: false };
}
