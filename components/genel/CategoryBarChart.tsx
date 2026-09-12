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
import {
  CHART_CURSOR_FILL,
  CHART_GRID,
  CHART_TICK,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chartTheme";
import { formatCurrency } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";

interface CategoryBarChartProps {
  data: CategoryTotal[];
  onBarClick?: (categoryId: string) => void;
}

// SVG id'lerinde güvenli olmayan karakterleri (örn. Supabase UUID'lerindeki
// bazı semboller değil ama savunmacı olmak için) temizler.
function shimmerGradientId(categoryId: string): string {
  return `savingShimmer-${categoryId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export default function CategoryBarChart({ data, onBarClick }: CategoryBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        {/* Tasarruf segmentinin shimmer/parlama efekti — bkz. Teknik Analiz
            Bölüm 5.3. Her kategori kendi rengiyle bir gradient alır (tasarruf
            segmenti ilgili kategorinin renginde olmalı); x1/x2'yi animate
            ederek gradient'i soldan sağa kaydırır. */}
        <defs>
          {data.map((entry) => (
            <linearGradient key={entry.id} id={shimmerGradientId(entry.id)} x1="-0.4" y1="0" x2="0.6" y2="0">
              <animate attributeName="x1" values="-0.4;1.4" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="x2" values="0.6;2.4" dur="2.4s" repeatCount="indefinite" />
              <stop offset="0%" stopColor={entry.color} stopOpacity={0.25} />
              <stop offset="50%" stopColor={entry.color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={entry.color} stopOpacity={0.25} />
            </linearGradient>
          ))}
        </defs>
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
          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          cursor={{ fill: CHART_CURSOR_FILL }}
        />
        <Bar
          dataKey="total"
          name="Toplam"
          stackId="cat"
          onClick={(item: { payload?: CategoryTotal }) => {
            const entry = item.payload;
            if (!onBarClick || !entry) return;
            onBarClick(entry.id);
          }}
        >
          {data.map((entry) => (
            // Tasarruf segmenti varsa sağ kenar köşeli kalır (segment onun
            // ucuna eklenecek); yoksa bu segment barın kendisi dış uç olur.
            // Recharts'ın Cell tipi radius'u string|number ile sınırlıyor,
            // ama alttaki Rectangle shape'i (Bar'ın kendisi gibi) dizi de
            // kabul ediyor — bkz. recharts/types/shape/Rectangle.d.ts.
            <Cell
              key={entry.id}
              fill={entry.color}
              cursor={onBarClick ? "pointer" : "default"}
              // @ts-expect-error -- Cell tipi radius dizisini kabul etmiyor, Rectangle shape'i kabul ediyor
              radius={entry.savingSegment ? [0, 0, 0, 0] : [0, 8, 8, 0]}
            />
          ))}
        </Bar>
        {/* Tasarruf segmenti: ilgili kategorinin harcama barının ucuna eklenen,
            görsel olarak net ayrışan (yarı transparan + shimmer + kesikli
            kenarlık) stacked bir parça. Tıklanamaz — harcama ekleme akışını
            tetiklemez (bkz. PRD 7.2). */}
        <Bar dataKey="savingSegment" name="Tasarruf" stackId="cat">
          {data.map((entry) => (
            <Cell
              key={entry.id}
              fill={`url(#${shimmerGradientId(entry.id)})`}
              stroke={entry.color}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              // @ts-expect-error -- Cell tipi radius dizisini kabul etmiyor, Rectangle shape'i kabul ediyor
              radius={[0, 8, 8, 0]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
