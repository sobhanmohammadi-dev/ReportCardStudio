// Replaces the OWNER/REPO placeholder with your GitHub repository, e.g.:
//   node scripts/set-repo.mjs acme/report-card-studio
import { readFileSync, writeFileSync } from "node:fs";

const slug = process.argv[2];
if (!/^[\w.-]+\/[\w.-]+$/.test(slug ?? "")) {
  console.error("Usage: node scripts/set-repo.mjs <owner/repo>");
  process.exit(2);
}
for (const file of ["README.md", "package.json", "CONTRIBUTING.md", "CHANGELOG.md"]) {
  const before = readFileSync(file, "utf8");
  const after = before.replaceAll("OWNER/REPO", slug);
  if (after !== before) writeFileSync(file, after);
}
console.log(`Repository set to ${slug}`);
