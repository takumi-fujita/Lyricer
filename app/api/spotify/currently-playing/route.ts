import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証トークンが必要です" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 204) {
        // 何も再生されていない場合
        return NextResponse.json(
          { 
            isPlaying: false,
            currentTrack: null,
            progressMs: 0
          },
          { status: 200 }
        );
      }
      
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || "現在再生中の楽曲の取得に失敗しました" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      isPlaying: !data.is_playing,
      currentTrack: data.item ? {
        id: data.item.id,
        name: data.item.name,
        artists: data.item.artists,
        album: data.item.album,
        duration_ms: data.item.duration_ms,
        external_urls: data.item.external_urls,
      } : null,
      progressMs: data.progress_ms || 0,
      timestamp: data.timestamp
    });

  } catch (error) {
    console.error("Currently playing API error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
