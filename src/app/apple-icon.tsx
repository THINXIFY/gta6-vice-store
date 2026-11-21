import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the favicon's V mark with the sunset bar, on the dark brand ground. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 100%, rgba(255,87,154,0.35), #0c0912 70%)" }}>
        <svg width="132" height="132" viewBox="0 0 64 64">
          <path d="M13 13h10l9 22 9-22h10L37.5 45h-11z" fill="#fff4eb" />
          <rect x="19" y="49" width="26" height="4.5" rx="2.25" fill="#ff7a7c" />
        </svg>
      </div>
    ),
    size,
  );
}
