import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import qrcode from "qrcode";
import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { zipSessionToBase64, makeNextySession } from "./session-utils.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const sockets = {};

app.use(express.static(path.join(__dirname, "frontend")));

app.post("/start", async (req, res) => {
  const clientId = req.body.clientId || Date.now().toString();
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${clientId}`);

  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  sockets[clientId] = { sock, saveCreds };

  sock.ev.on("connection.update", async (update) => {
    if (update.qr) {
      sockets[clientId].qr = await qrcode.toDataURL(update.qr);
    }
    if (update.connection === "open") {
      const base64 = await zipSessionToBase64(`./sessions/${clientId}`);
      sockets[clientId].sessionID = makeNextySession(base64);
    }
  });

  res.json({ ok: true, clientId });
});

app.get("/qr", (req, res) => {
  const c = sockets[req.query.clientId];
  res.json({ qr: c?.qr || null });
});

app.get("/session", (req, res) => {
  const c = sockets[req.query.clientId];
  res.json({ session: c?.sessionID || null });
});

app.listen(PORT, () => console.log(`🚀 Nexty Session Generator running on port ${PORT}`));
