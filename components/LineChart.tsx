import React, { useState } from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

export interface ChartPoint {
  key: string;    // YYYY-MM-DD (for sorting & alignment)
  label: string;  // display label e.g. "Apr 24"
  value: number;
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  points: ChartPoint[];
}

interface TooltipState {
  cx: number;
  cy: number;
  value: number;
  label: string;
  name: string;
  color: string;
}

const PAD = { top: 20, right: 16, bottom: 44, left: 44 };
const TIP_W = 130;
const TIP_H = 60;

interface Props {
  series: ChartSeries[];
  width: number;
  height?: number;
  isDark?: boolean;
}

export function LineChart({ series, width, height = 220, isDark = false }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const textColor = isDark ? '#737373' : '#a3a3a3';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#1f1f1f' : '#ffffff';
  const dotFill = isDark ? '#111111' : '#ffffff';

  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const allPoints = series.flatMap(s => s.points);

  if (allPoints.length === 0) {
    return (
      <Svg width={width} height={height}>
        <SvgText fill={textColor} fontSize={13} textAnchor="middle" x={width / 2} y={height / 2}>
          No data yet
        </SvgText>
      </Svg>
    );
  }

  // Shared X axis — union of all date keys, sorted chronologically (YYYY-MM-DD sorts correctly)
  const allKeys = [...new Set(allPoints.map(p => p.key))].sort();
  const labelMap = new Map(allPoints.map(p => [p.key, p.label]));

  // Global Y range across all series
  const allValues = allPoints.map(p => p.value);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const rawRange = maxVal === minVal ? Math.max(maxVal * 0.1, 1) : maxVal - minVal;
  const displayMin = minVal - rawRange * 0.15;
  const displayMax = maxVal + rawRange * 0.15;
  const displayRange = displayMax - displayMin;

  function xPos(key: string) {
    const idx = allKeys.indexOf(key);
    return PAD.left + (allKeys.length === 1 ? W / 2 : (idx / (allKeys.length - 1)) * W);
  }
  function yPos(v: number) {
    return PAD.top + H - ((v - displayMin) / displayRange) * H;
  }

  // Y axis: 4 ticks
  const yTicks = [0, 0.33, 0.67, 1].map(t => displayMin + t * displayRange);

  // X axis: at most 5 labels, always include first and last
  const xStep = Math.max(1, Math.ceil(allKeys.length / 5));
  const xLabelKeys = allKeys.filter((_, i) => i === 0 || i === allKeys.length - 1 || i % xStep === 0);

  // Tooltip positioning — clamp inside chart
  function tipX(cx: number) {
    return Math.max(PAD.left, Math.min(cx - TIP_W / 2, PAD.left + W - TIP_W));
  }
  function tipY(cy: number) {
    const above = cy - TIP_H - 12;
    return above < PAD.top ? cy + 14 : above;
  }

  function fmtVal(v: number) {
    return v >= 10000 ? `${(v / 1000).toFixed(1)}k` : Number.isInteger(v) ? `${v}` : v.toFixed(1);
  }

  return (
    <Svg width={width} height={height}>
      {/* Tap background to dismiss tooltip */}
      <Rect x={0} y={0} width={width} height={height} fill="transparent" onPress={() => setTooltip(null)} />

      {/* Y grid + labels */}
      {yTicks.map((tick, i) => (
        <G key={i}>
          <Line x1={PAD.left} y1={yPos(tick)} x2={PAD.left + W} y2={yPos(tick)} stroke={gridColor} strokeWidth={1} />
          <SvgText x={PAD.left - 6} y={yPos(tick) + 4} fontSize={9} fill={textColor} textAnchor="end">
            {fmtVal(tick)}
          </SvgText>
        </G>
      ))}

      {/* X labels */}
      {xLabelKeys.map(key => (
        <SvgText key={key} x={xPos(key)} y={height - 6} fontSize={9} fill={textColor} textAnchor="middle">
          {labelMap.get(key) ?? key}
        </SvgText>
      ))}

      {/* Lines */}
      {series.map(s => {
        if (s.points.length < 2) return null;
        const d = s.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.key).toFixed(1)} ${yPos(p.value).toFixed(1)}`)
          .join(' ');
        return (
          <Path key={`line-${s.id}`} d={d} stroke={s.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      })}

      {/* Dots (rendered after lines so they're on top) */}
      {series.map(s =>
        s.points.map((p, pi) => {
          const cx = xPos(p.key);
          const cy = yPos(p.value);
          const active = tooltip?.name === s.name && tooltip?.cx === cx && tooltip?.cy === cy;
          return (
            <Circle
              key={`${s.id}-${pi}`}
              cx={cx} cy={cy}
              r={active ? 6 : 4}
              fill={active ? s.color : dotFill}
              stroke={s.color}
              strokeWidth={2}
              onPress={() => {
                if (active) { setTooltip(null); return; }
                setTooltip({ cx, cy, value: p.value, label: p.label, name: s.name, color: s.color });
              }}
            />
          );
        }),
      )}

      {/* Tooltip */}
      {tooltip && (() => {
        const tx = tipX(tooltip.cx);
        const ty = tipY(tooltip.cy);
        const midX = tx + TIP_W / 2;
        return (
          <G>
            <Rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx={10} fill={tooltipBg} stroke={tooltip.color} strokeWidth={1.5} />
            <SvgText x={midX} y={ty + 15} fontSize={9} fill={textColor} textAnchor="middle">{tooltip.name}</SvgText>
            <SvgText x={midX} y={ty + 36} fontSize={18} fontWeight="700" fill={tooltip.color} textAnchor="middle">
              {fmtVal(tooltip.value)}
            </SvgText>
            <SvgText x={midX} y={ty + 52} fontSize={9} fill={textColor} textAnchor="middle">{tooltip.label}</SvgText>
          </G>
        );
      })()}
    </Svg>
  );
}
