# Changelog

## 1.0.1

- **Prefer Haiku over Codex** for session name summarization — removed Codex mini as the primary model, now defaults to Claude Haiku 3.5 for faster, more reliable summaries

## 1.0.0

- Initial release
- Auto-names Pi sessions with AI-generated 5–10 word summaries
- Detects `/skill:name` prompts and sets meaningful session names
- Background summarization with no workflow delay
- Fallback to truncated name if model call fails
- Cheap model selection cascade (Haiku → current model)
