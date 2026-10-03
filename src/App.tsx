import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/ui/Header";
import { Home } from "./pages/Home";
import { Multiplayer } from "./pages/Multiplayer";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/multiplayer" element={<Multiplayer />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}