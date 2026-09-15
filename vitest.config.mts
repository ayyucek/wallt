import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// tsconfig.json'daki "@/*" path alias'ı, TypeScript tarafından sadece tip
// kontrolünde çözülüyordu — runtime'da (değer import'larında) Vitest bunu
// hiç bilmiyordu. Type-only import'lar (örn. `import type ... from "@/lib/types"`)
// derleme sırasında tamamen elendiği için bu boşluk şimdiye kadar fark
// edilmemişti; FrequentChips.tsx'in `@/lib/categories`'den gerçek bir değer
// (SAVING_COLOR) import etmesiyle ortaya çıktı.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
