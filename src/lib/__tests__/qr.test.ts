import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { decodeQrFromImageData, qrNote } from "../qr";

describe("qr", () => {
  it("formats a note the investigator can pick up", () => {
    expect(qrNote("https://pay-parking.top/x")).toBe("\n\n[QR code in the screenshot points to: https://pay-parking.top/x]");
    expect(qrNote(null)).toBe("");
  });
  it("returns null for an image with no code", () => {
    const blank = { data: new Uint8ClampedArray(40 * 40 * 4).fill(255), width: 40, height: 40 };
    expect(decodeQrFromImageData(blank)).toBeNull();
  });
  it("decodes a real QR code from pixels", () => {
    const qr = QRCode.create("https://parking-pay.top/meter/4412", { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const scale = 6;
    const quiet = 4;
    const w = (n + quiet * 2) * scale;
    const data = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!qr.modules.get(y, x)) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = ((y + quiet) * scale + dy) * w + (x + quiet) * scale + dx;
            data[px * 4] = data[px * 4 + 1] = data[px * 4 + 2] = 0;
          }
        }
      }
    }
    expect(decodeQrFromImageData({ data, width: w, height: w })).toBe("https://parking-pay.top/meter/4412");
  });
});
