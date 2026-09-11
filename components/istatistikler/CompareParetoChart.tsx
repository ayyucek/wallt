"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, PERIOD_A, PERIOD_B } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { CompareParetoEntry } from "@/lib/types";

interface CompareParetoChartProps {
  data: CompareParetoEntry[];
  periodALabel: string;
  periodBLabel: string;
}

export default function CompareParetoChart({ data, periodALabel, periodBLabel }: CompareParetoChartProps) {
  if (data.length === 0) {
    return <p className="text-xs font-medium text-muted">Seçili dönemlerde harcama yok.</p>;
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
        <Bar yAxisId="left" dataKey="a" fill={PERIOD_A} fillOpacity={0.85} radius={[6, 6, 0, 0]} name={periodALabel} />
        <Bar yAxisId="left" dataKey="b" fill={PERIOD_B} fillOpacity={0.85} radius={[6, 6, 0, 0]} name={periodBLabel} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumPctA"
          stroke={PERIOD_A}
          strokeWidth={2.5}
          dot={{ r: 3.5 }}
          name={`${periodALabel} kümülatif %`}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumPctB"
          stroke={PERIOD_B}
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 3.5 }}
          name={`${periodBLabel} kümülatif %`}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
