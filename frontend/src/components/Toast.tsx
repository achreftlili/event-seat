import { useSeatStore } from '../store/seatStore';

export function Toast() {
  const message = useSeatStore((s) => s.toastMessage);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
    >
      {message}
    </div>
  );
}
