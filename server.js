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

// ====== Almacenamiento en memoria ======
const store = { "5G": [], "4G": [], "3G": [] };

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
    "3G": statsFor("3G"),
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

// Ambulancia envía alerta (sin demoras simuladas)
app.post("/alert", (req, res) => {
  const { networkType = "UNKNOWN", packetSize = "500MB", clientSentAt } =
    req.body || {};

  const event = {
    type: "ALERT",
    networkType,
    packetSize,
    clientSentAt: typeof clientSentAt === "number" ? clientSentAt : null,
    serverReceivedAt: Date.now(),
  };

  broadcast({ ...event, serverSentAt: Date.now() });

  res.json({ ok: true, event });
});

// Semáforo reporta latencia
app.post("/latency", (req, res) => {
  const { networkType, latencyMs } = req.body || {};
  if (!networkType || typeof latencyMs !== "number") {
    return res.status(400).json({ ok: false, error: "Payload inválido" });
  }
  if (!store[networkType]) store[networkType] = [];
  store[networkType].push(latencyMs);

  const s = getStats();
  broadcast({ type: "STATS_UPDATE", stats: s });
  res.json({ ok: true, stats: s });
});

// Consultar estadísticas
app.get("/stats", (_req, res) => {
  res.json(getStats());
});

// ====== Reset simple (botón borrar datos) ======
app.post("/reset", (_req, res) => {
  store["5G"] = [];
  store["4G"] = [];
  store["3G"] = [];
  const s = getStats();
  broadcast({ type: "STATS_UPDATE", stats: s });
  res.json({ ok: true, stats: s });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("✅ Server running on port", PORT));
