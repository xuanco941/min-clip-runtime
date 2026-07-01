import type {
  ApiEnvelope,
  BgmFile,
  ScriptRequest,
  SocialMetadata,
  SocialMetadataRequest,
  TaskData,
  TasksPage,
  TermsRequest,
  VideoMaterialFile,
  VideoParams,
} from "./api-types";

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(base: string, path: string, init: RequestInit = {}): Promise<T> {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  let body: unknown = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const env = body as ApiEnvelope<unknown> | null;
    const msg = env?.message || res.statusText || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  const env = body as ApiEnvelope<T> | null;
  if (env && typeof env === "object" && "data" in env) {
    return env.data as T;
  }
  return body as T;
}

export const API_PATHS = {
  // MPT không đăng ký /ping — dùng /docs để kiểm tra API sống.
  ping: "/docs",
  videos: "/api/v1/videos",
  subtitle: "/api/v1/subtitle",
  audio: "/api/v1/audio",
  tasks: (page = 1, pageSize = 20) => `/api/v1/tasks?page=${page}&page_size=${pageSize}`,
  task: (id: string) => `/api/v1/tasks/${id}`,
  deleteTask: (id: string) => `/api/v1/tasks/${id}`,
  bgmList: "/api/v1/musics",
  bgmUpload: "/api/v1/musics",
  materialList: "/api/v1/video_materials",
  materialUpload: "/api/v1/video_materials",
  stream: (path: string) => `/api/v1/stream/${path}`,
  download: (path: string) => `/api/v1/download/${path}`,
  scripts: "/api/v1/scripts",
  terms: "/api/v1/terms",
  socialMetadata: "/api/v1/social-metadata",
} as const;

export const api = {
  ping: async (base: string) => {
    const res = await fetch(`${base}${API_PATHS.ping}`);
    return res.text();
  },
  createVideo: (base: string, body: VideoParams) =>
    request<TaskData>(base, API_PATHS.videos, { method: "POST", body: JSON.stringify(body) }),
  createSubtitle: (base: string, body: VideoParams) =>
    request<TaskData>(base, API_PATHS.subtitle, { method: "POST", body: JSON.stringify(body) }),
  createAudio: (base: string, body: VideoParams) =>
    request<TaskData>(base, API_PATHS.audio, { method: "POST", body: JSON.stringify(body) }),
  listTasks: (base: string, page = 1, pageSize = 20) =>
    request<TasksPage>(base, API_PATHS.tasks(page, pageSize)),
  getTask: (base: string, id: string) => request<TaskData>(base, API_PATHS.task(id)),
  deleteTask: (base: string, id: string) =>
    request<unknown>(base, API_PATHS.deleteTask(id), { method: "DELETE" }),
  listBgm: (base: string) => request<{ files: BgmFile[] }>(base, API_PATHS.bgmList),
  uploadBgm: (base: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ file: string }>(base, API_PATHS.bgmUpload, { method: "POST", body: fd });
  },
  listMaterials: (base: string) =>
    request<{ files: VideoMaterialFile[] }>(base, API_PATHS.materialList),
  uploadMaterial: (base: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ file: string }>(base, API_PATHS.materialUpload, { method: "POST", body: fd });
  },
  generateScript: (base: string, body: ScriptRequest) =>
    request<{ video_script: string }>(base, API_PATHS.scripts, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateTerms: (base: string, body: TermsRequest) =>
    request<{ video_terms: string[] }>(base, API_PATHS.terms, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateSocialMetadata: (base: string, body: SocialMetadataRequest) =>
    request<SocialMetadata>(base, API_PATHS.socialMetadata, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  streamUrl: (base: string, path: string) => `${base}${API_PATHS.stream(path)}`,
  downloadUrl: (base: string, path: string) => `${base}${API_PATHS.download(path)}`,
};

export { ApiError };