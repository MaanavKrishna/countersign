import QRCode from "qrcode";

// Eval-only: turn a URL into the picture a person would screenshot (a QR code), as both
// a PNG for the model and raw pixels for the same decoder the browser uses.

const SCALE = 6;
const MARGIN = 4;

export type QrPicture = { png: { mediaType: "image/png"; base64: string }; pixels: { data: Uint8ClampedArray; width: number; height: number } };

export async function qrPicture(url: string): Promise<QrPicture> {
  const buf = await QRCode.toBuffer(url, { type: "png", margin: MARGIN, scale: SCALE, errorCorrectionLevel: "M" });
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const size = (n + MARGIN * 2) * SCALE;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(y, x)) continue;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const px = ((y + MARGIN) * SCALE + dy) * size + (x + MARGIN) * SCALE + dx;
          data[px * 4] = data[px * 4 + 1] = data[px * 4 + 2] = 0;
        }
      }
    }
  }
  return { png: { mediaType: "image/png", base64: buf.toString("base64") }, pixels: { data, width: size, height: size } };
}
