import { useVenueData } from './hooks/useVenueData';
import { useWebSocket } from './hooks/useWebSocket';
import { SeatingMap } from './components/SeatingMap';
import { Minimap } from './components/Minimap';
import { SeatDetail } from './components/SeatDetail';
import { SelectionSummary } from './components/SelectionSummary';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { useSeatStore } from './store/seatStore';

export default function App() {
  const { loading, error } = useVenueData();
  const venue = useSeatStore((s) => s.venue);
  const userEmail = useSeatStore((s) => s.userEmail);
  const setUserEmail = useSeatStore((s) => s.setUserEmail);

  const { connected, userCount, sendToggleSeat, sendClearSelection } = useWebSocket(userEmail);

  if (!userEmail) {
    return <LoginScreen onLogin={setUserEmail} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading venue data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {venue?.name || 'Event Seating Map'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Click available seats to reserve them. Changes are shared in real-time.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              {connected ? `${userCount} online` : 'Disconnected'}
            </div>
            <div className="text-sm text-gray-600">{userEmail}</div>
            <button
              onClick={() => setUserEmail(null)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Panel — Minimap + Seat Details */}
          <div className="w-full lg:w-72 space-y-4 shrink-0">
            <Minimap />
            <SeatDetail />
          </div>

          {/* Center — Seating Map */}
          <div className="flex-1 h-[600px] lg:h-[700px] min-w-0">
            <SeatingMap onSeatToggle={sendToggleSeat} />
          </div>

          {/* Right Panel — Selection Summary */}
          <div className="w-full lg:w-72 space-y-4 shrink-0">
            <SelectionSummary onClearSelection={sendClearSelection} />
          </div>
        </div>
      </main>

      <Toast />
    </div>
  );
}
