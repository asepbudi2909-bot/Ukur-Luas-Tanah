export interface Point {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface Triangle {
  id: string;
  p1: Point;
  p2: Point;
  p3: Point;
  a: number; // side length in meters
  b: number; // side length in meters
  c: number; // side length in meters
  s: number; // semi-perimeter
  area: number; // area in m^2
  index: number;
  label: string;
}

export interface ManualTriangleConfig {
  id: string;
  pointIds: [string, string, string];
}

export interface SavedLand {
  id: string;
  name: string;
  date: string;
  points: Point[];
  scalePixelRatio: number; // pixels per meter
  notes?: string;
  manualTriangleConfigs?: ManualTriangleConfig[];
}

export interface ScaleConfig {
  pixelDistance: number;
  realDistance: number; // in meters
}
