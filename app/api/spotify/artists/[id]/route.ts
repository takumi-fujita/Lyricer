import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artistId = params.id;

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

    // Spotify APIでアーティスト情報を取得
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.json();
      return NextResponse.json(
        { error: "Spotify API エラー", details: errorData },
        { status: spotifyResponse.status }
      );
    }

    const artist = await spotifyResponse.json();
    
    // アーティストデータを整形
    const formattedArtist = {
      id: artist.id,
      name: artist.name,
      genres: artist.genres || [],
      popularity: artist.popularity,
      followers: artist.followers?.total || 0,
      image: artist.images?.[0]?.url || null,
      external_urls: artist.external_urls,
    };

    return NextResponse.json(formattedArtist);

  } catch (error) {
    console.error("Spotifyアーティスト取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
