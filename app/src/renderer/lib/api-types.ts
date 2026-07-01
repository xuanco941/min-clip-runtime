export type VideoConcatMode = "random" | "sequential";
export type VideoTransitionMode = "None" | "Shuffle" | "FadeIn" | "FadeOut" | "SlideIn" | "SlideOut";
export type VideoAspect = "9:16" | "16:9" | "1:1";

export type LlmProvider =
  | "openai"
  | "aihubmix"
  | "moonshot"
  | "azure"
  | "qwen"
  | "deepseek"
  | "modelscope"
  | "gemini"
  | "grok"
  | "groq"
  | "ollama"
  | "g4f"
  | "oneapi"
  | "cloudflare"
  | "ernie"
  | "minimax"
  | "mimo"
  | "pollinations"
  | "litellm";

export type TtsServer =
  | "NO_VOICE"
  | "azure-tts-v1"
  | "azure-tts-v2"
  | "siliconflow"
  | "gemini-tts"
  | "mimo-tts"
  | "valtec";

export type VideoSource = "pexels" | "pixabay" | "coverr" | "local" | "douyin" | "bilibili" | "xiaohongshu";

export type SubtitlePosition = "top" | "center" | "bottom" | "custom";

export interface MaterialInfo {
  provider: VideoSource | "local";
  url: string;
  duration: number;
}

export interface VideoParams {
  video_subject: string;
  video_script?: string;
  video_terms?: string | string[];
  video_aspect?: VideoAspect;
  video_concat_mode?: VideoConcatMode;
  video_transition_mode?: VideoTransitionMode | null;
  video_clip_duration?: number;
  video_count?: number;
  video_source?: VideoSource;
  video_materials?: MaterialInfo[] | null;
  custom_audio_file?: string | null;
  video_language?: string;
  voice_name?: string;
  voice_volume?: number;
  voice_rate?: number;
  bgm_type?: "" | "random" | "custom";
  bgm_file?: string;
  bgm_volume?: number;
  subtitle_enabled?: boolean;
  subtitle_position?: SubtitlePosition;
  custom_position?: number;
  font_name?: string;
  text_fore_color?: string;
  text_background_color?: boolean | string;
  rounded_subtitle_background?: boolean;
  font_size?: number;
  stroke_color?: string;
  stroke_width?: number;
  n_threads?: number;
  paragraph_number?: number;
  video_script_prompt?: string;
  custom_system_prompt?: string;
  tts_server?: TtsServer;
  llm_provider?: LlmProvider;
  video_codec?: string;
  use_custom_system_prompt?: boolean;
}

export type TaskState = -1 | 1 | 4;
export const TASK_STATE_FAILED: TaskState = -1;
export const TASK_STATE_COMPLETE: TaskState = 1;
export const TASK_STATE_PROCESSING: TaskState = 4;

export interface TaskData {
  task_id: string;
  state?: TaskState;
  progress?: number;
  videos?: string[];
  combined_videos?: string[];
  script?: string;
  terms?: string[];
  audio_file?: string;
  audio_duration?: number;
  subtitle_path?: string;
  materials?: string[];
  params?: VideoParams;
  cross_post_results?: Array<{ success: boolean; error?: string }> | null;
  [key: string]: unknown;
}

export interface TasksPage {
  tasks: TaskData[];
  total: number;
  page: number;
  page_size: number;
}

export interface BgmFile {
  name: string;
  size: number;
  file: string;
}

export interface VideoMaterialFile {
  name: string;
  size: number;
  file: string;
}

export interface ScriptRequest {
  video_subject: string;
  video_language?: string;
  paragraph_number?: number;
  video_script_prompt?: string;
  custom_system_prompt?: string;
}

export interface TermsRequest {
  video_subject: string;
  video_script: string;
  amount?: number;
}

export interface SocialMetadataRequest {
  video_subject: string;
  video_script?: string;
  language?: string;
  platform?: string;
}

export interface SocialMetadata {
  title: string;
  caption: string;
  hashtags: string[];
}

export interface ApiEnvelope<T> {
  status: number;
  message: string;
  data: T;
}