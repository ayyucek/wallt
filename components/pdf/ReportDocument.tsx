import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";

// react-pdf tarayıcının CSS/font motorunu kullanmaz — Inter'i gerçek bir
// .woff dosyasından yüklüyoruz (public/fonts/, Google Fonts'tan indirilip
// projeye gömüldü; dış bir URL'e çalışma zamanında bağımlı kalmamak için).
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.woff", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.woff", fontWeight: 700 },
  ],
});

// Bölüm 4'teki renk tokenlarının ham hex karşılıkları (StyleSheet Tailwind
// sınıfı kabul etmez).
const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 11,
    color: "#2b2640", // ink
    backgroundColor: "#faf6f1", // page
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#9891a8", // muted
    marginBottom: 20,
  },
  totalCard: {
    backgroundColor: "#ffffff", // card
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 10,
    color: "#9891a8",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 11,
    color: "#9891a8",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eae4da",
    paddingVertical: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  rowValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  footer: {
    marginTop: 24,
    fontSize: 9,
    color: "#9891a8",
  },
});

interface ReportDocumentProps {
  rangeLabel: string;
  total: number;
  categories: CategoryTotal[]; // total > 0 olanlar, büyükten küçüğe sıralı
  generatedAt: string;
}

export default function ReportDocument({
  rangeLabel,
  total,
  categories,
  generatedAt,
}: ReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>WALLT — Harcama Raporu</Text>
        <Text style={styles.subtitle}>{rangeLabel}</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Toplam Harcama</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Kategori Kırılımı</Text>
        {categories.length === 0 ? (
          <Text style={styles.emptyText}>Bu dönemde harcama yok.</Text>
        ) : (
          categories.map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <Text style={styles.rowLabel}>{c.name}</Text>
              </View>
              <Text style={styles.rowValue}>{formatCurrency(c.total)}</Text>
            </View>
          ))
        )}

        <Text style={styles.footer}>WALLT ile {generatedAt} tarihinde oluşturuldu.</Text>
      </Page>
    </Document>
  );
}
