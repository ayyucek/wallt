"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, PERIOD_A, PERIOD_B } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { CompareBarEntry } from "@/lib/types";

interface CompareBarChartProps {
  data: CompareBarEntry[];
  periodALabel: string;
  periodBLabel: string;
}

export default function CompareBarChart({ data, periodALabel, periodBLabel }: CompareBarChartProps) {
  if (data.length === 0) {
    return <p className="text-xs font-medium text-muted">Seçili dönemlerde harcama yok.</p>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={CHART_TICK}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={46}
          />
          <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="A" fill={PERIOD_A} radius={[8, 8, 0, 0]} name={periodALabel} />
          <Bar dataKey="B" fill={PERIOD_B} radius={[8, 8, 0, 0]} name={periodBLabel} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-periodA" /> {periodALabel}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-periodB" /> {periodBLabel}
        </div>
      </div>
    </>
  );
}
