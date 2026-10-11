// Cross-platform test runner: expands test/*.test.ts without relying on shell globbing (Windows cmd, Node 20).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const files = readdirSync("test").filter((f) => f.endsWith(".test.ts")).map((f) => `test/${f}`);
const r = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
