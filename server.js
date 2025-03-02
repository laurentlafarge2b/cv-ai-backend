require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");
const Tesseract = require("tesseract.js");
const path = require("path");

// Configuration d'OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration du stockage des fichiers avec Multer
const upload = multer({ dest: "uploads/" });

// Route principale
app.get("/", (req, res) => {
  res.send("Serveur OCR & OpenAI en ligne !");
});

// Route pour traiter un fichier image avec OCR et OpenAI
app.post("/process-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni." });
    }

    const imagePath = req.file.path;

    // Extraction du texte avec Tesseract OCR
    const { data } = await Tesseract.recognize(imagePath, "eng+fra", {
      logger: (m) => console.log(m),
    });

    const extractedText = data.text;

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "Aucun texte détecté dans l'image." });
    }

    console.log("Texte extrait :", extractedText);

    // Génération d'une analyse via OpenAI
    const openaiResponse = await openai.createCompletion({
      model: "gpt-4",
      prompt: `Analyse le texte suivant et résume les points clés:\n\n${extractedText}`,
      max_tokens: 150,
    });

    const aiAnalysis = openaiResponse.data.choices[0].text.trim();

    // Suppression du fichier temporaire
    fs.unlinkSync(imagePath);

    res.json({ extractedText, aiAnalysis });

  } catch (error) {
    console.error("Erreur lors du traitement:", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur OCR & OpenAI démarré sur le port ${PORT}`);
});