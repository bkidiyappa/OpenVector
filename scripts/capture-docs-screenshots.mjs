import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const outDir = path.resolve("docs/images");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(25000);

async function waitForCharts(min = 1) {
  await page.waitForFunction((needed) => {
    const ready = [...document.querySelectorAll("svg.recharts-surface")].filter((svg) => {
      const box = svg.getBoundingClientRect();
      return box.width > 80 && box.height > 80;
    });
    return ready.length >= needed;
  }, min);
}

async function open(url, readyText, chartCount = 0) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByText(readyText).first().waitFor();
  if (chartCount > 0) {
    await waitForCharts(chartCount);
  }
}

async function shot(name, doc) {
  const el = page.locator(`[data-doc="${doc}"]`).first();
  await el.scrollIntoViewIfNeeded();
  if (doc.startsWith("chart:")) {
    await page.waitForFunction((selector) => {
      const root = document.querySelector(selector);
      const svg = root?.querySelector("svg.recharts-surface");
      if (!svg) {
        return false;
      }
      const box = svg.getBoundingClientRect();
      return box.width > 80 && box.height > 80;
    }, `[data-doc="${doc}"]`);
    await page.waitForTimeout(400);
  }
  await page.mouse.move(0, 0);
  const file = path.join(outDir, name);
  await el.screenshot({ path: file });
  console.log(`wrote ${file}`);
}

async function selectRelease(release) {
  const firstChart = page.locator('[data-doc="chart:phase-dre"]');
  const labels = await firstChart.locator(".recharts-xAxis .recharts-cartesian-axis-tick text").allTextContents();
  const index = labels.findIndex((text) => text.trim() === release);
  if (index < 0) {
    throw new Error(`Could not find ${release} on the phase chart`);
  }
  await firstChart.locator("circle.recharts-dot").nth(index).click();
  await page.getByText(`Open / Closure Daily Trend · ${release}`).waitFor();
  await page.getByText("Hide milestones").waitFor();
  await waitForCharts(7);
}

try {
  await open("http://127.0.0.1:3000/", "Quality Maturity");
  await shot("overview-quality-maturity.png", "metric:Quality Maturity");
  await shot("overview-velocity.png", "metric:Velocity");
  await shot("overview-sp-capacity-day.png", "metric:SP / Capacity Day");
  await shot("overview-defect-leakage.png", "metric:Defect Leakage");
  await shot("overview-open-defects.png", "metric:Open Defects");
  await shot("overview-customer-defects.png", "metric:Customer Defects");
  await shot("overview-visible-copq.png", "metric:Visible COPQ");

  await open("http://127.0.0.1:3000/productivity", "SP / Capacity Day", 1);
  await shot("productivity-available-capacity.png", "metric:Available Capacity");
  await shot("productivity-completed-sp.png", "metric:Completed SP");
  await shot("productivity-sp-capacity-day.png", "metric:SP / Capacity Day");
  await shot("productivity-velocity-chart.png", "chart:velocity");

  await open("http://127.0.0.1:3000/quality", "Defects by Severity", 7);
  await shot("quality-defect-leakage.png", "metric:Defect Leakage");
  await shot("quality-visible-copq.png", "metric:Visible COPQ");
  await shot("quality-phase-dre.png", "chart:phase-dre");
  await shot("quality-daily-trend.png", "chart:daily-trend");
  await shot("quality-status.png", "chart:status");
  await shot("quality-severity.png", "chart:severity");
  await shot("quality-age.png", "chart:age");
  await shot("quality-origin.png", "chart:origin");
  await shot("quality-copq-release.png", "chart:copq-release");
  await selectRelease("R12");
  await shot("quality-daily-trend-r12.png", "chart:daily-trend");

  await open("http://127.0.0.1:3000/maturity", "Code Coverage Trend", 3);
  await shot("maturity-quality-maturity.png", "metric:Quality Maturity");
  await shot("maturity-automation-coverage.png", "metric:Automation Coverage");
  await shot("maturity-code-coverage.png", "metric:Code Coverage");
  await shot("maturity-code-quality.png", "metric:Code Quality");
  await shot("maturity-defect-leakage.png", "metric:Defect Leakage");
  await shot("maturity-normalized-scores.png", "chart:normalized-scores");
  await shot("maturity-coverage-trend.png", "chart:coverage-trend");
  await shot("maturity-quality-trend.png", "chart:quality-trend");

  for (const stale of [
    "overview.png",
    "productivity.png",
    "quality.png",
    "quality-release.png",
    "maturity.png",
    "quality-customer-defects.png",
    "quality-copq-trend.png",
    "quality-copq-phase.png",
    "quality-copq-severity.png"
  ]) {
    const file = path.join(outDir, stale);
    try {
      unlinkSync(file);
      console.log(`removed ${file}`);
    } catch {
      // already gone
    }
  }
  console.log(
    readdirSync(outDir)
      .filter((name) => name.endsWith(".png"))
      .sort()
      .join("\n")
  );
} finally {
  await browser.close();
}
