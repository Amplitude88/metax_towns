// towns-express-bot/index.js
import express from "express";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    return sendMessage(roomId, "Bitte gib eine Frage ein.");
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
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    await sendMessage(roomId, reply);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Fehler bei OpenAI oder Senden:", err);
    await sendMessage(roomId, "Fehler bei der Anfrage an GPT.");
    res.status(500).json({ error: "OpenAI error" });
  }
});

async function sendMessage(roomId, content) {
  return axios.post(
    "https://api.towns.com/v1/messages",
    {
      roomId,
      content,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TOWNS_API_KEY}`,
      },
    }
  );
}

app.listen(PORT, () => {
  console.log(`🌐 Express GPT-Bot läuft auf http://localhost:${PORT}`);
});