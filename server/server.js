require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());              // allows your frontend (different port) to call this server
app.use(express.json());      // lets us read JSON bodies like { issue, tone, name }

// Serve the frontend (index.html, script.js, style.css, theme.js) from this
// same server. Once deployed, visiting the root URL loads the whole app —
// no separate frontend hosting needed.
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.");
}

// ---------------------------------------------------------------
// POST /api/generate-reply
// body: { name, issue, tone, priority }
// returns: { reply, category, confidence }
// ---------------------------------------------------------------
app.post("/api/generate-reply", async (req, res) => {
    const { name, issue, tone, priority } = req.body;

    if (!issue || !issue.trim()) {
        return res.status(400).json({ error: "issue is required" });
    }

    const prompt = `You are an experienced customer support agent replying to a real customer email. Write naturally, as if you're actually reading and responding to their specific situation — don't use a generic template.

Customer name: ${name || "the customer"}
Priority: ${priority || "medium"}
Their message:
"${issue}"

Write a ${tone || "professional"} reply email (2-4 short paragraphs, keep it under 150 words total, no subject line, no signature block). Reference specific details from what they wrote. Vary your phrasing and structure — don't start every reply the same way.

Also classify the issue into ONE short category (2-3 words, e.g. "Delivery Issue", "Billing Problem", "Bug Report").

Respond ONLY with valid JSON in exactly this shape, nothing else, no markdown fences:
{"reply": "...", "category": "..."}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        const requestBody = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 1.0,   // higher = more varied wording (0 = very repetitive, 2 = max)
                topP: 0.95,
                maxOutputTokens: 1024,
                responseMimeType: "application/json", // forces Gemini to return valid JSON, not markdown/prose
            },
        });

        // Gemini's free tier occasionally returns 503 "high demand" — retry a
        // couple of times with a short delay before giving up.
        const MAX_ATTEMPTS = 5;
        let geminiRes;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            geminiRes = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody,
            });

            if (geminiRes.ok) break;

            const isOverloaded = geminiRes.status === 503;
            const isLastAttempt = attempt === MAX_ATTEMPTS;

            if (isOverloaded && !isLastAttempt) {
                console.warn(`Gemini overloaded (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${attempt}s...`);
                await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
                continue;
            }

            break; // non-503 error, or out of retries — fall through to error handling below
        }

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("Gemini API error:", geminiRes.status, errText);

            const message = geminiRes.status === 503
                ? "The AI service is busy right now. Please try again in a moment."
                : "AI service error";

            return res.status(502).json({ error: message, details: errText });
        }

        const data = await geminiRes.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // The model sometimes wraps JSON in ```json fences despite instructions — strip them
        const cleaned = rawText.replace(/```json|```/g, "").trim();

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("Could not parse Gemini response as JSON:", cleaned);
            parsed = {
                reply: "Sorry, the AI response couldn't be read properly. Please try generating again.",
                category: "General",
            };
        }

        // Gemini doesn't return a confidence score, so we derive a simple
        // stand-in from response length/completeness. Replace with a real
        // signal later if your chosen model provides one.
        const confidence = parsed.reply && parsed.reply.length > 40 ? 90 : 70;

        res.json({
            reply: parsed.reply || "Could not generate a reply.",
            category: parsed.category || "General",
            confidence,
        });
    } catch (err) {
        console.error("Server error:", err);
        res.status(500).json({ error: "Something went wrong generating the reply." });
    }
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
