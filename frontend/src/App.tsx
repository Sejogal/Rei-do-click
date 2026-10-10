import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/ui/Header";
import { Home } from "./pages/Home";
import { Multiplayer } from "./pages/Multiplayer";
import { Profile } from "./pages/Profile";
import { Auth } from "./pages/Auth";
import { Leaderboard } from "./pages/Leaderboard";
import { Settings } from "./pages/Settings";
import { AdminPage } from "./pages/AdminPage";
import { AboutPage } from "./pages/AboutPage";
import { PublicProfile } from "./pages/PublicProfile";
import { Friends } from "./pages/Friends";
import { useAuth } from "./store/auth";
import { useNotifications } from "./store/notifications";
import { ToastViewport } from "./components/ui/Toast";
import { Tournaments } from "./pages/Tournaments";
import { TournamentView } from "./pages/TournamentView";
import { useTheme } from "./store/theme";



export default function App() {
  const user = useAuth((state) => state.user);
  const refreshNotifications = useNotifications((state) => state.refresh);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", useTheme.getState().theme);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let presence: WebSocket | null = null;
    void refreshNotifications(false).catch(() => {});
    const timer = window.setInterval(() => { if (active) void refreshNotifications(true).catch(() => {}); }, 12000);
    const token = localStorage.getItem("typearena-token");
    if (token) {
      const api = (import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000").replace(/\/+$/, "");
      const wsUrl = api.replace(/^http/, "ws") + `/ws/presence?token=${encodeURIComponent(token)}`;
      presence = new WebSocket(wsUrl);
    }
    return () => { active = false; window.clearInterval(timer); presence?.close(); };
  }, [user?.id, refreshNotifications]);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/multiplayer" element={<Multiplayer />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/sobre" element={<AboutPage />} />


        </Routes>
        <ToastViewport />
      </div>
    </BrowserRouter>
  );
}
