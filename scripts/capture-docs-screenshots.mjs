import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const outDir = path.resolve("docs/images");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(25000);
page.on("console", (msg) => {
  if (msg.type() === "error") {
    console.error("page error:", msg.text());
  }
});

async function waitForCharts(min = 1) {
  await page.waitForFunction(
    (needed) => document.querySelectorAll("svg.recharts-surface").length >= needed,
    min
  );
  await page.waitForTimeout(1200);
}

async function shot(name, url, readyText, chartCount, afterReady) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByText(readyText).first().waitFor();
  if (chartCount > 0) {
    await waitForCharts(chartCount);
  } else {
    await page.waitForTimeout(600);
  }
  if (afterReady) {
    await afterReady();
  }
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`wrote ${file}`);
}

async function selectRelease(release) {
  const firstChart = page.locator(".recharts-responsive-container").first();
  const labels = await firstChart.locator(".recharts-xAxis .recharts-cartesian-axis-tick text").allTextContents();
  const index = labels.findIndex((text) => text.trim() === release);
  if (index < 0) {
    throw new Error(`Could not find ${release} on the phase chart`);
  }
  await firstChart.locator("circle.recharts-dot").nth(index).click();
  await page.getByText(`Open / Closure Daily Trend · ${release}`).waitFor();
  await page.getByText("Hide milestones").waitFor();
  await waitForCharts(5);
}

try {
  await shot("overview.png", "http://127.0.0.1:3000/", "Quality Maturity", 0);
  await shot("productivity.png", "http://127.0.0.1:3000/productivity", "SP / Capacity Day", 1);
  await shot("quality.png", "http://127.0.0.1:3000/quality", "Defects by Severity", 5);
  await shot("quality-release.png", "http://127.0.0.1:3000/quality", "Defects by Phase and DRE", 5, async () => {
    await selectRelease("R12");
  });
  await shot("maturity.png", "http://127.0.0.1:3000/maturity", "Code Coverage Trend", 3);
} finally {
  await browser.close();
}
