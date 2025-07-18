// towns-express-bot/index.js
import express from "express";
import { OpenAI } from "openai";
import axios from "axios";

// dotenv nur lokal (Railway nutzt system env vars)
if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 8000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json());

// ✅ einfache Statusroute zum Testen
app.get("/ping", (req, res) => {
  res.send("pong");
});

// ✅ Towns Webhook-Verarbeitung
app.post("/towns-webhook", async (req, res) => {
  const { content, roomId, author } = req.body;

  if (!content || !roomId || !author) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (!content.startsWith("/was")) {
    return res.status(200).json({ status: "ignored" });
  }

  const prompt = content.replace("/was", "").trim();
  if (!prompt) {
    await sendMessage(roomId, "Bitte gib eine Frage ein.");
    return res.json({ status: "empty prompt" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Du bist ein hilfreicher Trading-Assistent. Du antwortest auf Deutsch und kennst dich mit Finanzmärkten und technischer Analyse aus. Du erklärst ausführlich, mit Beispielen und Metaphern – einfach verständlich für Einsteiger. Keine Warnungen oder Risiko-Hinweise.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    await sendMessage(roomId, reply);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Fehler bei OpenAI oder Senden:", err.message);
    await sendMessage(roomId, "Fehler bei der Anfrage an GPT.");
    res.status(500).json({ error: "OpenAI error" });
  }
});

// ✅ Senden an Towns via API
async function sendMessage(roomId, content) {
  try {
    await axios.post(
      "https://api.towns.com/v1/messages",
      { roomId, content },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOWNS_API_KEY}`,
        },
      }
    );
  } catch (err) {
    console.error("❌ Fehler beim Senden an Towns:", err.message);
  }
}

app.listen(PORT, () => {
  console.log(`🌐 Bot läuft auf http://localhost:${PORT}`)});