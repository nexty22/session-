import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve index.html
app.use(express.static(__dirname));

// Generate session route
app.post("/generate-session", (req, res) => {
  const { number } = req.body;
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const sessionID = `Nexty~${random}`;
  console.log(`Generated for ${number}: ${sessionID}`);
  res.json({ sessionID });
});

// Heroku port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
