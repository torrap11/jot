# Jot — resurfacing spec

**Scope:** [SCOPE.md](./SCOPE.md). **Overlay candidates = notes first.** Screen capture powers **[query recordings](./QUERY-RECORDINGS.md)**, not proactive LLM cards. Context = frontmost app (+ optional title/OCR later).

---

## Shared rules

- One card max; template why-now; no LLM on this path  
- dismiss · snooze · never-this-app  
- Log to local `resurface_events` (notes DB)

---

## Context resurfacing

### Trigger

- App switch (300 ms settle) or manual shortcut

### Inputs

```text
workContext: { bundleId, appName, windowTitle? }
note index: app_links, FTS, activity_tags, recency
```

### Policy (implement in `jot/resurfacePolicy.js`)

- **Surface** — strong match (e.g. explicit app link + open app, or tag match + IDE)  
- **Defer** — medium match; retry later  
- **Silence** — default  

### Example chips

- `linked to this app`  
- `tag: coding`  
- `you opened this before`  
- `manual recall`  

**Not used:** `same document` from OCR, `last meeting`, domain from browser capture DB.

### User story

> Open Cursor → surface idealist project note with `linked to this app`.

---

## Time resurfacing (P1)

NL at capture → `resurface_at` → scheduler → overlay, chip `scheduled for …`.

Separate daily cap from context caps. Does not call screenpipe.

---

## Activity rules (P3)

| Context | Example tag on note |
|---------|---------------------|
| IDE bundle | `coding` |
| Calendar app | `meetings` (often suppress auto) |

Rules in local policy only.

---

## Acceptance

1. Strong app link → one card  
2. Weak switch flurry → silence  
3. Time due → card within 60s  
4. No Screen Recording permission required  
5. Works with `SCREENPIPE_ENABLED=false`
