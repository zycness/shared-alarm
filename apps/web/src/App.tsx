import { SharePage } from "./pages/SharePage";

function getTokenFromPath(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/share\/(.+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const token = getTokenFromPath();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Shared Alarm
          </h1>
          <p className="text-gray-500">
            Use a shared link to view and extend an alarm.
          </p>
        </div>
      </div>
    );
  }

  return <SharePage token={token} />;
}
