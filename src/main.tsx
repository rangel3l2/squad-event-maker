import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { carregarEventoAtual } from "@/services/api";

// Lê o código do evento (public/evento.txt) antes de renderizar o app
carregarEventoAtual().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
