import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export function GET() {
  const version = getAppVersion();
  const source = `
const VERSION = ${JSON.stringify(version)};
const OWNED_CACHE_PREFIX = "constellation-invoice-";

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(OWNED_CACHE_PREFIX))
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) => client.postMessage({ type: "PWA_ACTIVATED", version: VERSION }));
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "PWA_VERSION", version: VERSION });
  }
});
`;

  return new Response(source.trimStart(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'",
    },
  });
}
