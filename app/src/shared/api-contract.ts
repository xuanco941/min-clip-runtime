export const API_PATHS = {
  // MPT không đăng ký /ping — dùng /docs (FastAPI Swagger) để kiểm tra sống.
  ping: "/docs",
  videos: "/api/v1/videos",
  subtitle: "/api/v1/subtitle",
  audio: "/api/v1/audio",
  tasks: "/api/v1/tasks",
  task: "/api/v1/tasks/{task_id}",
  deleteTask: "/api/v1/tasks/{task_id}",
  bgmList: "/api/v1/musics",
  bgmUpload: "/api/v1/musics",
  materialList: "/api/v1/video_materials",
  materialUpload: "/api/v1/video_materials",
  stream: "/api/v1/stream/{file_path}",
  download: "/api/v1/download/{file_path}",
  scripts: "/api/v1/scripts",
  terms: "/api/v1/terms",
  socialMetadata: "/api/v1/social-metadata",
} as const;

export type ApiPathName = keyof typeof API_PATHS;