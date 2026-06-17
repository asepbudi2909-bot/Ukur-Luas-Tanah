import React, { useRef, useState, useEffect } from 'react';
import { Point, Triangle, ManualTriangleConfig } from '../types';
import { getDistance, isPolygonSelfIntersecting } from '../utils/geometry';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Square, 
  Trash2, 
  Undo2, 
  Move, 
  PenTool, 
  Maximize2, 
  RotateCcw, 
  Sparkles,
  Compass,
  MapPin,
  Check,
  PlusCircle,
  ZoomIn,
  ZoomOut,
  Hand
} from 'lucide-react';

interface LandCanvasProps {
  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  isClosed: boolean;
  setIsClosed: React.Dispatch<React.SetStateAction<boolean>>;
  scalePixelRatio: number;
  setScalePixelRatio: (val: number) => void;
  triangles: Triangle[];
  activeTriangleId: string | null;
  setActiveTriangleId: (id: string | null) => void;
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
  gridSize: number;
  drawingMode: 'draw' | 'edit' | 'heron' | 'pan';
  setDrawingMode: React.Dispatch<React.SetStateAction<'draw' | 'edit' | 'heron' | 'pan'>>;
  selectedPointIds: string[];
  setSelectedPointIds: React.Dispatch<React.SetStateAction<string[]>>;
  manualTriangleConfigs: ManualTriangleConfig[];
  setManualTriangleConfigs: React.Dispatch<React.SetStateAction<ManualTriangleConfig[]>>;
  shoelaceArea: number;
}

