import { SharePage } from "./pages/SharePage";
import { t } from "./i18n";

function getTokenFromPath(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/share\/(.+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const token = getTokenFromPath();

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-float">&#x23F0;</div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            {t("sharedAlarm")}
          </h1>
          <p className="text-indigo-300/70 text-lg max-w-sm mx-auto">
            {t("useSharedLink")}
          </p>
        </div>
      </div>
    );
  }

  return <SharePage token={token} />;
}
