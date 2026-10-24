// Captures every Aido surface at desktop and mobile sizes, signed in as the local test account.
// Usage: node scripts/screenshots.mjs <outDir> <signInUrl> <missionId>
import { mkdirSync } from "node:fs";

import puppeteer from "puppeteer-core";

const [, , outDir, signInUrl, missionId] = process.argv;
const BASE = "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text().slice(0, 200)));
page.on("pageerror", (error) => consoleErrors.push(String(error).slice(0, 200)));

await page.goto(signInUrl, { waitUntil: "networkidle0" });
console.log("signed in, landed on", new URL(page.url()).pathname);

async function shoot(name, path) {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewport(viewport);
    if (path) await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    await new Promise((resolve) => setTimeout(resolve, 400));
    await page.screenshot({ path: `${outDir}/${name}-${label}.png`, fullPage: true });
  }
  console.log("captured", name);
}

await shoot("asso-dashboard", "/fr/asso");
await shoot("asso-mission", `/fr/asso/missions/${missionId}?published=1`);
await shoot("asso-composer", "/fr/asso/missions/new");
await shoot("me", "/fr/me");
await shoot("home", "/fr");

async function ask(text) {
  await page.waitForSelector("#aido-message");
  await page.click("#aido-message");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await page.waitForFunction(
    () => ![...document.querySelectorAll("button")].some((button) => /Arrêter|Stop/.test(button.textContent ?? "")),
    { timeout: 120_000, polling: 500 },
  );
}

await page.setViewport(VIEWPORTS.desktop);
await page.goto(`${BASE}/fr`, { waitUntil: "networkidle0" });
await ask("Je m'appelle Camille, j'habite Paris 11e et je télétravaille. J'ai déjà eu un chien. J'aimerais accueillir un chien quelques semaines.");
await ask("Je n'ai pas d'animal en ce moment. Je peux commencer dès le 1er novembre, pour environ 4 semaines. Prépare ma candidature pour la mission sur Aido.");
for (const [label, viewport] of Object.entries(VIEWPORTS)) {
  await page.setViewport(viewport);
  await new Promise((resolve) => setTimeout(resolve, 600));
  await page.screenshot({ path: `${outDir}/chat-${label}.png`, fullPage: true });
}
console.log("captured chat");

await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
for (const [label, viewport] of Object.entries(VIEWPORTS)) {
  await page.setViewport(viewport);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.screenshot({ path: `${outDir}/chat-dark-${label}.png`, fullPage: false });
}
await page.goto(`${BASE}/fr/asso/missions/${missionId}`, { waitUntil: "networkidle0" });
await page.screenshot({ path: `${outDir}/asso-mission-dark-mobile.png`, fullPage: false });
console.log("captured dark mode");
console.log("console errors:", consoleErrors.length ? consoleErrors : "none");
await browser.close();
