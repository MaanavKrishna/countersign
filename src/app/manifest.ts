import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Countersign — prove it's really them",
    short_name: "Countersign",
    description: "Check any suspicious message before you act on it.",
    start_url: "/family",
    display: "standalone",
    background_color: "#E9EBEE",
    theme_color: "#111418",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    // Long-press the app icon: straight to the check, for when the phone is already ringing.
    shortcuts: [
      { name: "Who's calling?", short_name: "Who's calling?", url: "/family?check=1" },
      { name: "Check a message", short_name: "Check message", url: "/check" },
    ],
    // Android: appears in the system share sheet once installed.
    share_target: { action: "/share", method: "GET", enctype: "application/x-www-form-urlencoded", params: { title: "title", text: "text", url: "url" } },
  } as MetadataRoute.Manifest;
}
