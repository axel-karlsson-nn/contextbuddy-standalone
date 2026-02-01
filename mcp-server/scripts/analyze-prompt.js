#!/usr/bin/env node

/**
 * ContextBuddy UserPromptSubmit Hook
 * Analyzes user messages for noteworthy content
 *
 * Input: JSON via stdin with { prompt: "user message" }
 * Output: Plain text context for Claude, or empty for skip
 */

import { createInterface } from 'readline';

// Read JSON from stdin
async function readStdin() {
  const rl = createInterface({ input: process.stdin });
  let data = '';

  for await (const line of rl) {
    data += line;
  }

  return data;
}

// Patterns that indicate noteworthy content
const PATTERNS = {
  decision: [
    /\b(we decided|decided to|let's go with|agreed to|agreement|choosing|picked|selected)\b/i,
    /\bdecision:/i
  ],
  action: [
    /\b(todo|to-do|action item|need to|should|must|have to|task:)\b/i,
    /\baction:/i
  ],
  note: [
    /\b(note:|fyi:|remember that|keep in mind|important:)\b/i
  ],
  idea: [
    /\b(what if|idea:|could we|maybe we|how about)\b/i
  ],
  question: [
    /\?$/,
    /\b(wondering|question:|unsure|not sure)\b/i
  ]
};

// Check if text matches any pattern for a type
function detectType(text) {
  for (const [type, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
  }
  return null;
}

// Main
async function main() {
  try {
    const input = await readStdin();
    if (!input.trim()) {
      process.exit(0);
    }

    const data = JSON.parse(input);
    const prompt = data.prompt || '';

    // Skip very short messages or greetings
    if (prompt.length < 15) {
      process.exit(0);
    }

    // Skip common non-noteworthy patterns
    const skipPatterns = [
      /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it)/i,
      /^(what|how|can you|please|could you|help me)/i
    ];

    for (const pattern of skipPatterns) {
      if (pattern.test(prompt.trim())) {
        process.exit(0);
      }
    }

    // Detect if this is noteworthy
    const type = detectType(prompt);

    if (type) {
      // Output context for Claude to see
      console.log(`<contextbuddy-capture type="${type}">${prompt}</contextbuddy-capture>`);
    }

    process.exit(0);
  } catch (error) {
    // Silent failure - don't break the user experience
    process.exit(0);
  }
}

main();
