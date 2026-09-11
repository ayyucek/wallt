// app/icon.tsx, app/apple-icon.tsx ve app/manifest-icons/*/route.tsx tarafından
// paylaşılan ikon markası — marka gradient'i (Teknik Analiz Bölüm 4) üzerinde "W".
export function WalltIconMark({ size, padding }: { size: number; padding: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #7B5FE0 0%, #4F7FE0 100%)",
      }}
    >
      <div
        style={{
          width: size - padding * 2,
          height: size - padding * 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: (size - padding * 2) * 0.56,
          color: "#ffffff",
        }}
      >
        W
      </div>
    </div>
  );
}
