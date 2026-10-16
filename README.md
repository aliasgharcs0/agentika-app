# Countersign

**Your AI agents act. You countersign.**

Countersign is a human-approval layer for AI agents. Agents ask before risky actions, a human approves with one tap, and agents earn autonomy from the decisions humans make.

Built for **Agentika 2.0** (NaSCon 2026, FAST-NUCES Islamabad) · Theme: **Human + AI: Better Together** · Deployed on **Clouds by Alternate Futures**.

| | |
|---|---|
| Live app | `https://<slug>-app.alternatefutures.ai` (filled in after the first deploy) |
| API docs | `/docs` on the live app |
| Demo login | in our submission PDF |

## Where the human comes in
AI agents can now refund customers, send emails and change records, but one hallucination or one prompt-injected message can do real damage. With Countersign:

1. The agent asks before acting (REST or MCP).
2. The human's own rules run first, so hard limits can't be argued past.
3. An AI reviewer writes a plain-English risk summary. It advises and never approves.
4. The human approves, edits or rejects from the dashboard or Telegram. Silence means *rejected* (fail closed).
5. When the human keeps approving the same safe action, Countersign proposes a rule. Only the human can switch it on: **autonomy is earned**.

## Run locally
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # fill in values
uvicorn app.main:app --reload --port 8000
```
Container (what Alternate Clouds runs):
```bash
podman build -t countersign:dev .
podman run --rm -p 8000:8000 --env-file .env countersign:dev
```

## Deploy on Alternate Clouds
Add Service → GitHub Repo → this repo (`main`, root `.`). Set the variables from `.env.example`, keep the container port at **8000**, then **Rebuild** → **Deploy**.

## Tech stack
Python 3.12 · FastAPI · SQLite · Jinja2 + HTMX · httpx · Groq / Gemini (OpenAI-compatible APIs) · Telegram Bot API · MCP · Alternate Clouds.

## Credits
Built on open-source projects: FastAPI, Starlette, Uvicorn, Jinja2, httpx, python-dotenv, HTMX. Third-party code and templates used are listed here as they are added.
