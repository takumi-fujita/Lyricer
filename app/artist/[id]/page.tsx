"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { ArrowLeftIcon } from "../../../components/icons";
import SongSearch from "../../../components/song-search";
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

interface ArtistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, isLoading: spotifyLoading } = useSpotify();
  
  // React.use()でparamsを取得
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchArtist = async () => {
      // トークンの読み込みが完了するまで待機
      if (spotifyLoading) return;
      
      if (!accessToken) {
        setError("Spotifyとの連携が必要です<br/>ホーム画面から再連携し直してください。");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/spotify/artists/${resolvedParams.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          const errorData = await response.json();
          throw new Error(errorData.error || "アーティスト情報の取得に失敗しました");
        }

        const artistData = await response.json();
        setArtist(artistData);
      } catch (err) {
        console.error("アーティスト取得エラー:", err);
        setError(err instanceof Error ? err.message : "アーティスト情報の取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtist();
  }, [resolvedParams.id, accessToken, spotifyLoading]);

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

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-100">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardBody className="text-center py-12">
              <h3 className="text-lg font-semibold text-danger mb-2">
                {error || "アーティストが見つかりませんでした"}
              </h3>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const formatFollowers = (followers: number) => {
    if (followers >= 1000000) {
      return `${(followers / 1000000).toFixed(1)}M`;
    } else if (followers >= 1000) {
      return `${(followers / 1000).toFixed(1)}K`;
    }
    return followers.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-100">
      <div className="container mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Button
            variant="light"
            startContent={<ArrowLeftIcon className="w-4 h-4" />}
            onPress={() => window.history.back()}
            className="text-default-500 hover:text-foreground p-0"
          >
            アーティスト一覧に戻る
          </Button>
        </div>

        {/* アーティスト情報ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-64 h-64 flex-shrink-0 flex justify-center">
              <Image
                src={artist.image || "/placeholder-artist.svg"}
                alt={artist.name}
                className="w-full h-full object-cover rounded-lg shadow-lg"
                fallbackSrc="/placeholder-artist.svg"
                width={256}
                height={256}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {artist.name}
              </h1>
              <div className="text-lg text-foreground-500 mb-4">
                <span className="font-semibold">{formatFollowers(artist.followers)}</span> フォロワー
                <span className="mx-2">•</span>
                人気度: {artist.popularity}/100
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {artist.genres.slice(0, 5).map((genre, index) => (
                  <Chip
                    key={index}
                    color="primary"
                    variant="flat"
                    size="sm"
                  >
                    {genre}
                  </Chip>
                ))}
                {artist.genres.length > 5 && (
                  <span className="text-default-500 text-sm">
                    +{artist.genres.length - 5} その他
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 曲一覧 */}
        <SongSearch artistId={resolvedParams.id} />
      </div>
    </div>
  );
}
