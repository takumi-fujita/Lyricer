"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";

interface SpotifyPlayerProps {
  accessToken: string;
  onTrackChange?: (track: any) => void;
  onPositionUpdate?: (position: number) => void;
  onPlaybackStateChange?: (playing: boolean) => void;
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

export interface SpotifyPlayerRef {
  play: () => void;
  pause: () => void;
  stop: () => void;
}

const SpotifyPlayer = forwardRef<SpotifyPlayerRef, SpotifyPlayerProps>(({ accessToken, onTrackChange, onPositionUpdate, onPlaybackStateChange, currentTrackUri }, ref) => {
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
      initializePlayer();
    };

    // Spotify Web Playback SDKを読み込み
    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      
      // スクリプトの読み込み完了を待つ
      script.onload = () => {
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

  // currentTrackUriが変更された時の処理（楽曲の自動ロードは無効）
  useEffect(() => {
    if (currentTrackUri && isReady && deviceId) {
      // 楽曲の自動ロードは無効
      // ユーザーが再生ボタンを押した時にplay()メソッドで楽曲をロードして再生
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
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);
    });

    // 接続状態の更新
    newPlayer.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      setIsReady(false);
    });

    // プレイヤーを接続
    newPlayer.connect();
    setPlayer(newPlayer);
  };

  // 再生状態が変更された時にコールバックを呼び出す
  useEffect(() => {
    if (onPlaybackStateChange) {
      onPlaybackStateChange(isPlaying);
    }
  }, [isPlaying, onPlaybackStateChange]);

  // 再生位置を定期的に更新（プログレスバーの同期のため）
  useEffect(() => {
    if (!player || !isPlaying) return;

    const interval = setInterval(async () => {
      try {
        const state = await player.getCurrentState();
        if (state) {
          setPosition(state.position);
          setDuration(state.duration);
          
          // 親コンポーネントに再生位置を通知
          if (onPositionUpdate) {
            onPositionUpdate(state.position);
          }
        }
      } catch (error) {
        console.error("Error getting current state:", error);
      }
    }, 500); // 0.5秒間隔で更新（より滑らかな表示）

    return () => clearInterval(interval);
  }, [player, isPlaying, onPositionUpdate]);

  // 再生制御メソッド
  const play = () => {    
    if (!isReady || !deviceId) {
      console.error("Player not ready or device ID not available");
      return;
    }

    if (player && currentTrack) {
      player.togglePlay();
    } else if (currentTrackUri) {
      // 楽曲がロードされていない場合は、楽曲をロードして再生
      loadAndPlayTrack(currentTrackUri);
    }
  };

  const pause = () => {
    if (player && currentTrack) {
      player.togglePlay();
    }
  };

  const stop = () => {
    if (player) {
      player.pause();
      // 位置を0にリセット
      player.seek(0);
      setCurrentTrack(null);
      setIsPlaying(false);
      setPosition(0);
    }
  };

  // 親コンポーネントから呼び出せるメソッドを公開
  useImperativeHandle(ref, () => ({
    play,
    pause,
    stop
  }), [player, currentTrack, currentTrackUri, deviceId]);

  const loadAndPlayTrack = async (trackUri: string) => {
    if (!deviceId) {
      console.error("Device ID not available in loadAndPlayTrack");
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
        // 少し待ってから再生状態を確認
        setTimeout(() => {
          if (player) {
            player.getCurrentState().then((state: any) => {
              if (state) {
                setIsPlaying(!state.paused);
                setPosition(state.position);
                setDuration(state.duration);
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
                }
              }
            });
          }
        }, 1000);
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

      if (!response.ok) {
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
                  className="bg-primary h-2 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
                />
              </div>
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
});

SpotifyPlayer.displayName = "SpotifyPlayer";

export default SpotifyPlayer;

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
        seek: (position_ms: number) => void;
        getCurrentState: () => Promise<any>;
      };
    };
  }
}
