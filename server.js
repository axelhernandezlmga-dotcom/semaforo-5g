import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ====== Almacenamiento en memoria (simple para demo) ======
const store = { "5G": [], "4G": [] };

function statsFor(network) {
  const arr = store[network] || [];
  if (arr.length === 0) {
    return { samples: 0, min: null, avg: null, max: null };
  }
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return { samples: arr.length, min, avg, max };
}

function getStats() {
  return {
    "5G": statsFor("5G"),
    "4G": statsFor("4G"),
  };
}

function broadcast(json) {
  const msg = JSON.stringify(json);
  wss.clients.forEach((client) => {
    try {
      client.send(msg);
    } catch {}
  });
}

// ====== Endpoints ======

// Enviar alerta desde Ambulancia (incluye red elegida)
app.post("/alert", (req, res) => {
  const { networkType = "UNKNOWN" } = req.body || {};
  const event = { type: "ALERT", networkType, serverSentAt: Date.now() };
  broadcast(event); // el Semáforo escucha esto
  res.json({ ok: true, event });
});

// El Semáforo reporta la latencia medida
app.post("/latency", (req, res) => {
  const { networkType, latencyMs } = req.body || {};
  if (!networkType || typeof latencyMs !== "number") {
    return res.status(400).json({ ok: false, error: "Payload inválido" });
  }
  if (!store[networkType]) store[networkType] = [];
  store[networkType].push(latencyMs);

  const s = getStats();
  broadcast({ type: "STATS_UPDATE", stats: s }); // Actualiza Resultados en vivo
  res.json({ ok: true, stats: s });
});

// Consultar estadísticas actuales
app.get("/stats", (req, res) => {
  res.json(getStats());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
