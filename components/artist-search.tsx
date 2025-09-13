"use client";

import { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { SearchIcon, MusicIcon } from "./icons";
import ArtistCard from "../components/artist-card";
import Link from "next/link";
import { useSpotify } from "@/contexts/spotify-context";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  image: string | null;
  external_urls: {
    spotify: string;
  };
}

export default function ArtistSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { accessToken } = useSpotify();

  // 検索条件をlocalStorageから復元
  useEffect(() => {
    const savedQuery = localStorage.getItem("artist_search_query");
    if (savedQuery) {
      setSearchQuery(savedQuery);
    }
  }, []);

  // Spotify APIでアーティスト検索
  const searchArtists = async (query: string, reset = false) => {
    if (!query.trim() || !accessToken) return;

    if (reset) {
      setIsLoading(true);
      setOffset(0);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=20&offset=${currentOffset}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "検索に失敗しました");
      }

      const data = await response.json();
      
      if (reset) {
        setArtists(data.artists);
      } else {
        setArtists(prev => {
          // 既存のアーティストIDを取得
          const existingIds = new Set(prev.map(artist => artist.id));
          // 新しいアーティストで重複していないもののみを追加
          const newArtists = data.artists.filter((artist: SpotifyArtist) => !existingIds.has(artist.id));
          return [...prev, ...newArtists];
        });
      }
      
      setHasMore(data.hasMore);
      setOffset(currentOffset + data.artists.length);
    } catch (err) {
      console.error("検索エラー:", err);
      setError(err instanceof Error ? err.message : "検索中にエラーが発生しました");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 検索実行
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchArtists(searchQuery, true);
        // 検索条件をlocalStorageに保存
        localStorage.setItem("artist_search_query", searchQuery);
      } else {
        setArtists([]);
        setHasMore(true);
        setOffset(0);
        // 空の検索条件も保存
        localStorage.setItem("artist_search_query", "");
      }
    }, 500); // デバウンス

    return () => clearTimeout(timeoutId);
  }, [searchQuery, accessToken]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchArtists(searchQuery, true);
    }
  };

  // 無限スクロールのイベントハンドラー
  const handleScroll = () => {
    if (isLoadingMore || !hasMore || !searchQuery.trim()) return;
    
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // ページの下部に近づいたら次のページを読み込み
    if (scrollTop + clientHeight >= scrollHeight - 1000) {
      searchArtists(searchQuery, false);
    }
  };

  // スクロールイベントリスナーを追加
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore, offset, searchQuery]);

  // アクセストークンがない場合の表示
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
              アーティスト検索を使用するには、ホーム画面でSpotifyと連携してください。
              <br />
              <Link href="/" className="text-primary hover:text-primary-600 underline">
                ホーム画面へ
              </Link>
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
              placeholder="アーティスト名で検索..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              startContent={<SearchIcon className="text-default-400" />}
              className="flex-1"
              size="lg"
            />
            <Button
              color="primary"
              onPress={handleSearch}
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
      {searchQuery && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MusicIcon className="text-primary" />
            <h2 className="text-xl font-semibold">検索結果</h2>
          </div>
        </div>
      )}

      {/* アーティスト一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : artists.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artists.map((artist, index) => (
              <ArtistCard key={`${artist.id}-${index}`} artist={artist} />
            ))}
          </div>
          
          {/* 追加読み込み中の表示 */}
          {isLoadingMore && (
            <div className="flex justify-center py-8">
              <Spinner size="md" color="primary" />
              <span className="ml-2 text-default-500">追加のアーティストを読み込み中...</span>
            </div>
          )}
          
          {/* すべて読み込み完了の表示 */}
          {!hasMore && !isLoadingMore && searchQuery.trim() && (
            <div className="text-center py-8">
              <p className="text-default-500">すべてのアーティストを表示しました</p>
            </div>
          )}
        </>
      ) : searchQuery ? (
        <Card>
          <CardBody className="text-center py-12">
            <MusicIcon className="mx-auto text-6xl text-default-300 mb-4" />
            <h3 className="text-lg font-semibold text-default-600 mb-2">
              アーティストが見つかりませんでした
            </h3>
            <p className="text-default-500">
              検索条件を変更して再度お試しください
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="text-center py-12">
            <MusicIcon className="mx-auto text-6xl text-default-300 mb-4" />
            <h3 className="text-lg font-semibold text-default-600 mb-2">
              アーティストを検索しましょう
            </h3>
            <p className="text-default-500">
              上記の検索バーでアーティスト名を入力してください
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
