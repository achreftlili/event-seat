import { useState, useCallback, useRef, useEffect } from 'react';

interface ViewportState {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const BUFFER = 200;

export function useViewport(mapWidth: number, mapHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    width: mapWidth,
    height: mapHeight,
    scale: 1,
  });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setViewport((v) => ({ ...v, width: rect.width, height: rect.height }));
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport((v) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * delta));
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return v;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const svgX = v.x + mouseX / v.scale;
        const svgY = v.y + mouseY / v.scale;
        return {
          ...v,
          scale: newScale,
          x: svgX - mouseX / newScale,
          y: svgY - mouseY / newScale,
        };
      });
    },
    []
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setViewport((v) => ({
      ...v,
      x: v.x - dx / v.scale,
      y: v.y - dy / v.scale,
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const isInViewport = useCallback(
    (x: number, y: number): boolean => {
      const { x: vx, y: vy, width, height, scale } = viewport;
      const viewW = width / scale;
      const viewH = height / scale;
      return (
        x >= vx - BUFFER &&
        x <= vx + viewW + BUFFER &&
        y >= vy - BUFFER &&
        y <= vy + viewH + BUFFER
      );
    },
    [viewport]
  );

  const viewBox = `${viewport.x} ${viewport.y} ${viewport.width / viewport.scale} ${viewport.height / viewport.scale}`;

  return {
    containerRef,
    viewport,
    viewBox,
    isInViewport,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
