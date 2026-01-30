
export enum PlacementType {
  OUTLINE = 'outline',
  SKELETON = 'skeleton',
  CENTER_LINE = 'center_line'
}

export enum ExportOption {
  LEDS_ONLY = 'leds_only',
  PATH_ONLY = 'path_only',
  BOTH = 'both'
}

export interface DesignParams {
  canvasWidthCm: number;
  canvasHeightCm: number;
  ledDiameterMm: number;
  ledSpacingMm: number;
  placement: PlacementType;
  threshold: number;
  exportOption: ExportOption;
}

export interface Point {
  x: number;
  y: number;
}

export interface Contour {
  points: Point[];
}

export interface AnalysisResult {
  ledCount: number;
  contours: Contour[];
  ledPoints: Point[];
  pixelToMm: number;
  processedWidth: number;
  processedHeight: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  params: DesignParams;
  result: AnalysisResult;
  imagePreview: string; // Base64 thumbnail
}
