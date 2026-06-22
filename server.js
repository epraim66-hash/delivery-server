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
    throw new Error("המודל החזיר תשובה שאינה JSON תקין");
  }
}

async function processDeliveryScreenshot(imageBuffer, mimeType) {
  const prompt = `
    אתה עוזר לוגיסטי חכם המיועד לשליחים.
    עליך לנתח את צילום המסך המצורף המכיל רשימת משלוחים.
    חלץ מתוכו את כל העצירות. תהיה חכם מאוד:
    - חלץ את הכתובת המלאה והמדויקת ביותר (רחוב, מספר בית, עיר). אל תתבלבל בין שם הלקוח לכתובת.
    - חלץ את שם הלקוח (אם קיים).
    - חלץ את מספר הטלפון (אם קיים).
    - אם אין עצירות בתמונה, החזר מערך ריק [].

    החזר את התוצאה אך ורק במבנה JSON הבא, ללא שום טקסט נוסף, ללא \`\`\`json:
    [
