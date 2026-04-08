# Wexoe Page Builder

Visual page builder for Wexoe landing pages. Built with Next.js, Tailwind CSS, React.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Airtable REST API (reads) + Claude API with Airtable MCP (writes)
- Deployed on Vercel

## Structure
- `app/` — Next.js pages and API routes
- `components/editors/` — Editor panel components (one per section)
- `components/preview/` — Live preview components (match wexoe-landing-page.php rendering)
- `lib/` — Types, state management (useReducer)

## Environment Variables
- `AIRTABLE_API_KEY` — Airtable personal access token
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude + MCP publishing
