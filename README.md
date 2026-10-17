# Apprentice

**An AI that learns how your organization works.** AI sorts the work. People make the call.

Apprentice turns every incoming request (a client lead, a project, an internal task) into checked, ordered tasks for the right teams. The AI reads, verifies and splits each request. A manager approves anything that matters. Like a new apprentice, it learns the organization's own rules from the corrections its manager chooses to teach.

Built for **Agentika 2.0** (NaSCon 2026, FAST-NUCES Islamabad) · Theme: **Human + AI: Better Together** · Runs on **n8n**, deployed on **Clouds by Alternate Futures**.

| | |
|---|---|
| Live board (homepage) | https://agentika-app.alternatefutures.ai/webhook/board |
| Send a request (public) | https://agentika-app.alternatefutures.ai/form/request |
| Staff form · Manager inbox · Connect channels | `/form/internal` · `/webhook/inbox` · `/form/connect` (login in our submission PDF) |

The demo organization is **Orbit Studio**, a 30-person software and design agency with six teams: Sales, Design, Engineering, AI & Data, Marketing, and Finance & Legal.

## The problem
Requests reach a company through forms, inboxes and chats. One person, usually a founder or the business-development lead, reads every message, decides whether it's real, works out who should do what and forwards the pieces. Leads go cold, work lands with the wrong team, spam wastes everyone's time, and the house rules for routing live in that one person's head.

## How it works
```
 Public form (clients)                       Staff form (password)
          └──────────────────┬──────────────────┘
                             ▼
 ① Saved at once with a reference (REQ-1001) and shown on the live board
                             │
 ② Rule checks (code): missing details · personal email · same sender in 30 days
                             │  3+ requests from one email in an hour → straight to a manager, no AI call
                             ▼
 ③ Verifier (AI): verified · needs_info · suspicious · out_of_scope
          │ verified                                │ anything else
          ▼                                         ▼
 ④ Planner (AI): 1–6 ordered tasks,           Manager review (flagged)
    an owner team and a confidence            It's fine, plan it · Ask for more detail · Decline
    for each; follows the saved rules
          │
          ▼
 ⑤ Guardrails (code, not the AI) choose the lane
          │ clear internal task                     │ external, high value, unsure or urgent
          ▼                                         ▼
    Assigned automatically                    Manager review (plan)
                                              Approve · Approve, but change the owner · Decline
                                              ☐ Save this as a rule for next time
          │
          ▼
 ⑥ Each team's Slack or Discord channel gets its tasks, the owner team gets a brief,
    and the activity log gets one line per request
```

## Where the human comes in
| Moment | Who decides |
|---|---|
| A new client, money or a commitment (anything from the public form) | **The manager approves**, every time |
| The AI is unsure (low confidence, unknown team, deadline under 3 days) | **The manager reviews** |
| The request looks like spam, is too vague or is out of scope | **The manager confirms**: decline, ask for detail, or override and plan it |
| A clear, routine internal task filed by staff | **The AI assigns it alone**, and it is logged and visible on the board |
| The manager changes the owner or overrides a flag | **The manager decides whether the AI learns from it**: tick *Save this as a rule*, or leave it as a one-off |

The manager gets a card in the review channel with a link to a review page, or sees everything waiting in the manager inbox. Every decision records who, when and why. If nobody answers within 4 hours, the request expires. Silence never approves anything.

## How it learns
When a manager saves a correction as a rule ("Public-sector clients go to Finance & Legal first because of tender rules"), Apprentice stores the manager's own words. Both AI steps read the active rules on every request, newest first, and rules override the model's own judgment. The live board shows **Rules learned** and **Approved as proposed** (the share of reviewed plans a manager approved without changes), which should climb as the rules build up.

## Guardrails live in code, not in the model
A plan goes to a manager if **any** of these is true ([`n8n/nodes/guardrails.js`](n8n/nodes/guardrails.js)):
- It came through the public form. Only the password-protected staff form can mark a request as internal; the request-type dropdown never grants permission.
- The budget is $5k or more.
- Any task has confidence below 0.75.
- The owner or any task names a team that doesn't exist.
- The Planner returned no tasks.
- The deadline is less than 3 days away.

