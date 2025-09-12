import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string; trackId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { artistId, trackId } = resolvedParams;

    if (!artistId || !trackId) {
      return NextResponse.json(
        { error: "アーティストIDと楽曲IDが必要です" },
        { status: 400 }
      );
    }

    // JSONファイルのパスを構築
    const lyricFilePath = join(process.cwd(), "data", "artist", artistId, "track", trackId, "lyric.json");

    try {
      // JSONファイルを読み込み
      const fileContent = await readFile(lyricFilePath, "utf-8");
      const lyricData = JSON.parse(fileContent);

      // 歌詞データをそのまま返す（新しい構造に対応）
      return NextResponse.json(lyricData);

    } catch (fileError) {
      console.error("歌詞ファイル読み込みエラー:", fileError);
      return NextResponse.json(
        { error: "歌詞ファイルが見つかりませんでした" },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error("歌詞取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
