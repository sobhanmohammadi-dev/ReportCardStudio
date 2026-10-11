import { spawn } from "child_process";
import http from "http";
import net from "net";
import { APP_VERSION, createApp } from "./app";

const DEFAULT_MIN_PORT = 8080;
const DEFAULT_MAX_PORT = 8090;

const HELP = `Report Card Studio v${APP_VERSION}

Usage: report-card-studio [options]

Options:
  -p, --port <n>    Listen on this port (default: first free port in ${DEFAULT_MIN_PORT}-${DEFAULT_MAX_PORT})
      --host <addr> Interface to bind (default: 127.0.0.1; use 0.0.0.0 to share on your network)
      --no-open     Do not open the browser automatically
  -v, --version     Print the version and exit
  -h, --help        Show this help

Environment: PORT, HOST, NO_BROWSER=1, QUIET=1 (silence request logs)
`;

interface Options {
  port: number | null;
  host: string;
  open: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    port: process.env.PORT ? Number(process.env.PORT) : null,
    host: process.env.HOST || "127.0.0.1",
    open: process.env.NO_BROWSER !== "1",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log(HELP);
      process.exit(0);
    } else if (a === "-v" || a === "--version") {
      console.log(APP_VERSION);
      process.exit(0);
    } else if (a === "-p" || a === "--port") o.port = Number(argv[++i]);
    else if (a === "--host") o.host = argv[++i];
    else if (a === "--no-open") o.open = false;
    else {
      console.error(`Unknown option: ${a}\n\n${HELP}`);
      process.exit(2);
    }
  }
  if (o.port !== null && (!Number.isInteger(o.port) || o.port < 0 || o.port > 65535)) {
    console.error("Invalid port number.");
    process.exit(2);
  }
  return o;
}

function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}

async function pickPort(o: Options): Promise<number> {
  if (o.port !== null) return (await isPortFree(o.port, o.host)) || o.port === 0 ? o.port : -1;
  for (let p = DEFAULT_MIN_PORT; p <= DEFAULT_MAX_PORT; p++) if (await isPortFree(p, o.host)) return p;
  return -1;
}

function openBrowser(url: string): void {
  setTimeout(() => {
    const [cmd, args] =
      process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];
    try {
      const child = spawn(cmd as string, args as string[], { stdio: "ignore", detached: true });
      child.on("error", () => console.log(`Could not open a browser. Please open ${url} manually.`));
      child.unref();
    } catch {
      console.log(`Could not open a browser. Please open ${url} manually.`);
    }
  }, 800);
}

function printBanner(url: string): void {
  const line = (s: string) => `\u2551 ${s.padEnd(54)} \u2551`;
  console.log(
    [
      "\u2554" + "\u2550".repeat(56) + "\u2557",
      line(`Report Card Studio  v${APP_VERSION}`),
      "\u2560" + "\u2550".repeat(56) + "\u2563",
      line(`URL:  ${url}`),
      line("Exit: Ctrl + C"),
      "\u255A" + "\u2550".repeat(56) + "\u255D",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const port = await pickPort(opts);
  if (port < 0) {
    console.error(opts.port !== null ? `ERROR: port ${opts.port} is not available.` : `ERROR: no free port between ${DEFAULT_MIN_PORT} and ${DEFAULT_MAX_PORT}.`);
    process.exit(1);
  }

  const server = http.createServer({ maxHeaderSize: 1 << 20 }, createApp());
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 120_000;

  const shutdown = () => {
    console.log("\nShutting down...");
    setTimeout(() => process.exit(0), 5_000).unref();
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, opts.host, () => {
    const actual = (server.address() as net.AddressInfo).port;
    const shown = opts.host === "0.0.0.0" || opts.host === "::" ? "localhost" : opts.host === "127.0.0.1" ? "localhost" : opts.host;
    const url = `http://${shown}:${actual}`;
    printBanner(url);
    if (opts.open) openBrowser(url);
  });
}

main().catch((e) => {
  console.error(`Server error: ${e}`);
  process.exit(1);
});
