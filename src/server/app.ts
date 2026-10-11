import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { createSampleExcel, ExcelParseError, parseExcel } from "./excel";

/**
 * Project root = nearest ancestor holding templates/index.html. Walking up (instead of a fixed `../..`)
 * keeps this correct for tsc output, the esbuild bundle and the single-file executable alike.
 */
function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "templates", "index.html"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return path.join(__dirname, "..", "..");
}
export const ROOT = findRoot();
const MAX_UPLOAD = 10 * 1024 * 1024;

function readVersion(): string {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
export const APP_VERSION = readVersion();

function logRequests(req: Request, res: Response, next: NextFunction): void {
  if (process.env.QUIET === "1") return next();
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${ms.toFixed(1)}ms`);
  });
  next();
}

const fail = (res: Response, code: string, detail?: string) =>
  res.json({ ok: false, code, detail: detail ?? null });

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(logRequests);

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD } });

  const indexHtml = fs.readFileSync(path.join(ROOT, "templates", "index.html"), "utf8");
  app.get("/", (_req, res) => res.type("html").send(indexHtml));
  app.get("/api/health", (_req, res) => res.json({ ok: true, version: APP_VERSION }));

  app.post(
    "/api/excel/parse",
    (req, res, next) =>
      upload.single("file")(req, res, (err: unknown) => {
        if (err) {
          fail(res, (err as multer.MulterError).code === "LIMIT_FILE_SIZE" ? "too_large" : "no_file");
          return;
        }
        next();
      }),
    async (req, res) => {
      const file = req.file;
      if (!file) return fail(res, "no_file");
      if (!file.originalname.toLowerCase().endsWith(".xlsx")) return fail(res, "bad_type");
      try {
        const { subjects, students } = await parseExcel(file.buffer);
        console.log(`Parsed Excel: ${students.length} students, ${subjects.length} subjects`);
        res.json({ ok: true, subjects, students });
      } catch (e) {
        if (e instanceof ExcelParseError) return fail(res, e.code, e.detail);
        console.log(`Excel parse failure: ${(e as Error).message}`);
        fail(res, "parse_failed");
      }
    },
  );

  app.get("/sample.xlsx", async (req, res) => {
    try {
      const lang = req.query.lang === "fa" ? "fa" : "en";
      const buf = await createSampleExcel(lang);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=sample_${lang}.xlsx`);
      res.send(buf);
    } catch (e) {
      console.log(`Sample generation failed: ${(e as Error).message}`);
      res.status(500).send("Error generating sample file");
    }
  });

  app.use("/fonts", express.static(path.join(ROOT, "fonts")));
  app.use("/static", express.static(path.join(ROOT, "static")));
  app.use((_req, res) => res.status(404).send("Not found"));
  return app;
}
