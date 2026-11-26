import { supabase } from './supabase';
import type { Brand } from '../types';

// Shared by Creative Studio and Campaign Workshop: sends one creative to analyze-creative and returns
// three copy variants. One implementation, so both screens write copy the same way.

export type ConversionType = 'leads' | 'ecommerce' | 'bookings';

export interface CopyVariant {
  hook_type: 'problem' | 'result' | 'social_proof';
  hook_label: string;
  primary: string;
  body: string;
  cta: string;
}
export interface AnalysisResult {
  creative_analysis: string;
  creative_type: string;
  variants: CopyVariant[];
  benchmark_recommendation: string;
  benchmark_reason: string;
}

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const extractVideoThumbnail = (file: File): Promise<{ base64: string; dataUrl: string }> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url   = URL.createObjectURL(file);
    video.src = url; video.muted = true; video.playsInline = true;
    video.onloadeddata = () => { video.currentTime = 1; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      resolve({ base64: dataUrl.split(',')[1], dataUrl });
    };
    video.onerror = reject;
  });

export async function analyzeCreative(file: File, conversionType: ConversionType, brand: Brand | null): Promise<AnalysisResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const isVideo = file.type.startsWith('video/');
  let base64: string; let mediaType: string;
  if (isVideo) {
    ({ base64 } = await extractVideoThumbnail(file));
    mediaType = 'image/jpeg';
  } else {
    base64 = await fileToBase64(file);
    mediaType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
  }

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-creative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({ image_base64: base64, media_type: mediaType, conversion_type: conversionType, brand, is_video_thumbnail: isVideo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Analysis failed');
  return data as AnalysisResult;
}
