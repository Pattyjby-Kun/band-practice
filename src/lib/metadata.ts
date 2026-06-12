import type { SongMetadata } from "@/types";

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com/i.test(url);
}

async function fetchOEmbed(
  endpoint: string,
  url: string
): Promise<{ title: string; thumbnail: string } | null> {
  try {
    const response = await fetch(
      `${endpoint}?url=${encodeURIComponent(url)}&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title || "",
      thumbnail: data.thumbnail_url || data.thumbnail || "",
    };
  } catch {
    return null;
  }
}

export async function fetchSongMetadata(url: string): Promise<SongMetadata | null> {
  if (!url.trim()) return null;

  if (isYouTubeUrl(url)) {
    const data = await fetchOEmbed("https://www.youtube.com/oembed", url);
    if (data) {
      return { ...data, source: "youtube" };
    }
  }

  if (isSpotifyUrl(url)) {
    const data = await fetchOEmbed("https://open.spotify.com/oembed", url);
    if (data) {
      return { ...data, source: "spotify" };
    }
  }

  return null;
}

export function detectUrlSource(url: string): "youtube" | "spotify" | "unknown" {
  if (isYouTubeUrl(url)) return "youtube";
  if (isSpotifyUrl(url)) return "spotify";
  return "unknown";
}
