"use client";

import { useState, useEffect, use, useRef } from "react";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { ArrowLeftIcon, PlayIcon, PauseIcon, StopIcon } from "../../../../../components/icons";
import { useSpotify } from "@/contexts/spotify-context";
import SpotifyPlayer, { SpotifyPlayerRef } from "../../../../../components/spotify-player";

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
  lyric: Array<{
    part: string | string[];
    lyric: string;
    startTimeMs: number;
  }>;
}

interface ColorData {
  color: Array<{
    part: string;
    color: string;
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
  const [colors, setColors] = useState<ColorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showStickyControls, setShowStickyControls] = useState(false);
  const { accessToken, isLoading: spotifyLoading } = useSpotify();
  const spotifyPlayerRef = useRef<SpotifyPlayerRef>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  
  // React.use()でparamsを取得
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchTrackAndLyrics = async () => {
      // トークンの読み込みが完了するまで待機
      if (spotifyLoading) return;
      
      if (!accessToken) {
        setError("Spotifyとの連携が必要です<br/>ホーム画面から再連携し直してください。");
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
            lyric: []
          };
          setLyrics(emptyLyrics);
        }

        // 色設定を取得
        const colorsResponse = await fetch(`/api/artist/${resolvedParams.id}/color`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (colorsResponse.ok) {
          const colorsData = await colorsResponse.json();
          setColors(colorsData);
        } else {
          // 色設定が見つからない場合は空の配列を設定
          const defaultColors: ColorData = {
            color: []
          };
          setColors(defaultColors);
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

  // スクロール位置を監視して固定コントロールの表示を制御
  useEffect(() => {
    const handleScroll = () => {
      const controlsElement = document.getElementById('playback-controls');
      if (controlsElement) {
        const rect = controlsElement.getBoundingClientRect();
        // コントロールが画面上部から少しでも隠れたら固定表示
        setShowStickyControls(rect.top < 70);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 現在の歌詞行に自動スクロール
  useEffect(() => {
    if (!lyrics || !lyrics.lyric || currentPosition === 0) return;
    
    // 現在の歌詞インデックスを計算
    let currentLyricIndex = -1;
    for (let i = 0; i < lyrics.lyric.length; i++) {
      const line = lyrics.lyric[i];
      const startTimeMs = line.startTimeMs;
      const nextStartTimeMs = i < lyrics.lyric.length - 1 
        ? lyrics.lyric[i + 1].startTimeMs 
        : Infinity;
      
      if (currentPosition >= startTimeMs && currentPosition < nextStartTimeMs) {
        currentLyricIndex = i;
        break;
      }
    }
    
    if (currentLyricIndex >= 0 && lyricsRef.current) {
      const lyricElement = lyricsRef.current.children[currentLyricIndex] as HTMLElement;
      if (lyricElement) {
        lyricElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentPosition, lyrics]);


  if (isLoading || spotifyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-100">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardBody className="text-center py-12">
              <h3 
                className="text-lg font-semibold text-danger mb-2"
                dangerouslySetInnerHTML={{ __html: error || "楽曲が見つかりませんでした" }}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (spotifyPlayerRef.current) {
      if (isPlaying) {
        spotifyPlayerRef.current.pause();
      } else {
        // 楽曲がロードされていない場合は、currentTrackUriを設定して楽曲をロード
        if (!isPlaying && track) {
          // 楽曲をロードして再生
          spotifyPlayerRef.current.play();
        }
      }
    }
  };

  const handleStop = () => {
    if (spotifyPlayerRef.current) {
      spotifyPlayerRef.current.stop();
      setIsPlaying(false);
      setCurrentPosition(0);
    }
  };

  // 現在再生中の楽曲が変更された時の処理
  const handleTrackChange = (playingTrack: any) => {
    setCurrentPlayingTrack(playingTrack);
  };

  // 現在の再生位置を更新
  const handlePositionUpdate = (position: number) => {
    setCurrentPosition(position);
  };

  // 再生状態を更新
  const handlePlaybackStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // パート名から色を取得する関数
  const getPartColor = (partName: string) => {
    if (!colors || !colors.color) {
      return 'text-primary'; // デフォルト色
    }
    const colorItem = colors.color.find(item => item.part === partName);
    return colorItem ? colorItem.color : 'text-primary';
  };

  // 歌詞のハイライト表示を判定（時間ベース）
  const getCurrentLyricIndex = () => {
    if (!lyrics || !lyrics.lyric || currentPosition === 0) return -1;
    
    // 現在の再生位置に基づいて歌詞のインデックスを計算
    const currentTimeMs = currentPosition;
    
    // デバッグ情報を出力
    console.log("Current time:", currentTimeMs, "ms");
    
    // 歌詞データから現在の時間に該当する歌詞を検索
    for (let i = 0; i < lyrics.lyric.length; i++) {
      const line = lyrics.lyric[i];
      const startTimeMs = line.startTimeMs;
      const nextStartTimeMs = i < lyrics.lyric.length - 1 
        ? lyrics.lyric[i + 1].startTimeMs 
        : Infinity;
      
      // デバッグ情報を出力
      if (i < 5) { // 最初の5行のみログ出力
        console.log(`Line ${i}: ${line.lyric.substring(0, 20)}... (${startTimeMs}ms - ${nextStartTimeMs}ms)`);
      }
      
      // 現在の時間がこの歌詞の時間範囲内にあるかチェック
      if (currentTimeMs >= startTimeMs && currentTimeMs < nextStartTimeMs) {
        console.log(`Found matching lyric at index ${i}: ${line.lyric}`);
        return i;
      }
    }
    
    console.log("No matching lyric found");
    return -1;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-100">
      <div className="container mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Button
            variant="light"
            startContent={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={() => window.history.back()}
            className="text-default-500 hover:text-foreground p-0"
          >
            楽曲一覧に戻る
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
              <div id="playback-controls" className="flex items-center gap-4 mb-4">
                <Button
                  color="primary"
                  variant="solid"
                  size="lg"
                  startContent={isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                  onPress={handlePlay}
                >
                  {isPlaying ? "一時停止" : "再生"}
                </Button>
                <Button
                  color="default"
                  variant="bordered"
                  size="lg"
                  startContent={<StopIcon className="w-5 h-5" />}
                  onPress={handleStop}
                >
                  停止
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 固定再生コントロール（スクロール時に表示） */}
        {showStickyControls && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-background/95 backdrop-blur-sm border border-default-200 rounded-lg p-4 shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    color="primary"
                    variant="solid"
                    size="lg"
                    startContent={isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    onPress={handlePlay}
                  >
                    {isPlaying ? "一時停止" : "再生"}
                  </Button>
                  <Button
                    color="default"
                    variant="bordered"
                    size="lg"
                    startContent={<StopIcon className="w-5 h-5" />}
                    onPress={handleStop}
                  >
                    停止
                  </Button>
                </div>
                {(isPlaying || currentPosition > 0) && (
                  <div className="text-sm text-default-500">
                    現在位置: {Math.floor(currentPosition / 1000)}秒
                    {getCurrentLyricIndex() >= 0 && (
                      <span className="ml-2 text-primary">
                        (歌詞 {getCurrentLyricIndex() + 1}行目)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spotify Player */}
        {accessToken && (
          <div className="mb-8">
            <SpotifyPlayer 
              ref={spotifyPlayerRef}
              accessToken={accessToken} 
              onTrackChange={handleTrackChange}
              onPositionUpdate={handlePositionUpdate}
              onPlaybackStateChange={handlePlaybackStateChange}
              currentTrackUri={track ? `spotify:track:${track.id}` : undefined}
            />
          </div>
        )}

        {/* 歌詞表示 */}
        <Card>
          <CardBody className="p-2 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">歌詞</h2>
              {(isPlaying || currentPosition > 0) && (
                <div className="text-sm text-default-500">
                  現在位置: {Math.floor(currentPosition / 1000)}秒
                  {getCurrentLyricIndex() >= 0 && (
                    <span className="ml-2 text-primary">
                      (歌詞 {getCurrentLyricIndex() + 1}行目)
                    </span>
                  )}
                </div>
              )}
            </div>
            {lyrics && lyrics.lyric && lyrics.lyric.length > 0 ? (
              <div ref={lyricsRef} className="space-y-4">
                {lyrics.lyric.map((line, index) => {
                  const isCurrentLyric = getCurrentLyricIndex() === index;
                  return (
                    <div 
                      key={index} 
                      className={`flex items-start gap-4 p-3 rounded-lg transition-all duration-300 ${
                        isCurrentLyric 
                          ? 'bg-primary/10 border-l-4 border-primary shadow-md' 
                          : 'hover:bg-default-50'
                      }`}
                    >
                      {line.part && (
                        <div className="flex-shrink-0">
                          <div className="flex flex-col gap-1">
                            {Array.isArray(line.part) ? (
                              // 2人ずつグループに分けて表示
                              line.part.reduce((groups: string[][], partName, index) => {
                                const groupIndex = Math.floor(index / 2);
                                if (!groups[groupIndex]) {
                                  groups[groupIndex] = [];
                                }
                                groups[groupIndex].push(partName);
                                return groups;
                              }, []).map((group, groupIndex) => (
                                <div key={groupIndex} className="flex gap-1">
                                  {group.map((partName, partIndex) => (
                                    <span 
                                      key={partIndex}
                                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary ${
                                        isCurrentLyric ? 'ring-2 ring-primary ring-offset-2' : ''
                                      }`}
                                    >
                                      <span className={getPartColor(partName)}>{partName}</span>
                                    </span>
                                  ))}
                                </div>
                              ))
                            ) : (
                              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary ${
                                isCurrentLyric ? 'ring-2 ring-primary ring-offset-2' : ''
                              }`}>
                                <span className={getPartColor(line.part)}>{line.part}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className={`flex-1 leading-relaxed transition-all duration-300 ${
                        isCurrentLyric 
                          ? 'text-primary font-semibold text-lg' 
                          : 'text-foreground-700'
                      }`}>
                        {line.lyric}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-default-500">
                  {lyrics ? "歌詞が見つかりませんでした" : "歌詞を読み込み中..."}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}