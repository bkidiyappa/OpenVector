import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { loadConfig } from "./config.js";
import { formatStartupMessages, loadAllData } from "./data/data-service.js";
import { registerRoutes } from "./api/routes.js";

const PORT = Number(process.env.PORT ?? 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

const { config, source } = loadConfig(process.cwd());
const data = loadAllData(config, process.cwd());

if (data.messages.length > 0) {
  console.log(formatStartupMessages(data.messages));
  console.log("");
}

const app = express();
app.use(cors());
app.use(express.json());
registerRoutes(app, config, data);

const distDir = path.resolve(projectRoot, "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log("OpenVector");
  console.log("CSV → Metrics → Dashboard");
  console.log("");
  console.log(`Config: ${source ?? "built-in defaults"}`);
  console.log(`Data:   ${path.resolve(process.cwd(), config.data.path)}`);
  console.log(`URL:    http://127.0.0.1:${PORT}`);
});
