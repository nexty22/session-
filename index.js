// ===============================
// ✅ NEXTY SESSION GENERATOR
// ===============================
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { zipSessionToBase64, makeNextySession } from "./session-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Ensure sessions folder exists
if (!fs.existsSync("./sessions")) fs.mkdirSync("./sessions");

// ✅ Keep all active sockets
const sockets = {};

// ✅ Serve static files (index.html)
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// 🚀 Generate QR + Session
// ===============================
app.post("/start", async (req, res) => {
  try {
    const clientId = req.body.clientId || Date.now().toString();
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${clientId}`);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    sockets[clientId] = { sock, saveCreds };

    sock.ev.on("connection.update", async (update) => {
      const { qr, connection, lastDisconnect } = update;

      if (qr) {
        console.log("✅ QR generated for client:", clientId);
        sockets[clientId].qr = await qrcode.toDataURL(qr);
      }

      if (connection === "open") {
        console.log("🟢 Connected successfully:", clientId);
        const base64 = await zipSessionToBase64(`./sessions/${clientId}`);
        sockets[clientId].sessionID = makeNextySession(base64);
      }

      if (connection === "close") {
        console.log("🔴 Connection closed:", lastDisconnect?.error?.message);
      }
    });

    res.json({ ok: true, clientId });
  } catch (err) {
    console.error("❌ Error creating session:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

// ===============================
// 📤 Get QR (Polling)
// ===============================
app.get("/qr", (req, res) => {
  const client = sockets[req.query.clientId];
  if (client && client.qr) {
    res.json({ qr: client.qr });
  } else {
    res.json({ qr: null });
  }
});

// ===============================
// 📩 Get Session ID
// ===============================
app.get("/session", (req, res) => {
  const client = sockets[req.query.clientId];
  if (client && client.sessionID) {
    res.json({ session: client.sessionID });
  } else {
    res.json({ session: null });
  }
});

// ===============================
// 🚀 Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Nexty Session Generator running on port ${PORT}`);
});
