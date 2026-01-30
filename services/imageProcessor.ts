
import { Point, Contour, DesignParams, AnalysisResult, PlacementType } from '../types';

const performDilation = (pixels: Uint8Array, w: number, h: number): Uint8Array => {
  const result = new Uint8Array(pixels.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (pixels[idx] === 1 || pixels[idx - 1] === 1 || pixels[idx + 1] === 1 || pixels[idx - w] === 1 || pixels[idx + w] === 1) result[idx] = 1;
    }
  }
  return result;
};

const performErosion = (pixels: Uint8Array, w: number, h: number, iterations: number = 1): Uint8Array => {
  let current = pixels;
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(current.length);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (current[idx] === 1 && current[idx - 1] === 1 && current[idx + 1] === 1 && current[idx - w] === 1 && current[idx + w] === 1) next[idx] = 1;
      }
    }
    current = next;
  }
  return current;
};

const performClosing = (pixels: Uint8Array, w: number, h: number): Uint8Array => {
  return performErosion(performDilation(pixels, w, h), w, h, 1);
};

const performThinning = (pixels: Uint8Array, w: number, h: number): Uint8Array => {
  const skeleton = new Uint8Array(pixels);
  let changed = true;
  const getNeighbors = (x: number, y: number, data: Uint8Array) => {
    return [
      data[(y - 1) * w + x], data[(y - 1) * w + (x + 1)], data[y * w + (x + 1)],
      data[(y + 1) * w + (x + 1)], data[(y + 1) * w + x], data[(y + 1) * w + (x - 1)],
      data[y * w + (x - 1)], data[(y - 1) * w + (x - 1)]
    ];
  };
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const toRemove: number[] = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (skeleton[y * w + x] === 0) continue;
          const n = getNeighbors(x, y, skeleton);
          const b = n.reduce((a, v) => a + v, 0);
          let a = 0;
          for (let i = 0; i < 8; i++) if (n[i] === 0 && n[(i + 1) % 8] === 1) a++;
          if (b >= 2 && b <= 6 && a === 1) {
            const cond1 = pass === 0 ? (n[0] * n[2] * n[4] === 0) : (n[0] * n[2] * n[6] === 0);
            const cond2 = pass === 0 ? (n[2] * n[4] * n[6] === 0) : (n[0] * n[4] * n[6] === 0);
            if (cond1 && cond2) { toRemove.push(y * w + x); changed = true; }
          }
        }
      }
      toRemove.forEach(idx => (skeleton[idx] = 0));
    }
  }
  return skeleton;
};

/**
 * Traces contours with higher sub-pixel precision logic
 */
const traceContour = (startX: number, startY: number, map: Uint8Array, w: number, h: number, visited: Uint8Array): Point[] => {
  const points: Point[] = [];
  let cx = startX, cy = startY;
  const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  let dir = 7;
  
  do {
    points.push({ x: cx, y: cy });
    visited[cy * w + cx] = 1;
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + i + 5) % 8;
      const nx = cx + dirs[nd][0], ny = cy + dirs[nd][1];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && map[ny * w + nx] === 1) {
        cx = nx; cy = ny; dir = nd; found = true; break;
      }
    }
    if (!found) break;
  } while (!(cx === startX && cy === startY) && points.length < 50000);
  
  return points;
};

export const processDesign = async (imageSrc: string, params: DesignParams): Promise<AnalysisResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject('Context failed');
      const maxDim = 1600; // Increased resolution for better precision
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round((maxDim / w) * h); w = maxDim; }
      else { w = Math.round((maxDim / h) * w); h = maxDim; }
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let binaryMap = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        binaryMap[i / 4] = ((data[i] + data[i+1] + data[i+2]) / 3) < params.threshold ? 1 : 0;
      }
      binaryMap = performClosing(binaryMap, w, h);
      const pixelToMm = (params.canvasWidthCm * 10) / w;
      const spacingPx = params.ledSpacingMm / pixelToMm;
      let targetMap = binaryMap;
      if (params.placement === PlacementType.CENTER_LINE) targetMap = performThinning(binaryMap, w, h);
      else if (params.placement === PlacementType.SKELETON) targetMap = performErosion(binaryMap, w, h, Math.ceil((params.ledDiameterMm / 2) / pixelToMm));

      const contours: Contour[] = [];
      const visited = new Uint8Array(w * h);
      const ledPoints: Point[] = [];
      const tryAddLed = (p: Point): boolean => {
        for (let i = ledPoints.length - 1; i >= 0; i--) {
          const e = ledPoints[i];
          if (Math.abs(p.x - e.x) < spacingPx && Math.abs(p.y - e.y) < spacingPx && ((p.x-e.x)**2 + (p.y-e.y)**2) < (spacingPx*0.95)**2) return false;
        }
        ledPoints.push(p); return true;
      };

      if (params.placement !== PlacementType.SKELETON) {
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            if (targetMap[y * w + x] === 1 && !visited[y * w + x]) {
              const pts = traceContour(x, y, targetMap, w, h, visited);
              if (pts.length > 5) {
                contours.push({ points: pts });
                let acc = spacingPx;
                pts.forEach((p, idx) => {
                  if (idx > 0) acc += Math.sqrt((p.x-pts[idx-1].x)**2 + (p.y-pts[idx-1].y)**2);
                  if (acc >= spacingPx) { if (tryAddLed(p)) acc = 0; }
                });
              }
            }
          }
        }
      } else {
        const step = spacingPx;
        for (let y = step; y < h; y += step * 0.866) {
          const off = (Math.round(y/step)%2) * (step/2);
          for (let x = step + off; x < w; x += step) {
            if (targetMap[Math.round(y)*w + Math.round(x)] === 1) tryAddLed({x,y});
          }
        }
      }
      resolve({ ledCount: ledPoints.length, contours, ledPoints, pixelToMm, processedWidth: w, processedHeight: h });
    };
  });
};
