---
name: setup
description: Initialize ContextBuddy for first-time use - creates storage, sets up teams and projects
---

# ContextBuddy Setup

You're helping the user set up ContextBuddy, a personal note-taking and decision-tracking tool.

## Process

### Step 1: Check Current State

First, use the `cb_list_contexts` tool to check if ContextBuddy is already initialized.

- If it returns teams/projects, tell the user: "ContextBuddy is already set up. You have X teams and Y projects configured. Would you like to add more?"
- If it returns empty or errors, proceed with fresh setup.

### Step 2: Welcome & Explain

Say something like:

"Let's set up ContextBuddy! This tool helps you capture decisions, notes, action items, and ideas as we work together. Everything is stored locally in ~/.contextbuddy/.

I'll help you set up some initial teams and projects. You can always add more later."

### Step 3: Set Up Teams

Ask: "What teams do you work with? Give me a few names (e.g., 'Platform Team', 'Mobile Team', 'Infrastructure')."

For each team mentioned:
1. Generate a lowercase id (e.g., "Platform Team" → "platform")
2. Use `cb_add_context` with type: "team" to create it

### Step 4: Set Up Projects

For each team created, ask: "What projects is [Team Name] working on?"

For each project mentioned:
1. Generate a lowercase id
2. Use `cb_add_context` with type: "project" and parentTeam set appropriately

### Step 5: Confirm Setup

Use `cb_list_contexts` to show the final configuration.

Say: "You're all set! Here's what we configured: [show teams and projects]

Now you can just tell me things like:
- 'We decided to use React for the frontend'
- 'Action item: Review the API design by Friday'
- 'Note: The deployment pipeline is flaky'

I'll capture these as notes automatically. You can search them anytime by asking 'What decisions did we make this week?' or 'Show me action items for [project]'."

### Step 6: Integration Note

Remind the user: "Make sure the ContextBuddy MCP server is added to your Claude Code settings. Check the README for instructions."

## Tips

- Keep it conversational and quick
- Don't overwhelm with options - start simple, they can add more later
- If user says "skip" or "none" for any step, that's fine
- Generate sensible IDs from names (lowercase, hyphens for spaces)
