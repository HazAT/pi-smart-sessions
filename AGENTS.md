# pi-smart-sessions

A Pi extension that auto-names sessions with AI-generated summaries.

## Project Structure

```
extensions/smart-sessions.ts   — The entire extension (single file)
package.json                   — Pi package config (pi-package, pi-extension keywords)
publish.sh                     — Interactive npm publish script
assets/                        — Screenshots for README (before.png, after.png, session-name.png)
```

## How It Works

1. Listens for `session_start` and `input` events via the Pi `ExtensionAPI`
2. Matches user input against `/skill:<name> <prompt>` pattern
3. Immediately sets a truncated session name as fallback
4. Picks the cheapest available model (Haiku → current model) via `modelRegistry`
5. Calls `complete()` from `@mariozechner/pi-ai` to summarize the prompt in 5–10 words
6. Updates the session name to `[skillName] summary`

Key design decisions:
- Only the **first** skill prompt per session is named — won't overwrite user-set names
- Summarization is fire-and-forget (errors silently keep the truncated name)
- No build step — TypeScript is loaded directly by Pi's extension system

## Dependencies

- `@mariozechner/pi-coding-agent` — Pi extension API (`ExtensionAPI`, events)
- `@mariozechner/pi-ai` — Model registry, `complete()` function

Both are peer dependencies (provided by the Pi runtime).

## Publishing

1. Bump version in `package.json`
2. Update `CHANGELOG.md`
3. Commit and push
4. Run `./publish.sh` (interactive — confirms before publishing to npm)

The `files` field in `package.json` controls what gets published: `extensions/`, `README.md`, `LICENSE`.

## Conventions

- Single-file extension — keep it that way unless complexity demands otherwise
- No build step, no transpilation
- Conventional Commits for git messages
