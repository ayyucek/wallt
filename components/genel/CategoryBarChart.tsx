"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";

interface CategoryBarChartProps {
  data: CategoryTotal[];
}

export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} horizontal={false} />
        <XAxis type="number" tick={CHART_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={CHART_TICK}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={CHART_TOOLTIP_STYLE}
          cursor={{ fill: "rgba(43,38,64,0.04)" }}
        />
        <Bar dataKey="total" name="Toplam" radius={[0, 8, 8, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.id}
              fill={entry.color}
              stroke={entry.isSaving ? entry.color : "none"}
              strokeWidth={entry.isSaving ? 1.5 : 0}
              strokeDasharray={entry.isSaving ? "5 4" : undefined}
              fillOpacity={entry.isSaving ? 0.35 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
