import jsQR from "jsqr";

export function decodeQrFromImageData(img: { data: Uint8ClampedArray; width: number; height: number }): string | null {
  const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return code?.data?.trim() || null;
}

export function qrNote(data: string | null): string {
  // A Family Countersign pairing code carries a secret; it must never leave the device.
  if (data && /\/family\/pair#/.test(data)) return "\n\n[QR code in the screenshot is a Family Countersign pairing code. It was not sent.]";
  return data ? `\n\n[QR code in the screenshot points to: ${data.slice(0, 2000)}]` : "";
}
