"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { ArrowLeftIcon, PlayIcon } from "../../../../../components/icons";
import { useSpotify } from "@/contexts/spotify-context";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  explicit: boolean;
  // 楽曲の詳細情報
  available_markets: string[];
  disc_number: number;
  track_number: number;
  // 作詞・作曲者情報（Spotify APIから取得）
  artists_details?: Array<{
    id: string;
    name: string;
    genres: string[];
    popularity: number;
  }>;
}

interface LyricsData {
  lyrics: string;
  syncType: string;
  lines: Array<{
    startTimeMs: string;
    words: string;
    part?: string; // パート情報を追加
    syllables: Array<{
      startTimeMs: string;
      endTimeMs: string;
      content: string;
    }>;
  }>;
}

interface TrackPageProps {
  params: Promise<{
    id: string;
    trackId: string;
  }>;
}

export default function TrackPage({ params }: TrackPageProps) {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, isLoading: spotifyLoading } = useSpotify();
  
  // React.use()でparamsを取得
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchTrackAndLyrics = async () => {
      // トークンの読み込みが完了するまで待機
      if (spotifyLoading) return;
      
      if (!accessToken) {
        setError("Spotifyとの連携が必要です");
        setIsLoading(false);
        return;
      }

      try {
        // 楽曲情報を取得
        const trackResponse = await fetch(`/api/spotify/tracks/${resolvedParams.trackId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!trackResponse.ok) {
          if (trackResponse.status === 404) {
            notFound();
          }
          const errorData = await trackResponse.json();
          throw new Error(errorData.error || "楽曲情報の取得に失敗しました");
        }

        const trackData = await trackResponse.json();
        
        // アーティストの詳細情報を取得
        const artistDetailsPromises = trackData.artists.map(async (artist: any) => {
          try {
            const artistResponse = await fetch(`/api/spotify/artists/${artist.id}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            if (artistResponse.ok) {
              const artistData = await artistResponse.json();
              return {
                id: artist.id,
                name: artist.name,
                genres: artistData.genres || [],
                popularity: artistData.popularity || 0,
              };
            }
            return {
              id: artist.id,
              name: artist.name,
              genres: [],
              popularity: 0,
            };
          } catch (error) {
            console.error(`Error fetching artist ${artist.id}:`, error);
            return {
              id: artist.id,
              name: artist.name,
              genres: [],
              popularity: 0,
            };
          }
        });
        
        const artistsDetails = await Promise.all(artistDetailsPromises);
        const trackWithDetails = {
          ...trackData,
          artists_details: artistsDetails,
        };
        
        setTrack(trackWithDetails);

        // 歌詞を取得
        const lyricsResponse = await fetch(`/api/artist/${resolvedParams.id}/track/${resolvedParams.trackId}/lyric`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (lyricsResponse.ok) {
          const lyricsData = await lyricsResponse.json();
          setLyrics(lyricsData);
        } else {
          // 歌詞が見つからない場合は空の歌詞を設定
          const emptyLyrics: LyricsData = {
            lyrics: "歌詞が見つかりませんでした",
            syncType: "LINE_SYNCED",
            lines: []
          };
          setLyrics(emptyLyrics);
        }

      } catch (err) {
        console.error("楽曲・歌詞取得エラー:", err);
        setError(err instanceof Error ? err.message : "楽曲・歌詞情報の取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrackAndLyrics();
  }, [resolvedParams.trackId, accessToken, spotifyLoading]);

  if (isLoading || spotifyLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background to-background-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !track) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background to-background-100">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardBody className="text-center py-12">
              <h3 className="text-lg font-semibold text-danger mb-2">
                {error || "楽曲が見つかりませんでした"}
              </h3>
            </CardBody>
          </Card>
        </div>
      </main>
    );
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    // Spotifyで開く
    window.open(track.external_urls.spotify, '_blank');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-background-100">
      <div className="container mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Button
            variant="light"
            startContent={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={() => window.history.back()}
            className="text-default-500 hover:text-foreground"
          >
            アーティスト一覧に戻る
          </Button>
        </div>

        {/* 楽曲情報ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-64 h-64 flex-shrink-0 flex justify-center">
              <Image
                src={track.album.images[0]?.url || "/placeholder-album.svg"}
                alt={track.name}
                className="w-full h-full object-cover rounded-lg shadow-lg"
                fallbackSrc="/placeholder-album.svg"
                width={256}
                height={256}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {track.name}
              </h1>
              <div className="text-lg text-foreground-500 mb-4">
                <span className="font-semibold">
                  {track.artists.map(artist => artist.name).join(", ")}
                </span>
                <span className="mx-2">•</span>
                <span>{track.album.name}</span>
                <span className="mx-2">•</span>
                <span>{formatDuration(track.duration_ms)}</span>
              </div>
              
              {/* 作詞・作曲者情報 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground-600 uppercase tracking-wide mb-3">
                  作詞・作曲者
                </h3>
                <div className="space-y-2">
                  {track.artists_details?.map((artist, index) => (
                    <div key={artist.id} className="text-sm">
                      <div className="font-medium text-foreground-700">
                        {artist.name}
                      </div>
                      {artist.genres.length > 0 && (
                        <div className="text-xs text-foreground-500 mt-1">
                          ジャンル: {artist.genres.slice(0, 3).join(", ")}
                          {artist.genres.length > 3 && "..."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <Button
                  color="primary"
                  variant="solid"
                  size="lg"
                  startContent={<PlayIcon className="w-5 h-5" />}
                  onClick={handlePlay}
                >
                  Spotifyで聴く
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 歌詞表示 */}
        <Card>
          <CardBody className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">歌詞</h2>
            {lyrics ? (
              <div className="space-y-4">
                {lyrics.lines.map((line, index) => (
                  <div key={index} className="flex items-start gap-4">
                    {line.part && (
                      <div className="flex-shrink-0">
                        <span className="inline-block px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">
                          {line.part}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-foreground-700 leading-relaxed">
                      {line.words}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-default-500">歌詞を読み込み中...</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
