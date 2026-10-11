import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/server/app.ts";
import { createSampleExcel } from "../src/server/excel.ts";

process.env.QUIET = "1";
let server: http.Server;
let base = "";

before(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

const upload = async (name: string, data: BlobPart, query = "") => {
  const fd = new FormData();
  fd.append("file", new Blob([data]), name);
  return (await fetch(`${base}/api/excel/parse${query}`, { method: "POST", body: fd })).json() as Promise<any>;
};

test("serves the app shell, assets and a health endpoint", async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Report Card Studio/);
  assert.equal((await fetch(`${base}/static/css/report.css`)).status, 200);
  assert.equal((await fetch(`${base}/static/js/app.js`)).status, 200);
  assert.equal((await fetch(`${base}/fonts/Vazirmatn.woff2`)).status, 200);
  const health = (await (await fetch(`${base}/api/health`)).json()) as any;
  assert.equal(health.ok, true);
  assert.match(health.version, /^\d+\.\d+\.\d+/);
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});

test("parses an uploaded workbook", async () => {
  const res = await upload("grades.xlsx", new Uint8Array(await createSampleExcel("en")));
  assert.equal(res.ok, true);
  assert.equal(res.students.length, 4);
  assert.equal(res.subjects.length, 5);
});

test("rejects bad uploads with machine-readable codes", async () => {
  assert.equal((await upload("grades.xls", "x")).code, "bad_type");
  assert.equal((await upload("grades.xlsx", "not a zip")).code, "parse_failed");
  const none = (await (await fetch(`${base}/api/excel/parse`, { method: "POST" })).json()) as any;
  assert.equal(none.code, "no_file");
  const big = await upload("big.xlsx", new Uint8Array(10 * 1024 * 1024 + 10));
  assert.equal(big.code, "too_large");
});

test("sample download is a valid xlsx in both languages", async () => {
  for (const lang of ["en", "fa"]) {
    const res = await fetch(`${base}/sample.xlsx?lang=${lang}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-disposition") ?? "", new RegExp(`sample_${lang}\\.xlsx`));
    const buf = new Uint8Array(await res.arrayBuffer());
    assert.equal(String.fromCharCode(buf[0], buf[1]), "PK", "xlsx files are zip archives");
  }
});
