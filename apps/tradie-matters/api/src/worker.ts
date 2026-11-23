import {
  createPlatformWorker,
  handleResetPasswordRequest,
  handleDevCallbackRequest,
  type PlatformWorkerEnvBase,
} from "@kaesava/core/worker";
import { registerTradieMattersApp, TRADIE_MATTERS_APP_ID } from "./manifest.js";

export interface TradieWorkerEnv extends PlatformWorkerEnvBase {
  TRADIE_MATTERS_APP_ID?: string;
}

registerTradieMattersApp();

export default createPlatformWorker<TradieWorkerEnv>({
  resolveDefaultAppId: (env) => env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID,
  onInitEnv: () => {
    registerTradieMattersApp();
  },
  routes: [
    ({ url, env, baseHeaders }) =>
      url.pathname === "/reset-password"
        ? handleResetPasswordRequest(url, baseHeaders, env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID)
        : null,
    ({ url, isDev, env, baseHeaders }) =>
      url.pathname.startsWith("/dev-callback")
        ? handleDevCallbackRequest(url, isDev, baseHeaders, env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID)
        : null,
  ],
});
