import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "アクセストークンが必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackUri, deviceId } = body;

    if (!trackUri) {
      return NextResponse.json(
        { error: "楽曲URIが必要です" },
        { status: 400 }
      );
    }

    // Spotify APIで楽曲を再生
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ""}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [trackUri],
        }),
      }
    );

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.json();
      return NextResponse.json(
        { error: "Spotify API エラー", details: errorData },
        { status: spotifyResponse.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Spotify楽曲再生エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
