import jsQR from "jsqr";

export function decodeQrFromImageData(img: { data: Uint8ClampedArray; width: number; height: number }): string | null {
  const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return code?.data?.trim() || null;
}

export function qrNote(data: string | null): string {
  return data ? `\n\n[QR code in the screenshot points to: ${data.slice(0, 2000)}]` : "";
}
