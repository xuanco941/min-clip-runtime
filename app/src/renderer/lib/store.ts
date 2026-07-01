import { create } from "zustand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, API_PATHS } from "./api";
import type {
  ScriptRequest,
  SocialMetadataRequest,
  TaskData,
  TermsRequest,
  VideoParams,
} from "./api-types";
import { TASK_STATE_COMPLETE, TASK_STATE_FAILED, TASK_STATE_PROCESSING } from "./api-types";

interface AppState {
  baseUrl: string | null;
  setBaseUrl: (url: string | null) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  baseUrl: null,
  setBaseUrl: (url) => set({ baseUrl: url }),
  apiKey: "",
  setApiKey: (key) => set({ apiKey: key }),
}));

export function useApi() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  if (!baseUrl) {
    throw new Error("API chưa sẵn sàng");
  }
  return baseUrl;
}

export function useBootstrap() {
  const setBaseUrl = useAppStore((s) => s.setBaseUrl);
  useEffect(() => {
    let mounted = true;
    const tryFetch = () => {
      window.minclip.api
        .getBaseUrl()
        .then((url) => {
          if (mounted && url) setBaseUrl(url);
        })
        .catch(() => undefined);
    };

    // Thử ngay, và refetch khi main báo API "ready" (API lên sau renderer).
    tryFetch();
    const off = window.minclip.events.onAppStatus((payload) => {
      if (payload.status === "ready") tryFetch();
    });
    // Poll dự phòng tới khi có baseUrl (vd status đã ready trước khi listener gắn).
    const timer = setInterval(() => {
      if (useAppStore.getState().baseUrl) {
        clearInterval(timer);
        return;
      }
      tryFetch();
    }, 2000);

    return () => {
      mounted = false;
      off();
      clearInterval(timer);
    };
  }, [setBaseUrl]);
}

export function usePing() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useQuery({
    queryKey: ["ping", baseUrl],
    queryFn: () => (baseUrl ? api.ping(baseUrl) : Promise.reject("no url")),
    enabled: !!baseUrl,
    refetchInterval: 30_000,
  });
}

export function useTasks(page = 1, pageSize = 20) {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useQuery({
    queryKey: ["tasks", baseUrl, page, pageSize],
    queryFn: () => api.listTasks(baseUrl!, page, pageSize),
    enabled: !!baseUrl,
    refetchInterval: 5_000,
  });
}

export function useTask(taskId: string | null) {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useQuery({
    queryKey: ["task", baseUrl, taskId],
    queryFn: () => api.getTask(baseUrl!, taskId!),
    enabled: !!baseUrl && !!taskId,
    refetchInterval: (q) => {
      const data = q.state.data as TaskData | undefined;
      if (!data) return 2000;
      if (data.state === TASK_STATE_COMPLETE || data.state === TASK_STATE_FAILED) {
        return false;
      }
      return 2000;
    },
  });
}

export function useDeleteTask() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(baseUrl!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateVideo() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VideoParams) => api.createVideo(baseUrl!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useBgmList() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useQuery({
    queryKey: ["bgm", baseUrl],
    queryFn: () => api.listBgm(baseUrl!),
    enabled: !!baseUrl,
  });
}

export function useUploadBgm() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadBgm(baseUrl!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bgm"] }),
  });
}

export function useMaterialList() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useQuery({
    queryKey: ["materials", baseUrl],
    queryFn: () => api.listMaterials(baseUrl!),
    enabled: !!baseUrl,
  });
}

export function useUploadMaterial() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadMaterial(baseUrl!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useGenerateScript() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useMutation({
    mutationFn: (body: ScriptRequest) => api.generateScript(baseUrl!, body),
  });
}

export function useGenerateTerms() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useMutation({
    mutationFn: (body: TermsRequest) => api.generateTerms(baseUrl!, body),
  });
}

export function useGenerateSocialMetadata() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  return useMutation({
    mutationFn: (body: SocialMetadataRequest) => api.generateSocialMetadata(baseUrl!, body),
  });
}

export { API_PATHS, TASK_STATE_COMPLETE, TASK_STATE_FAILED, TASK_STATE_PROCESSING };