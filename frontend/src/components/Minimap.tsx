import { useMemo } from 'react';
import { useSeatStore } from '../store/seatStore';
import { STATUS_COLORS } from '../types/venue';

const MINIMAP_W = 260;
const MINIMAP_H = 190;

export function Minimap() {
  const venue = useSeatStore((s) => s.venue);
  const { x: viewportX, y: viewportY, viewW: viewportW, viewH: viewportH } = useSeatStore((s) => s.viewportInfo);

  if (!venue) return null;

  const { map } = venue;
  const scaleX = MINIMAP_W / map.width;
  const scaleY = MINIMAP_H / map.height;
  const scale = Math.min(scaleX, scaleY);

  const sectionRects = useMemo(() => {
    return venue.sections.map((section) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const row of section.rows) {
        for (const seat of row.seats) {
          if (seat.x < minX) minX = seat.x;
          if (seat.y < minY) minY = seat.y;
          if (seat.x > maxX) maxX = seat.x;
          if (seat.y > maxY) maxY = seat.y;
        }
      }
      return {
        id: section.id,
        label: section.id,
        x: minX * scale,
        y: minY * scale,
        w: (maxX - minX + 20) * scale,
        h: (maxY - minY + 20) * scale,
        tier: section.rows[0]?.seats[0]?.priceTier || 3,
      };
    });
  }, [venue.sections, scale]);

  const tierColors: Record<number, string> = {
    1: STATUS_COLORS.available,
    2: '#60a5fa',
    3: '#a78bfa',
    4: '#fbbf24',
  };

  const vx = Math.max(0, viewportX * scale);
  const vy = Math.max(0, viewportY * scale);
  const vw = Math.min(MINIMAP_W - vx, viewportW * scale);
  const vh = Math.min(MINIMAP_H - vy, viewportH * scale);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Venue Overview</h3>
      </div>
      <div className="p-2">
        <svg width={MINIMAP_W} height={MINIMAP_H} className="block">
          <rect width={MINIMAP_W} height={MINIMAP_H} fill="#f9fafb" rx={4} />

          {sectionRects.map((s) => (
            <g key={s.id}>
              <rect
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={2}
                fill={tierColors[s.tier] || '#d1d5db'}
                fillOpacity={0.5}
                stroke="#9ca3af"
                strokeWidth={0.5}
              />
              <text
                x={s.x + s.w / 2}
                y={s.y + s.h / 2 + 3}
                textAnchor="middle"
                fontSize={8}
                fill="#374151"
                fontWeight="bold"
              >
                {s.label}
              </text>
            </g>
          ))}

          {/* Viewport indicator */}
          <rect
            x={vx}
            y={vy}
            width={Math.max(4, vw)}
            height={Math.max(4, vh)}
            fill="rgba(59,130,246,0.15)"
            stroke="#2563eb"
            strokeWidth={1.5}
            rx={1}
          />
        </svg>
      </div>
    </div>
  );
}
