"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_GRID, CHART_INK, CHART_MUTED, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { ParetoEntry } from "@/lib/types";

interface ParetoChartProps {
  data: ParetoEntry[];
}

export default function ParetoChart({ data }: ParetoChartProps) {
  if (data.length === 0) {
    return <p className="text-xs font-medium text-muted">Seçili dönemde harcama yok.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 4, right: 12, left: -22, bottom: 0 }}>
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
        <YAxis yAxisId="left" tick={CHART_TICK} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={CHART_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, name) =>
            String(name).toLowerCase().includes("kümülatif")
              ? [`%${value}`, name]
              : [formatCurrency(Number(value)), name]
          }
          contentStyle={CHART_TOOLTIP_STYLE}
        />
        <ReferenceLine
          yAxisId="right"
          y={80}
          stroke={CHART_MUTED}
          strokeDasharray="4 4"
          label={{ value: "%80", position: "right", fill: CHART_MUTED, fontSize: 10 }}
        />
        <Bar yAxisId="left" dataKey="total" name="Toplam" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.color} />
          ))}
        </Bar>
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumPct"
          name="Kümülatif %"
          stroke={CHART_INK}
          strokeWidth={2.5}
          dot={{ r: 3.5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
