"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { button as buttonStyles } from "@heroui/theme";
import { title, subtitle } from "@/components/primitives";
import { MusicIcon } from "@/components/icons";
import { useSpotify } from "@/contexts/spotify-context";
import Link from "next/link";

export default function Home() {
  const { isConnected, user, connect, disconnect, isLoading } = useSpotify();
  const searchParams = useSearchParams();

  // URLパラメータからトークンを受け取って処理
  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (token) {
      // トークンをローカルストレージに保存
      localStorage.setItem("spotify_access_token", token);
      // ページをリロードして状態を更新
      window.location.href = "/";
    }

    if (error) {
      console.error("Spotify認証エラー:", error);
    }
  }, [searchParams]);

  // 初期描画時にSpotify連携状況を確認
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (token) {
          // トークンの有効性を確認
          const response = await fetch("https://api.spotify.com/v1/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
          } else {
            // 無効なトークンの場合は削除
            localStorage.removeItem("spotify_access_token");
          }
        }
      } catch (error) {
        console.error("Spotify連携確認エラー:", error);
      }
    };

    // コンポーネントマウント時に連携状況を確認
    checkSpotifyConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-100">
      <div className="container mx-auto px-4 py-8">
        <section className="flex flex-col items-center justify-center gap-8 py-12">
          {/* メインタイトル */}
          <div className="text-center max-w-4xl">
            <h1 className={title({ size: "lg" })}>
              <span className="text-foreground">Lyricer</span>
            </h1>
            <div className={subtitle({ class: "mt-4 text-xl" })}>
              〜 Spotifyと連携して歌詞の世界観を深掘りし、音楽体験を豊かにするアプリ 〜
            </div>
          </div>

          {/* 機能説明カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            <Card className="text-center">
              <CardBody className="p-6">
                <div className="w-10 h-10 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-primary text-xl">👥</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">パート可視化</h3>
                <p className="text-default-500 text-sm">
                  グループで歌っている歌手のどのパートを誰が歌っているかを視覚的に確認
                </p>
              </CardBody>
            </Card>
            
            <Card className="text-center">
              <CardBody className="p-6">
                <MusicIcon className="mx-auto text-4xl text-success mb-4" />
                <h3 className="text-lg font-semibold mb-2">Spotify連携</h3>
                <p className="text-default-500 text-sm">
                  Spotifyと連携して、あなたの音楽ライブラリから楽曲を探索
                </p>
              </CardBody>
            </Card>
            
            <Card className="text-center">
              <CardBody className="p-6">
                <div className="w-10 h-10 mx-auto bg-warning/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-warning text-xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">歌詞深掘り</h3>
                <p className="text-default-500 text-sm">
                  歌詞の世界観や意味を深く理解し、音楽体験を豊かにする
                </p>
              </CardBody>
            </Card>
          </div>

          {/* 連携状態に応じた表示 */}
          {isLoading ? (
            <div className="text-center">
              <Spinner size="lg" color="primary" />
              <p className="text-default-500 mt-4">読み込み中...</p>
            </div>
          ) : isConnected ? (
            <div className="text-center">
              {/* 連携済み表示 */}
              <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-4">
                <MusicIcon className="text-success text-2xl" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-success">
                Spotifyと連携済み
              </h2>
              {user && (
                <div className="mb-6">
                  <p className="text-lg font-medium">{user.display_name}</p>
                  <p className="text-sm text-default-500">{user.email}</p>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <Link href="/artist">
                  <Button
                    className={buttonStyles({
                      color: "primary",
                      radius: "full",
                      variant: "shadow",
                      size: "lg"
                    })}
                  >
                    アーティストを探す
                  </Button>
                </Link>
                <Button
                  className={buttonStyles({
                    color: "default",
                    radius: "full",
                    variant: "bordered",
                    size: "lg"
                  })}
                  onPress={disconnect}
                >
                  連携を解除
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              {/* 未連携表示 */}
              <Button
                className={buttonStyles({
                  color: "success",
                  radius: "full",
                  variant: "shadow",
                  size: "lg"
                })}
                onPress={connect}
                startContent={<span className="text-xl">🎵</span>}
              >
                Spotifyで始める
              </Button>
              
              <p className="text-sm text-default-500 mt-4 max-w-md">
                Spotifyアカウントと連携して、グループ楽曲のパート分析と歌詞の深掘りを始めましょう。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}