
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseAiJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("The model returned invalid JSON");
  }
}

async function processDeliveryScreenshot(imageBuffer, mimeType) {
  const prompt = "You are a smart logistics assistant for couriers. Analyze the attached screenshot containing a list of deliveries. Extract all stops carefully: extract the most accurate full address (street, house number, city), don't confuse customer name with address. Extract the customer name if present. Extract the phone number if present. If there are no stops in the image, return an empty array []. Return the result ONLY as the following JSON structure, with no extra text, no backticks: [{ \"address\": \"123 Main St, City\", \"customerName\": \"John Doe\", \"phone\": \"0501234567\" }]";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      prompt,
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBuffer.toString("base64"),
        },
      },
    ],
  });

  if (!response.text) {
    throw new Error("No response received from the model");
  }

  return parseAiJson(response.text);
}

app.post("/scan", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image was sent" });
    }

    const stops = await processDeliveryScreenshot(req.file.buffer, req.file.mimetype);
    res.status(200).json(stops);
  } catch (err) {
    console.error("Error processing image:", err.message);
    res.status(500).json({ error: "Error processing image", details: err.message });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
