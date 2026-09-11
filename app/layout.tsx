import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WALLT",
  description: "Harcamalarını kategorilere ayırarak takip et.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-page text-ink">
        {children}
      </body>
    </html>
  );
}
