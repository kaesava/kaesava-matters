import { createFileNotesProxyHandlers } from "@kaesava/core/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, PUT } = createFileNotesProxyHandlers({
  defaultDevApiUrl: "http://127.0.0.1:3011",
});
