interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-[88px] left-1/2 z-50 max-w-[88%] -translate-x-1/2 rounded-pill bg-ink px-5 py-2.5 text-center font-sans text-xs font-semibold text-page shadow-card">
      {message}
    </div>
  );
}
