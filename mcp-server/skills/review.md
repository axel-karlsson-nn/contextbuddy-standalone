---
name: review
description: Review open action items and recent activity - your personal standup assistant
---

# ContextBuddy Review

Give the user a summary of their open action items and recent activity.

## Process

### Step 1: Gather Data

Run these searches:
1. `cb_search` with type: "action" to get all action items
2. `cb_get_recent` with days: 7 to get recent activity

### Step 2: Categorize Actions

Group action items by status:
- **Open**: status is "open" or null
- **Done**: status is "done"
- **Overdue**: status is "open" AND due date is in the past

### Step 3: Present Summary

Format like a standup report:

> ## Your Review
>
> ### Open Action Items (3)
>
> **Overdue:**
> - [ ] Review the API design (due Jan 20) - platform/api-v2
>
> **Upcoming:**
> - [ ] Update documentation (due Jan 30) - platform
> - [ ] Schedule security review (no due date) - platform
>
> ### Recent Activity (last 7 days)
>
> - **5 decisions** captured
> - **3 notes** captured
> - **2 ideas** captured
>
> ### Recent Decisions
> - Jan 25: "Using JWT for auth"
> - Jan 24: "PostgreSQL for the new service"

### Step 4: Offer Actions

After the summary, offer:
- "Want to mark any actions as done?"
- "Should I filter by a specific team or project?"
- "Want to see the full list of recent decisions?"

## Marking Actions Done

If user wants to mark an action as done, we need a way to update the note.

**Current limitation:** There's no `cb_update_note` tool yet. For now, acknowledge this:
> "I don't have the ability to mark actions as done yet - that's coming in a future update. For now, I've noted that [action] is complete."

Then capture a new note:
> "Completed: [original action item]"

## Filters

If user specifies a team or project, filter all results accordingly:
- "Review my platform team items" → team: "platform"
- "What's open for the api project?" → project: "api"
