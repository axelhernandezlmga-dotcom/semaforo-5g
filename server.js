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

function broadcast(json) {
  const msg = JSON.stringify(json);
  wss.clients.forEach((client) => {
    try {
      client.send(msg);
    } catch {}
  });
}

app.post("/alert", (req, res) => {
  const event = { type: "ALERT", serverSentAt: Date.now() };
  broadcast(event);
  res.json({ ok: true, event });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
