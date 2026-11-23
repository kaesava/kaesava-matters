#!/usr/bin/env node
/**
 * Cleanly starts and stops monorepo dev servers with guaranteed process-group
 * teardown (preventing orphaned workerd, next-server, Metro, or inngest processes).
 *
 * Modes:
 *   pnpm start            Money Matters API (:3001), Web (:3000), Mobile (:8081)
 *   pnpm start:tradie     Tradie Matters API (:3011), Web (:3010), Mobile (:8082)
 *   pnpm start:all        All 5 web+api+inngest servers (:3000, :3001, :3010, :3011, :8288)
 *   pnpm start -- --clean Kill any stale processes on target ports first
 *   pnpm stop             Stop running dev servers
 */
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const productArg = process.argv.slice(2).find((a) => a.startsWith("--product="));
const product = productArg ? productArg.split("=")[1] : "money-matters";

const INNGEST_SERVICE = {
  name: "inngest",
  color: "\x1b[33m",
  port: 8288,
  cmd: "npx",
  cmdArgs: [
    "inngest-cli@latest",
    "dev",
    "--no-discovery",
    "--poll-interval",
    "60",
    "-u",
    "http://127.0.0.1:3001/api/inngest",
    "-u",
    "http://127.0.0.1:3011/api/inngest",
  ],
  waitForHealthUrls: ["http://127.0.0.1:3001/health", "http://127.0.0.1:3011/health"],
};

const PRODUCT_SERVICES = {
  "money-matters": [
    { name: "mm:api", color: "\x1b[36m", port: 3001, extraPorts: [9229], filter: "@money-matters/api" },
    { name: "mm:web", color: "\x1b[32m", port: 3000, filter: "@money-matters/web" },
    { name: "mm:mobile", color: "\x1b[35m", port: 8081, filter: "@money-matters/mobile" },
  ],
  "tradie-matters": [
    { name: "tm:api", color: "\x1b[36m", port: 3011, extraPorts: [9230], filter: "@tradie-matters/api" },
    { name: "tm:web", color: "\x1b[32m", port: 3010, filter: "@tradie-matters/web" },
    { name: "tm:mobile", color: "\x1b[35m", port: 8082, filter: "@tradie-matters/mobile" },
  ],
  all: [
    { name: "mm:api", color: "\x1b[36m", port: 3001, extraPorts: [9229], filter: "@money-matters/api" },
    { name: "mm:web", color: "\x1b[32m", port: 3000, filter: "@money-matters/web" },
    { name: "tm:api", color: "\x1b[34m", port: 3011, extraPorts: [9230], filter: "@tradie-matters/api" },
    { name: "tm:web", color: "\x1b[35m", port: 3010, filter: "@tradie-matters/web" },
    INNGEST_SERVICE,
  ],
};

const SERVICES = PRODUCT_SERVICES[product];
if (!SERVICES) {
  console.error(
    `Unknown --product="${product}". Available: ${Object.keys(PRODUCT_SERVICES).join(", ")}`
  );
  process.exit(1);
}

const PID_FILE = path.join(os.tmpdir(), `${product}-dev-pids.json`);
const ALL_PID_FILES = Object.keys(PRODUCT_SERVICES).map((p) =>
  path.join(os.tmpdir(), `${p}-dev-pids.json`)
);
const RESET = "\x1b[0m";

const args = new Set(process.argv.slice(2));
const isStopOnly = args.has("--stop");
const isClean = args.has("--clean");

function killProcessGroup(pid, signal = "SIGTERM") {
  try {
    process.kill(-pid, signal);
  } catch {
    // Process group already exited
  }
}

function stopTrackedPids(pidFile = PID_FILE) {
  if (!fs.existsSync(pidFile)) return false;
  try {
    const pids = JSON.parse(fs.readFileSync(pidFile, "utf8"));
    for (const { name, pid } of pids) {
      if (typeof pid === "number") {
        console.log(`[stop] Sending SIGTERM to ${name} (pgid ${pid})`);
        killProcessGroup(pid, "SIGTERM");
      }
    }
    setTimeout(() => {
      for (const { pid } of pids) {
        if (typeof pid === "number") killProcessGroup(pid, "SIGKILL");
      }
    }, 2000).unref();
  } catch {
    // Ignore malformed PID file
  } finally {
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // Ignore
    }
  }
  return true;
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => resolve(err.code === "EADDRINUSE"))
      .once("listening", () => tester.close(() => resolve(false)))
      .listen(port, "127.0.0.1");
  });
}

function freePort(port) {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    // Ignore if fuser is unavailable
  }
}

function checkHttpReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealthUrls(urls, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const checks = await Promise.all(urls.map((u) => checkHttpReady(u)));
    if (checks.every(Boolean)) return true;
    await new Promise((r) => setTimeout(r, 750));
  }
  return false;
}

function triggerInngestPutSync(urls) {
  for (const url of urls) {
    const req = http.request(url, { method: "PUT", timeout: 3000 }, (res) => res.resume());
    req.on("error", () => {});
    req.end();
  }
}

function prefixStream(stream, label, color, target) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      target.write(`${color}[${label}]${RESET} ${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer.length > 0) {
      target.write(`${color}[${label}]${RESET} ${buffer}\n`);
    }
  });
}

function spawnService(svc, children, isShuttingDown) {
  const command = svc.cmd ?? "pnpm";
  const commandArgs = svc.cmdArgs ?? ["--filter", svc.filter, "dev"];
  const child = spawn(command, commandArgs, {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  prefixStream(child.stdout, svc.name, svc.color, process.stdout);
  prefixStream(child.stderr, svc.name, svc.color, process.stderr);
  child.on("exit", (code, signal) => {
    if (!isShuttingDown()) {
      console.log(`${svc.color}[${svc.name}]${RESET} exited (code=${code}, signal=${signal})`);
    }
  });
  children.push({ name: svc.name, pid: child.pid, child });
  fs.writeFileSync(
    PID_FILE,
    JSON.stringify(
      children.map(({ name, pid }) => ({ name, pid })),
      null,
      2
    )
  );
}

async function main() {
  if (isStopOnly) {
    const targetFiles = product === "all" ? ALL_PID_FILES : [PID_FILE];
    let stoppedAny = false;
    for (const f of targetFiles) {
      if (stopTrackedPids(f)) stoppedAny = true;
    }
    if (!stoppedAny) console.log("[stop] No tracked dev servers found.");
    return;
  }

  stopTrackedPids(PID_FILE);

  for (const svc of SERVICES) {
    const portsToCheck = [svc.port, ...(svc.extraPorts ?? [])];
    for (const p of portsToCheck) {
      if (await isPortInUse(p)) {
        if (isClean) {
          console.log(`[start] Port ${p} (${svc.name}) in use — freeing it...`);
          freePort(p);
        } else {
          console.error(
            `[start] Port ${p} (${svc.name}) is already in use. Run \`pnpm stop:all\` or append \`-- --clean\` to clear stale servers.`
          );
          process.exit(1);
        }
      }
    }
  }

  const children = [];
  let shuttingDown = false;

  const shutdown = (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[start] Shutting down (${reason})...`);
    for (const { child } of children) {
      if (child.pid) killProcessGroup(child.pid, "SIGTERM");
    }
    const forceTimer = setTimeout(() => {
      for (const { child } of children) {
        if (child.pid) killProcessGroup(child.pid, "SIGKILL");
      }
      try {
        fs.unlinkSync(PID_FILE);
      } catch {
        // Ignore
      }
      process.exit(0);
    }, 3000);
    forceTimer.unref();

    Promise.all(
      children.map(
        ({ child }) =>
          new Promise((resolve) => {
            if (child.exitCode !== null || child.signalCode !== null) return resolve();
            child.once("exit", resolve);
          })
      )
    ).then(() => {
      clearTimeout(forceTimer);
      try {
        fs.unlinkSync(PID_FILE);
      } catch {
        // Ignore
      }
      process.exit(0);
    });
  };

  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, () => shutdown(sig));
  }

  const immediateServices = SERVICES.filter((s) => !s.waitForHealthUrls);
  const deferredServices = SERVICES.filter((s) => s.waitForHealthUrls);

  for (const svc of immediateServices) {
    spawnService(svc, children, () => shuttingDown);
  }

  const summary = SERVICES.map((s) => `${s.name} (:${s.port})`).join(", ");
  console.log(`[start] Starting ${summary}. Press Ctrl+C to stop all.`);

  for (const svc of deferredServices) {
    console.log(
      `${svc.color}[${svc.name}]${RESET} Waiting for API Workers (${svc.waitForHealthUrls.join(", ")}) to come online before syncing...`
    );
    const ready = await waitForHealthUrls(svc.waitForHealthUrls);
    if (shuttingDown) return;
    if (!ready) {
      console.warn(
        `${svc.color}[${svc.name}]${RESET} Timed out waiting for API health checks; starting anyway...`
      );
    }
    spawnService(svc, children, () => shuttingDown);
  }
}

main().catch((err) => {
  console.error("[start] Fatal error:", err);
  process.exit(1);
});
