// Gợi ý tên model theo nhà cung cấp (dùng cho dropdown gợi ý — VẪN cho tự nhập).
// Cập nhật 06/2026 từ tài liệu chính thức của các provider. Để model mới nhất lên
// đầu; giữ vài model cũ để tương thích cấu hình sẵn có.
export const MODEL_SUGGESTIONS: Record<string, string[]> = {
  // OpenRouter: model có đuôi :free là miễn phí (giới hạn lượt). Bỏ :free = bản trả phí.
  openrouter: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nex-agi/nex-n2-pro:free",
    "poolside/laguna-m.1:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter/free",
    "openai/gpt-oss-120b:free",
    "poolside/laguna-xs.2:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
  ],
  openai: [
    "gpt-5.5", "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano",
    "gpt-5.3-codex", "gpt-5.2", "gpt-4.1-mini", "gpt-4o-mini",
  ],
  gemini: [
    "gemini-3.5-flash", "gemini-3.1-pro", "gemini-3.1-flash-lite", "gemini-3-flash",
    "gemini-2.5-flash", "gemini-2.5-pro",
  ],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
  moonshot: ["kimi-k2.6", "kimi-k2.7-code", "kimi-k2.5", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  qwen: [
    "qwen3.7-max", "qwen3.6-plus", "qwen3.5-flash", "qwen3-max", "qwen-plus", "qwen-max", "qwen-turbo",
  ],
  groq: [
    "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b",
    "moonshotai/kimi-k2-instruct-0905", "qwen/qwen3.6-27b",
  ],
  grok: ["grok-4.3", "grok-4.1-fast-reasoning", "grok-4.1-fast-non-reasoning", "grok-code-fast-1", "grok-3", "grok-3-mini"],
  minimax: ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5"],
  mimo: ["mimo-v2.5-pro"],
  modelscope: ["Qwen/Qwen3-32B", "deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
  aihubmix: ["gpt-5.5", "gemini-3.5-flash", "claude-sonnet-4-5", "deepseek-v4-pro", "gpt-4o-mini"],
  aimlapi: ["openai/gpt-5.5", "openai/gpt-4o-mini", "google/gemini-3.5-flash"],
  pollinations: ["openai-fast", "openai", "mistral"],
  ollama: ["llama3.3", "qwen3", "gemma3", "deepseek-r1", "mistral", "phi4"],
  cloudflare: ["@cf/meta/llama-3.3-70b-instruct", "@cf/meta/llama-3.1-8b-instruct", "@cf/qwen/qwen1.5-14b-chat-awq"],
  litellm: [
    "openai/gpt-5.5", "anthropic/claude-sonnet-4-5", "gemini/gemini-3.5-flash", "deepseek/deepseek-v4-pro",
  ],
  oneapi: [],
  azure: [],
  ernie: ["ernie-4.5-turbo", "ernie-4.5", "ernie-4.0-8k"],
};

export function modelsFor(provider: string): string[] {
  return MODEL_SUGGESTIONS[provider] ?? [];
}
