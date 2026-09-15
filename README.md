# Email Support Agent

An AI-powered customer support ticketing system. It classifies incoming customer emails, drafts context-aware replies using Google's Gemini API, and lets a human agent review and send the response — instead of writing every reply from scratch.

## Features

- **Ticket dashboard** — search, sort (newest/oldest), and filter tickets by status (All / Open / Pending / Resolved)
- **AI-generated replies** — describe a customer's issue and get a drafted, tone-adjustable email reply (Professional, Friendly, Formal, Empathetic)
- **Automatic categorization** — the AI classifies each issue into a short category (e.g. "Delivery Issue", "Billing Problem")
- **Priority tagging** — Low / Medium / High / Urgent
- **Dark mode** — toggle with preference saved across sessions
- **Stat overview** — live counts of total, pending, and resolved tickets
- **Copy-to-clipboard** for generated replies

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript (no framework)
- **Backend:** Node.js + Express
- **AI:** Google Gemini API
- **Storage:** in-memory (tickets reset on page reload) — a database can be added later

## Project structure

```
email-support-agent/
├── email-support-aggent/
│   └── public/
│       ├── index.html
│       ├── script.js
│       ├── style.css
│       └── theme.js
└── server/
    ├── server.js
    ├── package.json
    └── .env.example
```

## Setup

### 1. Backend

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and add your Gemini API key (get a free one at [aistudio.google.com](https://aistudio.google.com)):

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
PORT=5000
```

Start the server:

```bash
node server.js
```

You should see `Server running on http://localhost:5000`.

### 2. Frontend

No build step needed. Just open `email-support-aggent/public/index.html` directly in your browser, with the backend running in the background.

## How it works

1. A support agent fills in the customer's name, their issue, priority, and desired tone
2. The frontend sends this to the backend (`POST /api/generate-reply`)
3. The backend calls the Gemini API with a structured prompt and gets back a drafted reply + detected category
4. The reply appears in the dashboard, editable before sending, and a new ticket is added to the list

## Possible next steps

- Persist tickets in a real database (e.g. PostgreSQL / MongoDB) instead of resetting on reload
- Add authentication so multiple support agents can log in
- Connect to a real inbox (Gmail API) instead of manual ticket entry
- Deploy the backend (Render/Railway) and frontend (Netlify/Vercel) for a live demo link

## Author

Built by Kavita Chaudhary as a full-stack learning project.
