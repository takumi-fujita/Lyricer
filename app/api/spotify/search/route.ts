import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";

    if (!query) {
      return NextResponse.json(
        { error: "検索クエリが必要です" },
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

    // Spotify APIでアーティスト検索
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}&offset=${offset}`,
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
    
    // アーティストデータを整形
    const artists = data.artists.items.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres || [],
      popularity: artist.popularity,
      followers: artist.followers?.total || 0,
      image: artist.images?.[0]?.url || null,
      external_urls: artist.external_urls,
    }));

    const hasMore = data.artists.offset + data.artists.limit < data.artists.total;

    return NextResponse.json({
      artists,
      total: data.artists.total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore,
    });

  } catch (error) {
    console.error("Spotify検索エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
