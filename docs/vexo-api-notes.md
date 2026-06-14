# VexoAPI supported models (tested 2026-06-14)

# Endpoint: POST https://vexoapi.dev/api/v1/chat/completions

# Auth: Authorization: Bearer ${VEXO_API_KEY}

# Body: { model, messages, max_tokens, temperature, stream }

## Working free-tier models:

# - openai/gpt-oss-120b:free (general, 200 OK, OpenInference provider)

# - llama-3.1-8b-instant (fast, 200 OK, returns plain "OK")

# - qwen/qwen3-32b (reasoning, 200 OK, returns <think>)

# - meta-llama/llama-3.3-70b-instruct:free (large, free)

# - google/gemma-4-31b-it:free (31B params, free)

# - anthropic/claude-fable-5 (Claude, paid)

## Restricted:

# - deepseek/deepseek-v4-flash (403: private, VIP key only)

# - deepseek/deepseek-v4-pro (403: same)

# - DeepSeek-V3.1, V3.2 (private)

## Old Vexo API (DEPRECATED):

# - GET /api/{endpoint}?key={key} → returns 405 catch-all

# - Endpoints: gptoss120b, glm47flash, gemini → all 405

## New Vexo API (USE THIS):

# - POST /api/v1/chat/completions

# - Authorization: Bearer {key}

# - Body: OpenAI-compatible

# - Response: { id, model, choices: [{ message: { content } }] }
