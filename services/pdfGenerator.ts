
import { Contour, Point, DesignParams, ExportOption } from '../types';

declare const jspdf: any;

export const generatePDF = (
  contours: Contour[],
  ledPoints: Point[],
  params: DesignParams,
  pixelToMm: number
): void => {
  const widthMm = params.canvasWidthCm * 10;
  const heightMm = params.canvasHeightCm * 10;
  const ledRadius = params.ledDiameterMm / 2;

  // Create PDF with mm units
  const doc = new jspdf.jsPDF({
    orientation: widthMm > heightMm ? 'l' : 'p',
    unit: 'mm',
    format: [widthMm, heightMm]
  });

  // Set line width for paths
  doc.setLineWidth(0.2);

  // Draw Paths (Contours)
  if (params.exportOption === ExportOption.PATH_ONLY || params.exportOption === ExportOption.BOTH) {
    doc.setDrawColor(0, 0, 0); // Black for paths
    contours.forEach(contour => {
      if (contour.points.length < 2) return;
      
      const pts = contour.points.map(p => [p.x * pixelToMm, p.y * pixelToMm]);
      
      for (let i = 0; i < pts.length - 1; i++) {
        doc.line(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
      }
      // Close path
      doc.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
    });
  }

  // Draw LEDs
  if (params.exportOption === ExportOption.LEDS_ONLY || params.exportOption === ExportOption.BOTH) {
    doc.setDrawColor(255, 0, 0); // Red for LEDs
    doc.setFillColor(255, 0, 0);
    ledPoints.forEach(p => {
      const cx = p.x * pixelToMm;
      const cy = p.y * pixelToMm;
      // Draw as circle
      doc.circle(cx, cy, ledRadius, 'F');
    });
  }

  doc.save(`led_design_${Date.now()}.pdf`);
};
