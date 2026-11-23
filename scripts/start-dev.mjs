#!/usr/bin/env node
/**
 * Cleanly starts only the core app dev servers (api, web, mobile) — excluding
 * Inngest and Drizzle Studio — and guarantees process-group teardown to prevent
 * runaway / orphaned child processes (workerd, next-server, Metro).
 *
 * Usage:
 *   pnpm start            Start api, web, and mobile
 *   pnpm start -- --clean Kill any stale processes on ports 3000/3001/8081 first
 *   pnpm stop             Stop any running dev servers tracked by this script
 */
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const productArg = process.argv.slice(2).find((a) => a.startsWith("--product="));
const product = productArg ? productArg.split("=")[1] : "money-matters";

const PRODUCT_SERVICES = {
  "money-matters": [
    { name: "api", color: "\x1b[36m", port: 3001, filter: "@money-matters/api" },
    { name: "web", color: "\x1b[32m", port: 3000, filter: "@money-matters/web" },
    { name: "mobile", color: "\x1b[35m", port: 8081, filter: "@money-matters/mobile" },
  ],
};

const SERVICES = PRODUCT_SERVICES[product];
if (!SERVICES) {
  console.error(`Unknown --product="${product}". Available: ${Object.keys(PRODUCT_SERVICES).join(", ")}`);
  process.exit(1);
}

const PID_FILE = path.join(os.tmpdir(), `${product}-dev-pids.json`);
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

function stopTrackedPids() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const pids = JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
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
      fs.unlinkSync(PID_FILE);
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

async function main() {
  if (isStopOnly) {
    const stopped = stopTrackedPids();
    if (!stopped) console.log("[stop] No tracked dev servers found.");
    return;
  }

  // Stop any previously tracked run before starting a new one
  stopTrackedPids();

  for (const svc of SERVICES) {
    if (await isPortInUse(svc.port)) {
      if (isClean) {
        console.log(`[start] Port ${svc.port} (${svc.name}) in use — freeing it...`);
        freePort(svc.port);
      } else {
        console.error(
          `[start] Port ${svc.port} (${svc.name}) is already in use. Run \`pnpm stop\` or \`pnpm start -- --clean\` to clear stale servers.`
        );
        process.exit(1);
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

  for (const svc of SERVICES) {
    const child = spawn("pnpm", ["--filter", svc.filter, "dev"], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    prefixStream(child.stdout, svc.name, svc.color, process.stdout);
    prefixStream(child.stderr, svc.name, svc.color, process.stderr);
    child.on("exit", (code, signal) => {
      if (!shuttingDown) {
        console.log(`${svc.color}[${svc.name}]${RESET} exited (code=${code}, signal=${signal})`);
      }
    });
    children.push({ name: svc.name, pid: child.pid, child });
  }

  fs.writeFileSync(
    PID_FILE,
    JSON.stringify(
      children.map(({ name, pid }) => ({ name, pid })),
      null,
      2
    )
  );
  console.log("[start] Running api (:3001), web (:3000), mobile (:8081). Press Ctrl+C to stop all.");
}

main().catch((err) => {
  console.error("[start] Fatal error:", err);
  process.exit(1);
});
