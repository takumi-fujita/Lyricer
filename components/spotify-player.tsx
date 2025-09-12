"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPreviousIcon } from "./icons";

interface SpotifyPlayerProps {
  accessToken: string;
  onTrackChange?: (track: any) => void;
  onPositionUpdate?: (position: number) => void;
  currentTrackUri?: string; // 再生したい楽曲のURI
}

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
}

export default function SpotifyPlayer({ accessToken, onTrackChange, onPositionUpdate, currentTrackUri }: SpotifyPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // グローバル関数を先に定義（スクリプト読み込み前に）
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify Web Playback SDK ready");
      initializePlayer();
    };

    // Spotify Web Playback SDKを読み込み
    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      
      // スクリプトの読み込み完了を待つ
      script.onload = () => {
        console.log("Spotify SDK script loaded");
      };
      
      script.onerror = () => {
        console.error("Failed to load Spotify SDK");
        setError("Spotify SDKの読み込みに失敗しました");
      };
      
      document.head.appendChild(script);
      scriptRef.current = script;
    }

    return () => {
      if (player) {
        player.disconnect();
      }
      // グローバル関数をクリーンアップ
      delete (window as any).onSpotifyWebPlaybackSDKReady;
    };
  }, [accessToken]);

  // currentTrackUriが変更された時に楽曲を再生
  useEffect(() => {
    if (currentTrackUri && isReady && deviceId) {
      console.log("Playing track:", currentTrackUri);
      playTrack(currentTrackUri);
    }
  }, [currentTrackUri, isReady, deviceId]);

  const initializePlayer = () => {
    if (!window.Spotify) {
      setError("Spotify SDKの読み込みに失敗しました");
      return;
    }

    const newPlayer = new window.Spotify.Player({
      name: "Lyricer Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(accessToken);
      },
      volume: 0.5,
    });

    // エラーハンドリング
    newPlayer.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("初期化エラー:", message);
      setError(`初期化エラー: ${message}`);
    });

    newPlayer.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("認証エラー:", message);
      setError(`認証エラー: ${message}`);
    });

    newPlayer.addListener("account_error", ({ message }: { message: string }) => {
      console.error("アカウントエラー:", message);
      setError(`アカウントエラー: ${message}`);
    });

    newPlayer.addListener("playback_error", ({ message }: { message: string }) => {
      console.error("再生エラー:", message);
      setError(`再生エラー: ${message}`);
    });

    // 再生状態の更新
    newPlayer.addListener("player_state_changed", (state: any) => {
      if (!state) return;

      setIsPlaying(!state.paused);
      setPosition(state.position);
      setDuration(state.duration);

      // 親コンポーネントに再生位置を通知
      if (onPositionUpdate) {
        onPositionUpdate(state.position);
      }

      if (state.track_window?.current_track) {
        const track = state.track_window.current_track;
        setCurrentTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
          external_urls: track.external_urls,
        });

        // 親コンポーネントに楽曲変更を通知
        if (onTrackChange) {
          onTrackChange(track);
        }
      }
    });

    // 準備完了
    newPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("Spotify Player準備完了, Device ID:", device_id);
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);
    });

    // 接続状態の更新
    newPlayer.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("デバイスが利用できなくなりました:", device_id);
      setIsReady(false);
    });

    // プレイヤーを接続
    newPlayer.connect();
    setPlayer(newPlayer);
  };

  const togglePlay = () => {
    if (player) {
      player.togglePlay();
    }
  };

  const skipNext = () => {
    if (player) {
      player.nextTrack();
    }
  };

  const skipPrevious = () => {
    if (player) {
      player.previousTrack();
    }
  };

  const playTrack = async (trackUri: string) => {
    if (!deviceId) {
      console.error("Device ID not available");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/spotify/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackUri: trackUri,
          deviceId: deviceId,
        }),
      });

      if (response.ok) {
        console.log("Track playback started");
      } else {
        const errorData = await response.json();
        console.error("Playback error:", errorData);
        setError(`再生エラー: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Playback request error:", error);
      setError("楽曲の再生に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-danger">{error}</p>
          <Button
            color="primary"
            variant="solid"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            再読み込み
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-default-500">Spotify Playerを初期化中...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-6">
        {currentTrack ? (
          <div className="space-y-4">
            {/* 楽曲情報 */}
            <div className="flex items-center gap-4">
              <img
                src={currentTrack.album.images[0]?.url || "/placeholder-album.svg"}
                alt={currentTrack.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {currentTrack.name}
                </h3>
                <p className="text-sm text-default-500 truncate">
                  {currentTrack.artists.map(artist => artist.name).join(", ")}
                </p>
                <p className="text-xs text-default-400 truncate">
                  {currentTrack.album.name}
                </p>
              </div>
            </div>

            {/* プログレスバー */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-default-500">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="w-full bg-default-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* コントロールボタン */}
            <div className="flex items-center justify-center gap-4">
              <Button
                isIconOnly
                variant="light"
                onClick={skipPrevious}
                disabled={!isReady}
              >
                <SkipPreviousIcon className="w-5 h-5" />
              </Button>
              <Button
                isIconOnly
                color="primary"
                variant="solid"
                onClick={togglePlay}
                disabled={!isReady}
                className="w-12 h-12"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6" />
                )}
              </Button>
              <Button
                isIconOnly
                variant="light"
                onClick={skipNext}
                disabled={!isReady}
              >
                <SkipNextIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-default-500">楽曲が再生されていません</p>
            <p className="text-sm text-default-400 mt-2">
              Spotifyで楽曲を再生してください
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Spotify Web Playback SDKの型定義
declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => {
        addListener: (event: string, callback: (data: any) => void) => void;
        connect: () => Promise<boolean>;
        disconnect: () => void;
        togglePlay: () => void;
        nextTrack: () => void;
        previousTrack: () => void;
        setVolume: (volume: number) => void;
      };
    };
  }
}
