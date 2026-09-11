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
import { CHART_CURSOR_FILL, CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";

interface CategoryBarChartProps {
  data: CategoryTotal[];
  onBarClick?: (categoryId: string) => void;
}

export default function CategoryBarChart({ data, onBarClick }: CategoryBarChartProps) {
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
          cursor={{ fill: CHART_CURSOR_FILL }}
        />
        <Bar
          dataKey="total"
          name="Toplam"
          radius={[0, 8, 8, 0]}
          onClick={(item: { payload?: CategoryTotal }) => {
            const entry = item.payload;
            if (!onBarClick || !entry || entry.isSaving) return;
            onBarClick(entry.id);
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.id}
              fill={entry.color}
              stroke={entry.isSaving ? entry.color : "none"}
              strokeWidth={entry.isSaving ? 1.5 : 0}
              strokeDasharray={entry.isSaving ? "5 4" : undefined}
              fillOpacity={entry.isSaving ? 0.35 : 1}
              cursor={onBarClick && !entry.isSaving ? "pointer" : "default"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
