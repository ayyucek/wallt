"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_GRID, CHART_MUTED, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { RadarEntry } from "@/lib/types";

interface CategoryRadarChartProps {
  data: RadarEntry[];
  average: number;
}

const RADAR_ACCENT = "#7b5fe0"; // brand-start (marka moru) — prototipte radar stroke/fill bu renk

export default function CategoryRadarChart({ data, average }: CategoryRadarChartProps) {
  if (data.length < 3) {
    return (
      <p className="text-xs font-medium text-muted">
        Bu grafiği görebilmek için seçili dönemde en az 3 kategoride harcama olmalı.
      </p>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke={CHART_GRID} />
          <PolarAngleAxis dataKey="category" tick={CHART_TICK} />
          <PolarRadiusAxis tick={{ fill: CHART_MUTED, fontSize: 9 }} axisLine={false} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={CHART_TOOLTIP_STYLE} />
          <Radar name="Harcama" dataKey="value" stroke={RADAR_ACCENT} fill={RADAR_ACCENT} fillOpacity={0.38} strokeWidth={2} />
          <Radar name="Ortalama" dataKey="average" stroke={CHART_MUTED} fill="none" strokeDasharray="5 4" strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-brand-start" /> Harcama
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-muted" /> Ortalama ({formatCurrency(average)})
        </div>
      </div>
    </>
  );
}
