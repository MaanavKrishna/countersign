import jsQR from "jsqr";

export function decodeQrFromImageData(img: { data: Uint8ClampedArray; width: number; height: number }): string | null {
  const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return code?.data?.trim() || null;
}

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };

/**
 * Find a QR code in a screenshot, in the browser. Real screenshots are scaled and
 * anti-aliased, which jsQR misses at some sizes, so: the browser's own barcode detector
 * first (Chrome, Edge, Android), then jsQR at several scales.
 */
export async function decodeQrFromImage(img: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (Native) {
    try {
      const hit = (await new Native({ formats: ["qr_code"] }).detect(img))[0]?.rawValue?.trim();
      if (hit) return hit;
    } catch {
      /* unsupported format or platform: fall back to jsQR */
    }
  }
  const w = img.width;
  const h = img.height;
  for (const scale of [1, 0.5, 0.75, 1.5, 0.35]) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const hit = decodeQrFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (hit) return hit;
  }
  return null;
}

/** Family pairing and circle QR codes carry the family secret in their #fragment. */
export function isFamilySecretLink(data: string | null): boolean {
  return !!data && /\/family\/(pair|join)#/.test(data);
}

export function qrNote(data: string | null): string {
  // Defence in depth: the UI refuses these screenshots before anything is sent.
  if (isFamilySecretLink(data)) return "\n\n[QR code in the screenshot is a Family Countersign code. It was not sent.]";
  return data ? `\n\n[QR code in the screenshot points to: ${data.slice(0, 2000)}]` : "";
}