export const LandCanvas: React.FC<LandCanvasProps> = ({
  points,
  setPoints,
  isClosed,
  setIsClosed,
  scalePixelRatio,
  setScalePixelRatio,
  triangles,
  activeTriangleId,
  setActiveTriangleId,
  snapToGrid,
  setSnapToGrid,
  gridSize,
  drawingMode,
  setDrawingMode,
  selectedPointIds,
  setSelectedPointIds,
  manualTriangleConfigs,
  setManualTriangleConfigs,
  shoelaceArea,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 450 });
  const [hoveredFirstPoint, setHoveredFirstPoint] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Zoom & Pan states for small plots zooming
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasDraggedViewport, setHasDraggedViewport] = useState<boolean>(false);

  // Update canvas size on mount & resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: 450,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set proper initial points if empty to make users welcome
  useEffect(() => {
    if (points.length === 0) {
      // Clear closed state if no points
      setIsClosed(false);
    }
  }, [points, setIsClosed]);

  // Snapping function
  const applySnapping = (x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    return { x: snappedX, y: snappedY };
  };

  // Click handler to add points
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // If the user was dragging to pan the canvas, do not add a point
    if (hasDraggedViewport) {
      setHasDraggedViewport(false);
      return;
    }
    if (isClosed || drawingMode !== 'draw') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;

    // Apply Snapping if enabled
    const { x, y } = applySnapping(rawX, rawY);

    // If clicking close to the first point, close the polygon
    if (points.length >= 3) {
      const firstPt = points[0];
      const distToFirst = getDistance({ x, y }, firstPt);
      // Support zoom in click thresholds
      if (distToFirst * zoom < 22) {
        setIsClosed(true);
        setDrawingMode('heron');
        setHoveredFirstPoint(false);
        return;
      }
    }

    // Otherwise, add a new point
    const newPoint: Point = {
      id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x,
      y,
      label: `P${points.length + 1}`,
    };

    setPoints([...points, newPoint]);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const nextZoom = e.deltaY < 0 
      ? Math.min(zoom * zoomFactor, 8) 
      : Math.max(zoom / zoomFactor, 0.4);

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPan((prev) => ({
      x: mouseX - (mouseX - prev.x) * (nextZoom / zoom),
      y: mouseY - (mouseY - prev.y) * (nextZoom / zoom),
    }));
    setZoom(nextZoom);
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Start panning if 'pan' mode is active OR if dragging on background (not hovering a point handle)
    if (drawingMode === 'pan' || (e.button === 0 && draggingPointId === null && hoveredPointId === null)) {
      setIsPanning(true);
      setHasDraggedViewport(false);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      const dx = Math.abs((e.clientX - pan.x) - (e.clientX - panStart.x));
      const dy = Math.abs((e.clientY - pan.y) - (e.clientY - panStart.y));
      if (dx > 3 || dy > 3) {
        setHasDraggedViewport(true);
      }
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingPointId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;

      // Apply Snapping
      const { x, y } = applySnapping(rawX, rawY);

      setPoints((prev) =>
        prev.map((pt) => (pt.id === draggingPointId ? { ...pt, x, y } : pt))
      );
    }
  };

  const handleSvgMouseUp = () => {
    setIsPanning(false);
  };

  // Mouse move handler for closing polygon hover helper
  const handleMouseMoveOverFirstPoint = (e: React.MouseEvent) => {
    if (points.length >= 3 && !isClosed && drawingMode === 'draw') {
      setHoveredFirstPoint(true);
    }
  };

  // Handle vertex drag start or selection for manual triangulation (Heron mode)
  const handlePointDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (drawingMode === 'heron') {
      let nextSelected: string[];
      if (selectedPointIds.includes(id)) {
        nextSelected = selectedPointIds.filter((pId) => pId !== id);
      } else {
        nextSelected = [...selectedPointIds, id];
      }

      if (nextSelected.length === 3) {
        // Check if this triangle already exists (order independent)
        const sortedNew = [...nextSelected].sort();

        setManualTriangleConfigs((prev) => {
          const exists = prev.some((cfg) => {
            const sortedExisting = [...cfg.pointIds].sort();
            return (
              sortedExisting[0] === sortedNew[0] &&
              sortedExisting[1] === sortedNew[1] &&
              sortedExisting[2] === sortedNew[2]
            );
          });
          if (exists) return prev;
          return [
            ...prev,
            {
              id: `tri-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              pointIds: [nextSelected[0], nextSelected[1], nextSelected[2]],
            },
          ];
        });
        setSelectedPointIds([]); // Reset selection
      } else {
        setSelectedPointIds(nextSelected);
      }
      return;
    }

    if (drawingMode !== 'edit') {
      setDrawingMode('edit');
    }
    setDraggingPointId(id);
  };

  // Track dragging point in viewport coordinate
  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handleSvgMouseMove(e);
  };

  const handleDragEnd = () => {
    setDraggingPointId(null);
    setIsPanning(false);
  };

  const clearCanvas = () => {
    setPoints([]);
    setIsClosed(false);
    setDrawingMode('draw');
  };

  const undoLastPoint = () => {
    if (isClosed) {
      setIsClosed(false);
      setDrawingMode('draw');
    } else {
      setPoints(points.slice(0, -1));
    }
  };

  const closePolygonManually = () => {
    if (points.length >= 3) {
      setIsClosed(true);
      setDrawingMode('heron');
    }
  };

  // Pre-configured Templates
  const loadTemplate = (type: 'triangle' | 'rectangle' | 'trapezoid' | 'lShape' | 'irregular') => {
    const midX = canvasSize.width / 2;
    const midY = canvasSize.height / 2;

    let tempPoints: Point[] = [];

    switch (type) {
      case 'triangle':
        tempPoints = [
          { id: 't1', x: midX - 120, y: midY + 100, label: 'P1' },
          { id: 't2', x: midX + 120, y: midY + 100, label: 'P2' },
          { id: 't3', x: midX - 120, y: midY - 100, label: 'P3' },
        ];
        break;
      case 'rectangle':
        tempPoints = [
          { id: 'r1', x: midX - 120, y: midY - 80, label: 'P1' },
          { id: 'r2', x: midX + 120, y: midY - 80, label: 'P2' },
          { id: 'r3', x: midX + 120, y: midY + 80, label: 'P3' },
          { id: 'r4', x: midX - 120, y: midY + 80, label: 'P4' },
        ];
        break;
      case 'trapezoid':
        tempPoints = [
          { id: 'tp1', x: midX - 80, y: midY - 90, label: 'P1' },
          { id: 'tp2', x: midX + 80, y: midY - 90, label: 'P2' },
          { id: 'tp3', x: midX + 160, y: midY + 90, label: 'P3' },
          { id: 'tp4', x: midX - 160, y: midY + 90, label: 'P4' },
        ];
        break;
      case 'lShape':
        tempPoints = [
          { id: 'l1', x: midX - 120, y: midY - 120, label: 'P1' },
          { id: 'l2', x: midX, y: midY - 120, label: 'P2' },
          { id: 'l3', x: midX, y: midY, label: 'P3' },
          { id: 'l4', x: midX + 120, y: midY, label: 'P4' },
          { id: 'l5', x: midX + 120, y: midY + 120, label: 'P5' },
          { id: 'l6', x: midX - 120, y: midY + 120, label: 'P6' },
        ];
        break;
      case 'irregular':
        tempPoints = [
          { id: 'i1', x: midX - 120, y: midY - 100, label: 'P1' },
          { id: 'i2', x: midX + 100, y: midY - 120, label: 'P2' },
          { id: 'i3', x: midX + 140, y: midY + 40, label: 'P3' },
          { id: 'i4', x: midX - 20, y: midY + 120, label: 'P4' },
          { id: 'i5', x: midX - 160, y: midY + 20, label: 'P5' },
        ];
        break;
    }

    setPoints(tempPoints);
    setIsClosed(true);
    setDrawingMode('heron');
  };

  // Generate triangulation visual labels (centroids)
  const renderTriangleLabels = () => {
    return triangles.map((tri) => {
      // Calculate Centroid
      const cx = (tri.p1.x + tri.p2.x + tri.p3.x) / 3;
      const cy = (tri.p1.y + tri.p2.y + tri.p3.y) / 3;

      const isAreaHovered = activeTriangleId === tri.id;

      return (
        <g key={`tri-label-${tri.id}`}>
          {/* Slashed lines inside polygon to separate triangles */}
          <polygon
            points={`${tri.p1.x},${tri.p1.y} ${tri.p2.x},${tri.p2.y} ${tri.p3.x},${tri.p3.y}`}
            fill={isAreaHovered ? 'rgba(234, 179, 8, 0.25)' : 'rgba(59, 130, 246, 0.04)'}
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            className="transition-colors duration-300 pointer-events-none"
          />
          {/* Centroid Badge */}
          <g 
            onMouseEnter={() => setActiveTriangleId(tri.id)}
            onMouseLeave={() => setActiveTriangleId(null)}
            className="cursor-help"
          >
            <circle
              cx={cx}
              cy={cy}
              r="14"
              fill={isAreaHovered ? '#f59e0b' : '#3b82f6'}
              className="transition-all duration-300 filter drop-shadow-md"
            />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              className="text-[10px] font-semibold text-white pointer-events-none font-mono"
            >
              T{tri.index}
            </text>
            
            {/* Popover on hover with triangle area */}
            {isAreaHovered && (
              <g className="pointer-events-none">
                <rect
                  x={cx - 60}
                  y={cy - 48}
                  width="120"
                  height="26"
                  rx="6"
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke="#f59e0b"
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={cy - 31}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[11px] font-medium font-sans"
                >
                  T{tri.index}: {tri.area.toLocaleString('id-ID')} m²
                </text>
              </g>
            )}
          </g>
        </g>
      );
    });
  };

  // Draw helper lines during manual triangulation
  const renderActiveSelectionLines = () => {
    if (drawingMode !== 'heron' || selectedPointIds.length === 0) return null;
    const activePts = selectedPointIds
      .map((id) => points.find((p) => p.id === id))
      .filter((p): p is Point => !!p);

    if (activePts.length === 0) return null;

    return (
      <g key="active-selection-lines">
        {activePts.length === 2 && (
          <line
            x1={activePts[0].x}
            y1={activePts[0].y}
            x2={activePts[1].x}
            y2={activePts[1].y}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="5,3"
          />
        )}
        {activePts.map((pt) => (
          <circle
            key={`selected-glow-${pt.id}`}
            cx={pt.x}
            cy={pt.y}
            r="12"
            fill="transparent"
            stroke="#f59e0b"
            strokeWidth="1.5"
            className="animate-pulse"
          />
        ))}
      </g>
    );
  };

  // Draw lines with distance tags
  const renderPolygonEdges = () => {
    if (points.length === 0) return null;

    const elements: React.JSX.Element[] = [];
    const loopLimit = isClosed ? points.length : points.length - 1;

    for (let i = 0; i < loopLimit; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      // Edge mid-point for distance label
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;

      // Distance in meters
      const pixelDist = getDistance(p1, p2);
      const realDist = pixelDist / scalePixelRatio;

      // Rotate measurement card according to edge angle
      const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      let angleDeg = (angleRad * 180) / Math.PI;
      // Keep text right-side up
      if (angleDeg > 90 || angleDeg < -90) {
        angleDeg += 180;
      }

      elements.push(
        <g key={`edge-${p1.id}-${p2.id}`}>
          {/* Main edge path */}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={isClosed ? '#10b981' : '#3b82f6'}
            strokeWidth={isClosed ? '3' : '2.5'}
            className="transition-colors duration-300"
          />
          {/* Distance Tag Bubble */}
          <g transform={`translate(${mx}, ${my}) rotate(${angleDeg})`}>
            <rect
              x="-30"
              y="-10"
              width="60"
              height="20"
              rx="10"
              fill="rgba(15, 23, 42, 0.85)"
              stroke={isClosed ? '#10b981' : '#3b82f6'}
              strokeWidth="1.2"
              className="backdrop-blur-sm"
            />
            <text
              y="4"
              textAnchor="middle"
              fill="#ffffff"
              className="text-[9px] font-semibold font-mono"
            >
              {realDist.toFixed(2)}m
            </text>
          </g>
        </g>
      );
    }
    return elements;
  };

  // Self-intersection check to alert users
  const isSelfIntersecting = isPolygonSelfIntersecting(points);

  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden" id="land-canvas-container">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Canvas CAD Interaktif
          </div>
          {isSelfIntersecting && (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md animate-bounce">
              ⚠️ Batas Tanah Saling Menyambung (Silang)!
            </span>
          )}
        </div>

        {/* Drawing Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => {
                if (isClosed) {
                  setIsClosed(false);
                }
                setDrawingMode('draw');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                drawingMode === 'draw' && !isClosed
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Klik canvas untuk menggambar batas tanah"
              id="mode-draw-btn"
            >
              <PenTool size={13} />
              Batas Lahan
            </button>
            <button
              onClick={() => setDrawingMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                drawingMode === 'edit'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Geser titik-titik polygon untuk mengubah bentuk"
              id="mode-edit-btn"
            >
              <Move size={13} />
              Geser Patok
            </button>
            <button
              onClick={() => setDrawingMode('pan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                drawingMode === 'pan'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Geser seluruh bidang tanah (klik dan seret canvas)"
              id="mode-pan-btn"
            >
              <Hand size={13} />
              Geser Canvas
            </button>
            <button
              onClick={() => {
                if (!isClosed) {
                  if (points.length >= 3) {
                    setIsClosed(true);
                  } else {
                    return;
                  }
                }
                setDrawingMode('heron');
              }}
              disabled={points.length < 3}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:hover:text-slate-400 disabled:cursor-not-allowed ${
                drawingMode === 'heron'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pilih 3 koordinat secara berturut-turut untuk membuat sub-segitiga"
              id="mode-heron-btn"
            >
              <PlusCircle size={13} />
              Segitiga Manual
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Action buttons */}
          <div className="flex gap-1">
            <button
              onClick={undoLastPoint}
              disabled={points.length === 0}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-lg transition-all"
              title="Batalkan titik terakhir"
              id="undo-btn"
            >
              <Undo2 size={15} />
            </button>

            <button
              onClick={clearCanvas}
              disabled={points.length === 0}
              className="p-2 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
              title="Bersihkan lembar gambar"
              id="clear-btn"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Quick Manual Close Option */}
          {points.length >= 3 && !isClosed && (
            <button
              onClick={closePolygonManually}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-900/10 border border-emerald-500/20 animate-pulse"
              id="close-polygon-btn"
            >
              <Check size={14} />
              Tutup Poligon
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Workspace */}
      <div 
        ref={containerRef}
        className={`relative bg-slate-950 overflow-hidden touch-none transition-all ${
          drawingMode === 'pan' 
            ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') 
            : 'cursor-crosshair'
        }`}
        style={{ height: '450px' }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Real-time coordinates & guide overlay */}
        <div className="absolute top-3 left-4 z-10 pointer-events-none flex flex-col gap-1 font-mono text-[10px] text-slate-500 bg-slate-950/80 backdrop-blur-sm p-2 rounded-lg border border-slate-800/60 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
            <Compass size={11} className="text-blue-400" />
            <span>DATA PROYEKSI</span>
          </div>
          <div>Koordinat: {points.length} Titik Terpasang</div>
          <div>Status Poligon: {isClosed ? '🔴 Tertutup (Heron Aktif)' : '🔵 Sedang Digambar'}</div>
          <div>Rasio Skala: 1m = {scalePixelRatio.toFixed(2)}px</div>
          <div>Zoom Canvas: {Math.round(zoom * 100)}%</div>
        </div>

        {/* Snap toggle control overlay */}
        <div className="absolute bottom-3 left-4 z-10 bg-slate-90-5 py-1 px-3 border border-slate-800/80 rounded-lg flex items-center gap-3 backdrop-blur-md shadow-lg">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={() => setSnapToGrid(!snapToGrid)}
              className="w-3.5 h-3.5 accent-blue-600 rounded bg-slate-800 border-slate-700"
              id="snap-checkbox"
            />
            <span className="text-[11px] font-medium text-slate-400">Snap Ke Grid ({gridSize}px)</span>
          </label>
        </div>

        {/* Floating Zoom & Pan Controls Overlay */}
        <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg select-none pointer-events-auto">
          <button
            onClick={() => {
              const rect = containerRef.current?.getBoundingClientRect();
              const centerX = rect ? rect.width / 2 : 350;
              const centerY = rect ? rect.height / 2 : 225;
              const nextZoom = Math.min(zoom * 1.3, 8);
              setPan((prev) => ({
                x: centerX - (centerX - prev.x) * (nextZoom / zoom),
                y: centerY - (centerY - prev.y) * (nextZoom / zoom),
              }));
              setZoom(nextZoom);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Perbesar (Zoom In)"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => {
              const rect = containerRef.current?.getBoundingClientRect();
              const centerX = rect ? rect.width / 2 : 350;
              const centerY = rect ? rect.height / 2 : 225;
              const nextZoom = Math.max(zoom / 1.3, 0.4);
              setPan((prev) => ({
                x: centerX - (centerX - prev.x) * (nextZoom / zoom),
                y: centerY - (centerY - prev.y) * (nextZoom / zoom),
              }));
              setZoom(nextZoom);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
            title="Reset Zoom & Geser"
          >
            <RotateCcw size={11} />
            Reset View
          </button>
        </div>

        {/* Prompt guidance bubbles */}
        {points.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none z-0">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 animate-pulse">
                <Compass size={28} />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Mulai Gambar Poligon Tanah Anda</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Klik di mana saja pada grid untuk melepas titik-titik sudut tanah, lalu sambungkan kembali ke titik awal untuk menghitung luasnya secara instan!
              </p>
              
              {/* Preset instructions */}
              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-2 pointer-events-auto">
                <button
                  onClick={() => loadTemplate('triangle')}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-[11px] font-medium text-slate-300 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Segitiga
                </button>
                <button
                  onClick={() => loadTemplate('rectangle')}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-[11px] font-medium text-slate-300 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Persegi
                </button>
                <button
                  onClick={() => loadTemplate('trapezoid')}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-[11px] font-medium text-slate-300 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Trapesium
                </button>
                <button
                  onClick={() => loadTemplate('lShape')}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-[11px] font-medium text-slate-300 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Sawah Bentuk L
                </button>
                <button
                  onClick={() => loadTemplate('irregular')}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-[11px] font-medium text-slate-300 rounded-md transition-all flex items-center justify-center gap-1.5 col-span-2 md:col-span-1 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>Segilima Unik
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Main interactive SVG workspace */}
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleSvgMouseDown}
          onMouseUp={handleSvgMouseUp}
          onWheel={handleWheel}
          id="land-svg-workspace"
        >
          {/* Blueprint Grid Pattern */}
          <defs>
            {/* Minor grid */}
            <pattern
              id="grid-minor"
              width={gridSize / 4}
              height={gridSize / 4}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize / 4} 0 L 0 0 0 ${gridSize / 4}`}
                fill="none"
                stroke="rgba(30, 41, 59, 1)"
                strokeWidth="0.5"
              />
            </pattern>
            {/* Major grid */}
            <pattern
              id="grid-major"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <rect width={gridSize} height={gridSize} fill="url(#grid-minor)" />
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="rgba(51, 65, 85, 0.45)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* Scaled and translated viewport container */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Fill canvas with Grid Pattern (Infinite grid using wide coordinates) */}
            <rect width="30000" height="30000" x="-15000" y="-15000" fill="url(#grid-major)" />

            {/* Triangulation and Calculations display */}
            {isClosed && renderTriangleLabels()}

            {/* Active selection helper lines */}
            {renderActiveSelectionLines()}

            {/* Perimeter Edges & Distances */}
            {renderPolygonEdges()}

            {/* Line to prospective next point during active drawing */}
            {points.length > 0 && !isClosed && drawingMode === 'draw' && (
              <line
                x1={points[points.length - 1].x}
                y1={points[points.length - 1].y}
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="3,3"
              />
            )}

            {/* Vertex Nodes (Handles) */}
            {points.map((pt, idx) => {
              const isFirst = idx === 0;
              const canClose = isFirst && points.length >= 3 && !isClosed;
              const isPointDragging = draggingPointId === pt.id;
              const isPointHovered = hoveredPointId === pt.id;

              return (
                <g key={`vertex-node-${pt.id}`}>
                  {/* Visual glow ring for closing polygon */}
                  {canClose && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredFirstPoint ? '17' : '11'}
                      fill="transparent"
                      stroke="#3b82f6"
                      strokeWidth={hoveredFirstPoint ? '3' : '1.5'}
                      className="animate-ping pointer-events-none"
                    />
                  )}

                  {/* Main vertex circle node (Visual-only, pointer-events-none) */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={selectedPointIds.includes(pt.id) ? '9' : isPointDragging ? '9.5' : isPointHovered ? '8.5' : '6.5'}
                    fill={
                      selectedPointIds.includes(pt.id)
                        ? '#f59e0b'
                        : isFirst && !isClosed
                        ? '#3b82f6'
                        : isClosed
                        ? '#10b981'
                        : '#3b82f6'
                    }
                    stroke={selectedPointIds.includes(pt.id) ? '#ffffff' : canClose ? '#f59e0b' : '#ffffff'}
                    strokeWidth={selectedPointIds.includes(pt.id) ? '2.5' : isPointDragging || isPointHovered ? '3' : '2'}
                    className="transition-all duration-150 pointer-events-none"
                  />

                  {/* INVISIBLE HIT-AREA OVERLAY CIRCLE (Highly stable click, drag, and hover target) */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="18"
                    fill="transparent"
                    className="cursor-pointer select-none"
                    style={{ pointerEvents: 'auto' }}
                    onMouseDown={(e) => handlePointDragStart(e, pt.id)}
                    onMouseEnter={() => {
                      setHoveredPointId(pt.id);
                      if (isFirst) handleMouseMoveOverFirstPoint(null as any);
                    }}
                    onMouseLeave={() => {
                      setHoveredPointId(null);
                      if (isFirst) setHoveredFirstPoint(false);
                    }}
                  />

                  {/* Vertex labels (P1, P2...) */}
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fill="#94a3b8"
                    className="text-[10px] font-bold font-mono pointer-events-none select-none filter drop-shadow"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Help tooltip on closing node */}
        {hoveredFirstPoint && points.length >= 3 && !isClosed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/95 border border-amber-500/30 px-3 py-2 rounded-lg text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-950/20 max-w-xs pointer-events-none">
            <Sparkles className="text-amber-400" size={13} />
            Klik titik awal untuk menutup poligon tanah!
          </div>
        )}
      </div>

      {/* Canvas Bottom Bar / Real-world scale calibration slider */}
      <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Compass size={14} className="text-gray-400" />
            Kalibrasi Skala Lapangan (Piksel ke Meter)
          </div>
          <div className="text-[11px] text-slate-500">
            Geser untuk menyesuaikan ukuran grid di lokasi nyata demi kalkulasi akurat.
          </div>
        </div>

        {/* Scaling factors sliders */}
        <div className="flex items-center gap-3 w-full md:w-auto md:max-w-xs">
          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">Sempit (1m = 80px)</span>
          <input
            type="range"
            min="5"
            max="80"
            step="1"
            value={scalePixelRatio}
            onChange={(e) => setScalePixelRatio(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            id="scale-slider"
          />
          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">Luas (1m = 5px)</span>
        </div>

        {/* Micro-input to write direct scalar */}
        <div className="flex items-center gap-2 self-end md:self-auto bg-slate-900 px-3 py-1.5 border border-slate-850 rounded-lg">
          <span className="text-[11px] text-slate-400 font-mono">1 Meter =</span>
          <input
            type="number"
            value={Math.round(scalePixelRatio)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val > 0) setScalePixelRatio(val);
            }}
            className="w-12 text-center text-xs font-bold font-mono bg-slate-950 text-emerald-400 border border-slate-800 rounded py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            id="scale-num-input"
          />
          <span className="text-[11px] text-slate-500 font-mono">piksel</span>
        </div>
      </div>

      {/* Table grid for Precision Manual Coordinates Correction */}
      {points.length > 0 && (
        <div className="bg-slate-950 p-5 border-t border-slate-850/80" id="manual-coords-correction">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shadow-sm animate-pulse"></span>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Daftar & Koreksi Koordinat Patok Presisi (Meter)
              </h4>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Origin (0,0) = Pojok Kiri Atas Canvas • Skala: 1m = {scalePixelRatio.toFixed(2)}px
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {points.map((pt, idx) => {
              const xVal = parseFloat((pt.x / scalePixelRatio).toFixed(2));
              const yVal = parseFloat((pt.y / scalePixelRatio).toFixed(2));

              return (
                <div 
                  key={pt.id} 
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] font-black flex items-center justify-center">
                      {pt.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center justify-between gap-1 bg-slate-950 border border-slate-850 rounded px-2 py-1 flex-1">
                      <span className="text-[9px] font-mono text-slate-550 font-bold">X:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={xVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const newX = val * scalePixelRatio;
                            const updated = points.map(p => p.id === pt.id ? { ...p, x: newX } : p);
                            setPoints(updated);
                          }
                        }}
                        className="w-full bg-transparent border-none text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:ring-0 p-0 text-right min-w-[30px]"
                      />
                      <span className="text-[9px] font-mono text-slate-550">m</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 bg-slate-950 border border-slate-850 rounded px-2 py-1 flex-1">
                      <span className="text-[9px] font-mono text-slate-550 font-bold">Y:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={yVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const newY = val * scalePixelRatio;
                            const updated = points.map(p => p.id === pt.id ? { ...p, y: newY } : p);
                            setPoints(updated);
                          }
                        }}
                        className="w-full bg-transparent border-none text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:ring-0 p-0 text-right min-w-[30px]"
                      />
                      <span className="text-[9px] font-mono text-slate-550">m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 text-[10px] text-slate-450 leading-relaxed bg-[#0b0d10] border border-slate-800 p-2.5 rounded-lg flex items-start gap-1.5">
            <span className="text-amber-400 font-bold font-mono">TIPS:</span>
            <span>
              Anda bebas meletakkan patok di mana saja di canvas tanpa dipaksa mengunci ke petak grid. Tuliskan nilai meter presisi di tabel atas (misal X: 12.50) untuk menyesuaikan ketepatan rill sesuai data riwayat pengukuran lapangan atau surat BPN Anda.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
