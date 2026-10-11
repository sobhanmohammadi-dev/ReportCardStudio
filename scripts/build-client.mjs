// Bundles the browser app with esbuild and injects the package version.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const watch = process.argv.includes("--minify");

await build({
  entryPoints: ["src/client/main.ts"],
  bundle: true,
  outfile: "static/js/app.js",
  target: "es2020",
  format: "iife",
  minify: watch,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
console.log(`client bundle built (v${pkg.version})`);
