import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const resolvedParams = await params;
    const artistId = resolvedParams.artistId;

    if (!artistId) {
      return NextResponse.json(
        { error: "アーティストIDが必要です" },
        { status: 400 }
      );
    }

    // アクセストークンを取得
    const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "アクセストークンが必要です" },
        { status: 401 }
      );
    }

    // color.jsonファイルのパスを構築
    const colorFilePath = path.join(process.cwd(), "data", "artist", artistId, "color.json");

    // ファイルが存在するかチェック
    if (!fs.existsSync(colorFilePath)) {
      return NextResponse.json(
        { error: "色設定ファイルが見つかりませんでした" },
        { status: 404 }
      );
    }

    // color.jsonファイルを読み込み
    const colorData = JSON.parse(fs.readFileSync(colorFilePath, "utf8"));

    return NextResponse.json(colorData);

  } catch (error) {
    console.error("色設定取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
