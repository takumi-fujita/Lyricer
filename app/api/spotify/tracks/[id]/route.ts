import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const trackId = resolvedParams.id;

    if (!trackId) {
      return NextResponse.json(
        { error: "楽曲IDが必要です" },
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

    // Spotify APIで楽曲情報を取得
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}?market=JP`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.json();
      return NextResponse.json(
        { error: "Spotify連携エラー<br/>ホーム画面から再連携し直してください。", details: errorData },
        { status: spotifyResponse.status }
      );
    }

    const data = await spotifyResponse.json();
    
    // 楽曲データを整形
    const track = {
      id: data.id,
      name: data.name,
      artists: data.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      album: {
        id: data.album.id,
        name: data.album.name,
        images: data.album.images,
        release_date: data.album.release_date,
      },
      duration_ms: data.duration_ms,
      popularity: data.popularity,
      preview_url: data.preview_url,
      external_urls: data.external_urls,
      explicit: data.explicit,
      available_markets: data.available_markets,
      disc_number: data.disc_number,
      track_number: data.track_number,
    };

    return NextResponse.json(track);

  } catch (error) {
    console.error("Spotify楽曲取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
