export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="w-full max-w-sm rounded-card bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-4xl font-bold text-ink">WALLT</h1>
        <p className="mt-2 text-sm text-muted">Faz 0 — kurulum tamamlandı</p>
        <button className="mt-6 rounded-pill bg-category-yemek px-6 py-3 font-sans text-sm font-medium text-white shadow-btn-primary">
          Harcama Ekle
        </button>
      </div>
    </div>
  );
}
