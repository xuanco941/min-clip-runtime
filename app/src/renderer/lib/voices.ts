// Danh sách giọng đọc theo dịch vụ TTS — bám sát logic của webui MoneyPrinterTurbo.
// Giọng Azure được bundle từ file dữ liệu gốc để luôn khớp với backend.
import azureRaw from "../../../../api/MoneyPrinterTurbo/app/services/data/azure_voices.json";
import type { TtsServer } from "./api-types";

interface AzureVoice {
  name: string;
  gender: string;
}

const AZURE_VOICES = (azureRaw as AzureVoice[])
  .map((v) => `${v.name}-${v.gender}`)
  .sort();

// siliconflow / gemini / mimo: list nhỏ, port trực tiếp từ voice.py
const SILICONFLOW_VOICES = [
  ["FunAudioLLM/CosyVoice2-0.5B", "alex", "Male"],
  ["FunAudioLLM/CosyVoice2-0.5B", "anna", "Female"],
  ["FunAudioLLM/CosyVoice2-0.5B", "bella", "Female"],
  ["FunAudioLLM/CosyVoice2-0.5B", "benjamin", "Male"],
  ["FunAudioLLM/CosyVoice2-0.5B", "charles", "Male"],
  ["FunAudioLLM/CosyVoice2-0.5B", "claire", "Female"],
  ["FunAudioLLM/CosyVoice2-0.5B", "david", "Male"],
  ["FunAudioLLM/CosyVoice2-0.5B", "diana", "Female"],
].map(([model, v, g]) => `siliconflow:${model}:${v}-${g}`);

const GEMINI_VOICES = [
  ["Zephyr", "Female"], ["Puck", "Male"], ["Charon", "Male"], ["Kore", "Female"],
  ["Fenrir", "Male"], ["Aoede", "Female"], ["Thalia", "Female"], ["Sage", "Male"],
  ["Echo", "Female"], ["Harmony", "Female"], ["Lux", "Female"], ["Nova", "Female"],
  ["Vale", "Male"], ["Orion", "Male"], ["Atlas", "Male"],
].map(([v, g]) => `gemini:${v}-${g}`);

const MIMO_VOICES = [
  ["mimo_default", "Female"], ["冰糖", "Female"], ["茉莉", "Female"], ["苏打", "Male"],
  ["白桦", "Male"], ["Mia", "Female"], ["Chloe", "Female"], ["Milo", "Male"], ["Dean", "Male"],
].map(([v, g]) => `mimo:${v}-${g}`);

// valtec-tts (local, miễn phí): 5 giọng Việt dựng sẵn (Bắc/Nam).
const VALTEC_VOICES: { value: string; label: string }[] = [
  { value: "valtec:NF-Female", label: "Miền Bắc · Nữ" },
  { value: "valtec:SF-Female", label: "Miền Nam · Nữ" },
  { value: "valtec:NM1-Male", label: "Miền Bắc · Nam 1" },
  { value: "valtec:NM2-Male", label: "Miền Bắc · Nam 2" },
  { value: "valtec:SM-Male", label: "Miền Nam · Nam" },
];

export interface VoiceOption {
  value: string;
  label: string;
  hint?: string;
}

/** Nhãn dễ đọc: bỏ "Neural", đổi giới tính sang tiếng Việt. */
function friendlyLabel(v: string): string {
  let label = v.replace(/^siliconflow:[^:]+:/, "").replace(/^gemini:/, "").replace(/^mimo:/, "");
  label = label.replace("Neural", "");
  label = label.replace(/-Female$/, " · Nữ").replace(/-Male$/, " · Nam");
  return label;
}

/** Mã ngôn ngữ (vd "vi-VN") từ tên giọng Azure, để gợi ý/hiển thị. */
function localeOf(v: string): string | undefined {
  const m = v.match(/^([a-z]{2}-[A-Z]{2})/);
  return m ? m[1] : undefined;
}

/** Danh sách giọng cho 1 dịch vụ TTS (đúng như webui lọc). */
export function getVoices(ttsServer: TtsServer | undefined): VoiceOption[] {
  switch (ttsServer) {
    case "NO_VOICE":
      return [];
    case "valtec":
      return VALTEC_VOICES;
    case "siliconflow":
      return SILICONFLOW_VOICES.map((v) => ({ value: v, label: friendlyLabel(v) }));
    case "gemini-tts":
      return GEMINI_VOICES.map((v) => ({ value: v, label: friendlyLabel(v) }));
    case "mimo-tts":
      return MIMO_VOICES.map((v) => ({ value: v, label: friendlyLabel(v) }));
    case "azure-tts-v2":
      return AZURE_VOICES.filter((v) => v.includes("V2")).map((v) => ({
        value: v,
        label: friendlyLabel(v),
        hint: localeOf(v),
      }));
    case "azure-tts-v1":
    default:
      return AZURE_VOICES.filter((v) => !v.includes("V2")).map((v) => ({
        value: v,
        label: friendlyLabel(v),
        hint: localeOf(v),
      }));
  }
}
