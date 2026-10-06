import QRCode from "qrcode";

/**
 * Generates a fully compliant, scalable SVG QR Code using standard Error Correction (Level M).
 */
export function generateQRCodeSVG(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const quietZone = 2;
  const totalSize = size + quietZone * 2;

  let svgPath = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) {
        svgPath += `M${c + quietZone},${r + quietZone}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" class="size-full fill-current"><path d="${svgPath.trim()}"/></svg>`;
}
