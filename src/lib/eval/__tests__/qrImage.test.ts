import { describe, expect, it } from "vitest";
import { qrPicture } from "@/lib/eval/qrImage";
import { decodeQrFromImageData } from "@/lib/investigator/qr";

describe("eval QR pictures", () => {
  it("round-trips through the same decoder the browser uses", async () => {
    const p = await qrPicture("https://www.chase.com/personal/credit-cards/activate");
    expect(decodeQrFromImageData(p.pixels)).toBe("https://www.chase.com/personal/credit-cards/activate");
    expect(Buffer.from(p.png.base64, "base64").subarray(1, 4).toString()).toBe("PNG");
  });
});
