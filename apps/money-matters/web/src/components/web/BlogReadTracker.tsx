"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "../../lib/analytics";

/**
 * Fires opt-in blog_post_viewed analytics event once per article mount.
 */
export function BlogReadTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackAnalyticsEvent("blog_post_viewed", { slug });
  }, [slug]);

  return null;
}
