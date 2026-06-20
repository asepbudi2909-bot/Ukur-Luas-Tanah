import { Point, Triangle } from '../types';

/**
 * Minimum distance threshold for considering two points as overlapping
 */
const MIN_DISTANCE_THRESHOLD = 1e-3;

/**
 * Epsilon value for floating point comparisons in triangle calculations
 */
const FLOATING_POINT_EPSILON = 1e-10;

/**
 * Represents a point-like object with x and y coordinates
 */
interface Coordinate {
  x: number;
  y: number;
}

/**
 * Calculates the Euclidean distance between two points in pixels
 */
export function getDistance(p1: Coordinate, p2: Coordinate): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculates the distance in meters based on the scale pixel-to-meter ratio
 */
export function getRealDistance(
  p1: Coordinate,
  p2: Coordinate,
  scalePixelRatio: number
): number {
  const pixelDist = getDistance(p1, p2);
  return pixelDist / scalePixelRatio;
}

/**
 * Checks if segment AB intersects with segment CD
 */
export function doSegmentsIntersect(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate
): boolean {
  // Helper to determine orientation (counter-clockwise check)
  const ccw = (p1: Coordinate, p2: Coordinate, p3: Coordinate): boolean => {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  };

  // Check if they share endpoints - sharing endpoints is not considered cross-intersecting
  if (
    (a.x === c.x && a.y === c.y) ||
    (a.x === d.x && a.y === d.y) ||
    (b.x === c.x && b.y === c.y) ||
    (b.x === d.x && b.y === d.y)
  ) {
    return false;
  }

  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

/**
 * Checks if a polygon contains any self-intersecting edges
 */
export function isPolygonSelfIntersecting(points: Point[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      // Skip adjacent edges (they share a vertex)
      if (j === (i - 1 + n) % n) continue;

      const c = points[j];
      const d = points[(j + 1) % n];

      if (doSegmentsIntersect(a, b, c, d)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates the polygon orientation using the signed shoelace formula.
 * Positive = clockwise on standard Y-down canvas, Negative = counter-clockwise
 */
export function getShoelaceArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    area += (p1.x * p2.y) - (p2.x * p1.y);
  }
  
  return area / 2;
}

/**
 * Checks if point P is inside triangle ABC using barycentric coordinates
 */
export function isPointInTriangle(
  p: Coordinate,
  a: Coordinate,
  b: Coordinate,
  c: Coordinate
): boolean {
  const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  
  if (Math.abs(det) < FLOATING_POINT_EPSILON) return false;

  const factor1 = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det;
  const factor2 = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det;
  const factor3 = 1.0 - factor1 - factor2;

  // Small epsilon for points extremely close to edges
  const eps = -1e-10;
  return factor1 >= eps && factor2 >= eps && factor3 >= eps;
}

/**
 * Ear Clipping Triangulation Algorithm.
 * 
 * Divides a polygon into individual component triangles, then uses Heron's formula
 * on each to calculate their area. Returns an array of Triangles.
 * 
 * @param points - Array of polygon vertices in order
 * @param scalePixelRatio - Pixels per meter ratio for real-world distance calculation
 * @returns Array of Triangle objects with calculated areas and side lengths
 */
export function triangulatePolygon(points: Point[], scalePixelRatio: number): Triangle[] {
  if (points.length < 3) return [];

  // Work on a duplicate copy to avoid mutating the original
  const polyList = [...points];
  let n = polyList.length;

  const triangles: Triangle[] = [];
  let triangleIndex = 0;

  // Ensure counter-clockwise (CCW) vertex ordering on a Y-down grid.
  // On canvas coordinate system: Y goes down. If shoelace < 0, it's CCW. If shoelace > 0, it's CW.
  const shoelace = getShoelaceArea(polyList);
  if (shoelace > 0) {
    polyList.reverse();
  }

  // Prevent infinite loops in degenerate or complex shapes by limiting iterations
  let limit = n * n * 2;
  let i = 0;

  while (n > 2 && limit > 0) {
    limit--;

    const prevIdx = (i - 1 + n) % n;
    const currIdx = i % n;
    const nextIdx = (i + 1) % n;

    const pPrev = polyList[prevIdx];
    const pCurr = polyList[currIdx];
    const pNext = polyList[nextIdx];

    // Check if the current vertex forms a convex vertex (internal angle < 180 degrees)
    // Cross product: (pNext - pCurr) x (pPrev - pCurr)
    // On Y-down canvas with CCW orientation, convex corners have negative cross product
    const crossProduct = (pCurr.x - pPrev.x) * (pNext.y - pCurr.y) - (pCurr.y - pPrev.y) * (pNext.x - pCurr.x);
    
    if (crossProduct < 0) {
      // Reflex angle, not convex. Try the next vertex.
      i++;
      continue;
    }

    // Check if any other vertex lies inside the candidate triangle (pPrev, pCurr, pNext)
    let isEar = true;
    for (let j = 0; j < n; j++) {
      if (j === prevIdx || j === currIdx || j === nextIdx) continue;
      
      const testPt = polyList[j];
      if (isPointInTriangle(testPt, pPrev, pCurr, pNext)) {
        isEar = false;
        break;
      }
    }

    if (isEar) {
      // Clip the ear and calculate triangle properties
      const sideA = getRealDistance(pPrev, pCurr, scalePixelRatio);
      const sideB = getRealDistance(pCurr, pNext, scalePixelRatio);
      const sideC = getRealDistance(pNext, pPrev, scalePixelRatio);

      // Semi-perimeter
      const s = (sideA + sideB + sideC) / 2;

      // Heron's Area formula - use Math.max to prevent floating point errors
      const heronRadicand = s * (s - sideA) * (s - sideB) * (s - sideC);
      const area = Math.sqrt(Math.max(0, heronRadicand));

      triangles.push({
        id: `tri-${triangleIndex}-${Date.now()}`,
        p1: pPrev,
        p2: pCurr,
        p3: pNext,
        a: parseFloat(sideA.toFixed(2)),
        b: parseFloat(sideB.toFixed(2)),
        c: parseFloat(sideC.toFixed(2)),
        s: parseFloat(s.toFixed(2)),
        area: parseFloat(area.toFixed(2)),
        index: triangleIndex + 1,
        label: `Segitiga ${triangleIndex + 1}`,
      });

      triangleIndex++;

      // Remove the current vertex from the active list
      polyList.splice(currIdx, 1);
      n = polyList.length;

      // Restart search from previous vertex to optimize
      i = prevIdx;
    } else {
      i++;
    }
  }

  // Return successfully triangulated triangles (may be partial for complex shapes)
  return triangles;
}
