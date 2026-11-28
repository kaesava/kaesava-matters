import type { AnyProcedure } from "@trpc/server";
import { createGeoRouter, type GeoProcedureBuilder } from "@kaesava/capability-geo/router";
import { authenticatedProcedure } from "../trpc/trpc.js";

export const geoRouter = createGeoRouter<AnyProcedure>({
  authenticatedProcedure: authenticatedProcedure as unknown as GeoProcedureBuilder<AnyProcedure>,
});
