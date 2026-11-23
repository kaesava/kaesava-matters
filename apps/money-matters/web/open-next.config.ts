import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
	// Serve prerendered pages/RSC payloads from Workers static assets instead of
	// falling back to dummy incrementalCache (which forces per-request SSR + Batcher
	// promise sharing across concurrent requests in workerd).
	incrementalCache: staticAssetsIncrementalCache,
});
