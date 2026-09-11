"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";

interface ComparePieChartProps {
  dataA: CategoryTotal[];
  dataB: CategoryTotal[];
  periodALabel: string;
  periodBLabel: string;
}

// PRD 7.1: iç içe iki halka — iç halka Dönem A, dış halka Dönem B; her
// ikisinde de dilimler kategori rengiyle boyanır.
export default function ComparePieChart({ dataA, dataB, periodALabel, periodBLabel }: ComparePieChartProps) {
  if (dataA.length === 0 && dataB.length === 0) {
    return <p className="text-xs font-medium text-muted">Seçili dönemlerde harcama yok.</p>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={dataA} dataKey="total" nameKey="name" innerRadius={34} outerRadius={60} paddingAngle={2}>
            {dataA.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Pie>
          <Pie data={dataB} dataKey="total" nameKey="name" innerRadius={68} outerRadius={95} paddingAngle={2}>
            {dataB.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-[11px] font-medium text-muted">
        İç halka: {periodALabel} · Dış halka: {periodBLabel}
      </p>
    </>
  );
}
