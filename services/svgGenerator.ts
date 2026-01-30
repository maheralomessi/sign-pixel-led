
import { Contour, Point, DesignParams, ExportOption } from '../types';

export const generateSVG = (
  contours: Contour[],
  ledPoints: Point[],
  params: DesignParams,
  pixelToMm: number
): string => {
  const widthMm = params.canvasWidthCm * 10;
  const heightMm = params.canvasHeightCm * 10;
  const ledRadius = params.ledDiameterMm / 2;

  let svg = `<svg width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // Background/Frame (Optional info layer)
  svg += `  <rect x="0" y="0" width="${widthMm}" height="${heightMm}" fill="none" stroke="#ccc" stroke-width="0.1" />\n`;

  // Draw Paths (Contours)
  if (params.exportOption === ExportOption.PATH_ONLY || params.exportOption === ExportOption.BOTH) {
    contours.forEach(contour => {
      if (contour.points.length < 2) return;
      let pathData = `M ${contour.points[0].x * pixelToMm} ${contour.points[0].y * pixelToMm} `;
      for (let i = 1; i < contour.points.length; i++) {
        pathData += `L ${contour.points[i].x * pixelToMm} ${contour.points[i].y * pixelToMm} `;
      }
      pathData += 'Z';
      svg += `  <path d="${pathData}" fill="none" stroke="black" stroke-width="0.2" />\n`;
    });
  }

  // Draw LEDs
  if (params.exportOption === ExportOption.LEDS_ONLY || params.exportOption === ExportOption.BOTH) {
    ledPoints.forEach(p => {
      const cx = p.x * pixelToMm;
      const cy = p.y * pixelToMm;
      svg += `  <circle cx="${cx}" cy="${cy}" r="${ledRadius}" fill="red" stroke="none" />\n`;
    });
  }

  svg += `</svg>`;
  return svg;
};
