# Form wording and settings

Both forms: **Options → Custom Form Styling** = the contents of `form.css`, and **Append n8n Attribution = off**.
Keep option values exactly as written: the code reads them (for example the budget values `$5k–20k` and `$20k+`, which use an en dash).

## Public form: clients
- **Form Path:** `request` → `https://agentika-app.alternatefutures.ai/form/request`
- **Form Title:** Start a project with Orbit Studio
- **Form Description:** Tell us what you need. Apprentice, our intake assistant, checks every request and routes it to the right team, and a person reviews anything important. You'll hear from us within one working day.

| Field | Type | Required | Placeholder / options |
|---|---|---|---|
| Your name | Text | yes | Mei Lin |
| Work email | Email | yes | you@company.com |
| Company | Text | no | Bean & Co |
| Website | Text | no | https://… |
| What kind of request? | Dropdown | yes | A new project · Support for existing work · Something else |
| What do you need? | Textarea | yes | What should we build or fix, for whom, and by when? e.g. An order-ahead app for our 12 coffee shops, launching in March. |
| Budget | Dropdown | no | Under $1k · $1k–5k · $5k–20k · $20k+ · Not sure yet |
| Ideal deadline | Date | no | |

- **Respond When:** Form Is Submitted.
  - **For the demo (recommended):** *Redirect to URL* → `https://agentika-app.alternatefutures.ai/webhook/board`, so whoever submits lands on the live board and watches their request appear.
  - **Otherwise:** *Form Submitted Text* → "Thank you. We've received your request, and the right team will contact you within one working day."

## Internal form: staff
- **Form Path:** `internal` · **Authentication:** Basic Auth (a staff username and password credential)
- **Form Title:** File an internal task
- **Form Description:** For Orbit Studio staff. Clear, routine tasks go straight to the right team; anything uncertain goes to a manager first.

| Field | Type | Required | Placeholder |
|---|---|---|---|
| Your name | Text | yes | Sara Khan |
| What needs doing? | Textarea | yes | e.g. The contact form in the website footer shows an error when people press Send. |
| Deadline | Date | no | |

- **Form Submitted Text:** Filed. It will appear in the team's channel within a few seconds.
- The Edit Fields node after this trigger sets `origin = internal` and `request_type = Internal task`.

## Manager review forms
Use `review-form.json`: *Send and Wait → Response Type: Custom Form → Define Form: Using JSON*. Replace the Reviewer names with your own. The decision strings are what "Apply decision" checks: `Approve`, `Approve, but change the owner`, `Decline` (plan review) and `It's fine, plan it`, `Ask for more detail`, `Decline` (flagged review).
