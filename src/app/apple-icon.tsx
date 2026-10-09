import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#111418", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="128" height="128" viewBox="0 0 34 34">
          <circle cx="17" cy="17" r="15" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="17" cy="17" r="10" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M11 17.5l4 4 8-9" fill="none" stroke="#FF6A4D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
