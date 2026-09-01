import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      version: getAppVersion(),
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}
