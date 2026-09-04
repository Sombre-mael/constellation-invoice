import { ImageResponse } from "next/og";

const supportedSizes = new Set([180, 192, 512]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: rawSize } = await params;
  const parsedSize = Number(rawSize);
  const size = supportedSizes.has(parsedSize) ? parsedSize : 512;
  const maskable = new URL(request.url).searchParams.has("maskable");
  const markSize = Math.round(size * (maskable ? 0.48 : 0.6));

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #07132e 0%, #102145 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#f4c83f",
            border: `${Math.max(3, Math.round(size * 0.012))}px solid #fff1a6`,
            borderRadius: "50%",
            boxShadow: "0 24px 70px rgba(2, 7, 20, 0.46)",
            color: "#07132e",
            display: "flex",
            fontFamily: "Georgia, serif",
            fontSize: Math.round(markSize * 0.5),
            height: markSize,
            justifyContent: "center",
            width: markSize,
          }}
        >
          ✦
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
