
import { Contour, Point, DesignParams, ExportOption } from '../types';

/**
 * Generates a high-precision standard DXF file string
 */
export const generateDXF = (
  contours: Contour[],
  ledPoints: Point[],
  params: DesignParams,
  pixelToMm: number
): string => {
  const formatNum = (n: number) => n.toFixed(6);
  const widthMm = params.canvasWidthCm * 10;
  const heightMm = params.canvasHeightCm * 10;

  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n`;
  
  dxf += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n`;
  dxf += `0\nLAYER\n2\nBOARD_FRAME\n70\n0\n62\n8\n`;
  dxf += `0\nLAYER\n2\nCONTOURS\n70\n0\n62\n7\n`;
  dxf += `0\nLAYER\n2\nLEDS\n70\n0\n62\n1\n`;
  dxf += `0\nENDTAB\n0\nENDSEC\n`;

  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Frame
  dxf += `0\nLWPOLYLINE\n8\nBOARD_FRAME\n90\n4\n70\n1\n`;
  dxf += `10\n0.0\n20\n0.0\n10\n${formatNum(widthMm)}\n20\n0.0\n10\n${formatNum(widthMm)}\n20\n${formatNum(heightMm)}\n10\n0.0\n20\n${formatNum(heightMm)}\n`;

  // Draw Contours
  if (params.exportOption === ExportOption.PATH_ONLY || params.exportOption === ExportOption.BOTH) {
    contours.forEach(contour => {
      if (contour.points.length < 2) return;
      dxf += `0\nLWPOLYLINE\n8\nCONTOURS\n90\n${contour.points.length}\n70\n1\n`;
      contour.points.forEach(p => {
        const x = p.x * pixelToMm;
        const y = heightMm - (p.y * pixelToMm);
        dxf += `10\n${formatNum(x)}\n20\n${formatNum(y)}\n`;
      });
    });
  }

  // Draw LEDs
  if (params.exportOption === ExportOption.LEDS_ONLY || params.exportOption === ExportOption.BOTH) {
    const radius = params.ledDiameterMm / 2;
    ledPoints.forEach(p => {
      const x = p.x * pixelToMm;
      const y = heightMm - (p.y * pixelToMm);
      dxf += `0\nCIRCLE\n8\nLEDS\n10\n${formatNum(x)}\n20\n${formatNum(y)}\n40\n${formatNum(radius)}\n`;
    });
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
};
