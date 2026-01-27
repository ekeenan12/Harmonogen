

# Run the offline HarmonoGen app

This app now uses a local, deterministic prompt generator (no external API keys required).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Offline prompt generator

The "AI Dreamer" panel hashes your prompt into a seed and uses a local mapping of keywords
(like "calm", "chaotic", "organic", "stormy", and "symmetric") to bias harmonograph and
attractor parameters. This keeps generation fast, repeatable, and fully offline.
