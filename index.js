// ===============================
// ✅ NEXTY SESSION ID GENERATOR
// Pair Code Style (No QR)
// ===============================
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pino from "pino";
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { zipSessionToBase64, makeNextySession } from "./session-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

if (!fs.existsSync("./sessions")) fs.mkdirSync("./sessions");

const sockets = {};

// Serve frontend
app.use(express.static(__dirname));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// ===============================
// 🚀 Generate Pair Code
// ===============================
app.post("/start", async (req, res) => {
  try {
    const clientId = req.body.clientId || Date.now().toString();
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${clientId}`);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      browser: ["NextyGen", "Chrome", "10.0"],
      logger: pino({ level: "silent" })
    });

    sockets[clientId] = { sock, saveCreds };

    // Pair code generation
    const code = await sock.requestPairingCode("923001234567"); // 👈 Replace with your phone number (E.164 format)
    sockets[clientId].pairCode = code;
    console.log("✅ Pair Code generated:", code);

    // Listen for successful connection
    sock.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log("🟢 WhatsApp connected!");
        const base64 = await zipSessionToBase64(`./sessions/${clientId}`);
        sockets[clientId].sessionID = makeNextySession(base64);
      }
    });

    res.json({ ok: true, clientId });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Failed to start" });
  }
});

// ===============================
// 📦 Get Pair Code
// ===============================
app.get("/pair", (req, res) => {
  const c = sockets[req.query.clientId];
  res.json({ code: c?.pairCode || null });
});

// ===============================
// 📩 Get Session ID
// ===============================
app.get("/session", (req, res) => {
  const c = sockets[req.query.clientId];
  res.json({ session: c?.sessionID || null });
});

app.listen(PORT, () => console.log(`✅ Nexty Session Generator live on port ${PORT}`));
