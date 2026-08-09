import { ImageResponse } from "next/og";

export const alt = "RoCourse — Learn Luau & Roblox for Free";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a1120",
          color: "#ffffff",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: "#014ef8",
            }}
          />
          <div style={{ fontSize: 32, fontWeight: 700 }}>RoCourse</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.04 }}>
            Learn Luau &amp; Roblox
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.04 }}>
            for Free.
          </div>
          <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                backgroundColor: "#014ef8",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              100% free course
            </div>
            <div style={{ fontSize: 26, color: "#94a3b8", fontWeight: 600 }}>
              From zero to your first Roblox game
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          <span>52 lessons · Luau playground · No sign-up</span>
          <span>ro-course.vercel.app</span>
        </div>
      </div>
    ),
    size
  );
}
