import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/ui/Header";
import { Home } from "./pages/Home";
import { Multiplayer } from "./pages/Multiplayer";
import { Profile } from "./pages/Profile";


export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/multiplayer" element={<Multiplayer />} />
          <Route path="/profile" element={<Profile />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}