## Safety
- **Request text is untrusted.** The AI sees it inside `<request>` tags with an instruction never to follow it. Prompts include only the managers' rules, never AI summaries of past requests, so an injected instruction can't spread to future runs.
- **No pings or link tricks.** Before request text reaches a manager or a team channel, @mentions are neutralised, markdown is escaped and links are defanged (`hxxp://`). Discord posts send `allowed_mentions: {parse: []}`.
- **The public board is masked.** It shows first names and short AI-written titles only: no emails, budgets or request text.
- **Review links can't be forged or reused.** Each link carries a per-request token; a wrong token is refused, and a decided request can't be decided again.
- **Logins** protect the staff form, manager inbox and channel setup (HTTP Basic Auth). The public form ignores bots.
- **No secrets in this repo.** Channel webhooks are stored in an n8n Data Table, and credentials in the exported workflows are placeholders.
- **Failures are visible.** An error workflow posts any failed run to the activity log.

## What's in this repo
| Path | What |
|---|---|
| [`n8n/workflows/`](n8n/workflows/) | Exported n8n workflows, ready to import (see below) |
| [`n8n/apprentice_n8n.py`](n8n/apprentice_n8n.py) | Builds every workflow from source and pushes it to n8n through its public API (Python standard library only) |
| [`n8n/nodes/`](n8n/nodes/) | The JavaScript inside each Code node: rule checks, guardrails, decisions, rules, messages |
| [`ui/`](ui/) | Server-rendered pages (live board, review page, manager inbox), the Slack/Discord message kit and form styling |
| [`n8n/test/run-nodes.mjs`](n8n/test/run-nodes.mjs) | Runs the Code-node scripts against mock n8n data and renders the manager pages to `n8n/test/out/` |

| Workflow | What it does |
|---|---|
| `intake.json` | The whole pipeline: public form → rule checks → Verifier → Planner → guardrails → manager review (Wait node) → rules → tasks → team channels → log |
| `staff-intake.json` | Password-protected staff form; hands the request to intake as internal |
| `review-page.json` · `review-submit.json` | The manager's review page, and the endpoint that checks the token and resumes the waiting request |
| `manager-inbox.json` | Everything waiting for a decision, with review links |
| `live-board.json` | The public homepage: pipeline, counters, requests and what Apprentice has learned |
| `connect-channels.json` | Form that saves each team's Slack or Discord webhook and posts a test message |
| `errors.json` | Error workflow: posts failures to the activity log |

A ninth workflow, *reset demo*, empties the demo data from a secret link and isn't exported.

## Run it yourself
You need an n8n instance (we used n8n 2.6.3) with the public API turned on, plus Python 3 and Node.js.

```bash
cd product
cp .env.example .env              # fill in N8N_API_URL, N8N_API_KEY and GROQ_API_KEY
set -a; . ./.env; set +a
python3 -I n8n/apprentice_n8n.py push setup && python3 -I n8n/apprentice_n8n.py run-setup   # create the Data Tables (once)
python3 -I n8n/apprentice_n8n.py push all                                                  # create, update and activate every workflow
```
Then open `/form/connect`, paste a Slack or Discord webhook for each team plus the manager-review and activity-log channels, and send a request from `/form/request`.

To import by hand instead: n8n → *Import from File* → each file in `n8n/workflows/`, then pick your own Basic Auth and Groq credentials where the export says `set in n8n`.

Test the Code-node logic locally (no n8n needed):
```bash
node n8n/test/run-nodes.mjs       # 20 checks, Slack and Discord formats
```

## Tech stack
n8n 2.6.3 (Form Trigger, Webhook, Wait, Data Tables, Basic LLM Chain with Structured Output Parser, Code, HTTP Request, Error Trigger) · Groq, Llama 3.3 70B · Slack Incoming Webhooks / Discord webhooks · server-rendered HTML with no client JavaScript · deployed on Clouds by Alternate Futures (n8n template, EU region).

## Credits
Built on [n8n](https://n8n.io) (Sustainable Use License) and Meta's Llama 3.3 served by [Groq](https://groq.com). Fonts: Instrument Sans, Instrument Serif and JetBrains Mono from Google Fonts. Colors follow the Clouds by Alternate Futures brand guide.
