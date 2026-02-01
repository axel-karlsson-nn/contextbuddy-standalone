---
name: search
description: Search your captured notes, decisions, and action items using natural language
---

# ContextBuddy Search

Help the user search their notes using natural language.

## Process

### Step 1: Parse the Query

Understand what the user is looking for. Extract:
- **Keywords**: What topics/terms to search for
- **Type filter**: Are they asking about decisions, actions, notes, ideas, or questions?
- **Time filter**: "this week", "last month", "today", etc.
- **Context filter**: Specific team or project mentioned

Examples:
- "What decisions did we make about authentication?" → type: decision, query: "authentication"
- "Show me action items for the platform team" → type: action, team: "platform"
- "What did we discuss last week?" → from: (7 days ago), to: (today)

### Step 2: Build Search Parameters

Translate to `cb_search` parameters:
- `query`: Keywords to search
- `type`: decision | note | action | idea | question
- `team`: Team ID if specified
- `project`: Project ID if specified
- `from`: Start date (ISO format) for time-based queries
- `to`: End date (ISO format)

### Step 3: Execute Search

Call `cb_search` with the parameters.

### Step 4: Present Results

Format results clearly:

> **Found 3 decisions about authentication:**
>
> 1. **Jan 25**: "We decided to use JWT tokens for API auth" (platform/api-v2)
> 2. **Jan 23**: "Agreed to require MFA for admin users" (platform)
> 3. **Jan 20**: "Decision: OAuth2 for third-party integrations" (platform/integrations)

If no results:
> "No notes found matching your search. Try broader terms or check if the team/project exists with `cb_list_contexts`."

### Step 5: Offer Follow-ups

After showing results, offer helpful next steps:
- "Want me to narrow this down to a specific project?"
- "Should I show related action items?"
- "Want to add a new note about this topic?"

## Time Expressions

Translate these to date ranges:
- "today" → from: start of today
- "this week" → from: start of this week (Monday)
- "last week" → from/to: previous Monday to Sunday
- "this month" → from: start of current month
- "last month" → from/to: previous month
- "recently" / "lately" → from: 7 days ago
