"use client";

import { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Badge } from "@heroui/badge";
import { SearchIcon, MusicIcon } from "./icons";
import SongCard from "../components/song-card";
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
}

interface SongSearchProps {
  artistId: string;
}

export default function SongSearch({ artistId }: SongSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const { accessToken, isLoading: spotifyLoading } = useSpotify();

  // Spotify APIで楽曲を取得
  const fetchTracks = async (reset = false) => {
    if (!accessToken || !artistId || isRequesting) return;

    setIsRequesting(true);
    if (reset) {
      setIsLoading(true);
      setOffset(0);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(`/api/spotify/artists/${artistId}/tracks?limit=10&offset=${currentOffset}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "楽曲の取得に失敗しました");
      }

      const data = await response.json();
      
      if (reset) {
        setTracks(data.tracks);
      } else {
        setTracks(prev => {
          // 既存の楽曲IDを取得
          const existingIds = new Set(prev.map(track => track.id));
          // 新しい楽曲で重複していないもののみを追加
          const newTracks = data.tracks.filter((track: SpotifyTrack) => !existingIds.has(track.id));
          return [...prev, ...newTracks];
        });
      }
      
      setHasMore(data.hasMore);
      setOffset(currentOffset + data.tracks.length);
    } catch (err) {
      console.error("楽曲取得エラー:", err);
      setError(err instanceof Error ? err.message : "楽曲の取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRequesting(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    if (spotifyLoading) return;
    fetchTracks(true);
  }, [artistId, accessToken, spotifyLoading]);

  // 検索フィルタリング
  const filteredTracks = tracks.filter((track) => {
    if (!searchQuery.trim()) return true;
    
    const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artists.some(artist => 
        artist.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    return matchesSearch;
  });

  const handleSearch = () => {
    // 検索は自動的に実行されるため、ここでは何もしない
  };

  // 無限スクロールのイベントハンドラー
  const handleScroll = () => {
    if (isLoadingMore || !hasMore || isRequesting) return;
    
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // ページの下部に近づいたら次のページを読み込み
    if (scrollTop + clientHeight >= scrollHeight - 1000) {
      fetchTracks(false);
    }
  };

  // デバウンス付きスクロールハンドラー
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100); // 100msデバウンス
    };
    
    window.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [isLoadingMore, hasMore, offset, isRequesting]);

  // アクセストークンがない場合の表示
  if (spotifyLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="primary" />
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <Card>
          <CardBody className="text-center py-12">
            <MusicIcon className="mx-auto text-6xl text-default-300 mb-4" />
            <h3 className="text-lg font-semibold text-default-600 mb-2">
              Spotifyとの連携が必要です
            </h3>
            <p className="text-default-500">
              楽曲一覧を表示するには、ホーム画面でSpotifyと連携してください。
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* 検索バー */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="曲名、アルバム名で検索..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              startContent={<SearchIcon className="text-default-400" />}
              className="flex-1"
              size="lg"
            />
            <Button
              color="primary"
              onClick={handleSearch}
              size="lg"
              className="md:w-auto"
              disabled={!searchQuery.trim()}
            >
              検索
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="mb-6">
          <CardBody className="text-center py-4">
            <p className="text-danger">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* 結果表示 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MusicIcon className="text-primary" />
          <h2 className="text-xl font-semibold">楽曲一覧</h2>
        </div>
      </div>

      {/* 曲一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : filteredTracks.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTracks.map((track, index) => (
              <SongCard key={`${track.id}-${index}`} song={track} />
            ))}
          </div>
          
          {/* 追加読み込み中の表示 */}
          {isLoadingMore && (
            <div className="flex justify-center py-8">
              <Spinner size="md" color="primary" />
              <span className="ml-2 text-default-500">追加の楽曲を読み込み中...</span>
            </div>
          )}
          
          {/* すべて読み込み完了の表示 */}
          {!hasMore && !isLoadingMore && (
            <div className="text-center py-8">
              <p className="text-default-500">すべての楽曲を表示しました</p>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardBody className="text-center py-12">
            <MusicIcon className="mx-auto text-6xl text-default-300 mb-4" />
            <h3 className="text-lg font-semibold text-default-600 mb-2">
              楽曲が見つかりませんでした
            </h3>
            <p className="text-default-500">
              検索条件を変更して再度お試しください
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
