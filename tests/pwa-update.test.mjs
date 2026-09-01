import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestSource = await readFile(new URL("../src/app/manifest.ts", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../src/app/sw.js/route.ts", import.meta.url), "utf8");
const managerSource = await readFile(new URL("../src/components/pwa-manager.tsx", import.meta.url), "utf8");
const versionRouteSource = await readFile(new URL("../src/app/api/version/route.ts", import.meta.url), "utf8");

test("le manifeste conserve une identité et une portée racine stables", () => {
  assert.match(manifestSource, /id:\s*"\/"/);
  assert.match(manifestSource, /start_url:\s*"\/"/);
  assert.match(manifestSource, /scope:\s*"\/"/);
  assert.match(manifestSource, /display:\s*"standalone"/);
  assert.match(manifestSource, /pwa-icon\/192/);
  assert.match(manifestSource, /pwa-icon\/512/);
});

test("le service worker active les mises à jour sans figer les bundles Next.js", () => {
  assert.match(workerSource, /SKIP_WAITING/);
  assert.match(workerSource, /self\.skipWaiting\(\)/);
  assert.match(workerSource, /self\.clients\.claim\(\)/);
  assert.doesNotMatch(workerSource, /addEventListener\(["']fetch["']/);
});

test("le client vérifie les versions aux moments importants", () => {
  assert.match(managerSource, /updateViaCache:\s*"none"/);
  assert.match(managerSource, /\/api\/version/);
  assert.match(managerSource, /visibilitychange/);
  assert.match(managerSource, /addEventListener\("online"/);
  assert.match(managerSource, /setInterval/);
  assert.match(managerSource, /controllerchange/);
});

test("la version et le worker sont servis sans cache", () => {
  assert.match(versionRouteSource, /no-cache, no-store, must-revalidate/);
  assert.match(workerSource, /no-cache, no-store, must-revalidate/);
});
