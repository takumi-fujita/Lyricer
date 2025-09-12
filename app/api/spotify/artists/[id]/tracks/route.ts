import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const artistId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "10";
    const offset = searchParams.get("offset") || "0";

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

    // アーティストのトップトラックを取得（より効率的）
    const topTracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=JP`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!topTracksResponse.ok) {
      const errorData = await topTracksResponse.json();
      return NextResponse.json(
        { error: "Spotify API エラー", details: errorData },
        { status: topTracksResponse.status }
      );
    }

    const topTracksData = await topTracksResponse.json();
    
    // アルバムから楽曲を取得（制限付き）
    const albumResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?market=JP&limit=20&offset=0&include_groups=album,single`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!albumResponse.ok) {
      const errorData = await albumResponse.json();
      return NextResponse.json(
        { error: "Spotify API エラー", details: errorData },
        { status: albumResponse.status }
      );
    }

    const albumData = await albumResponse.json();
    
    // アルバムから楽曲を取得（並列処理で効率化）
    const albumTracksPromises = albumData.items.slice(0, 10).map(async (album: any) => {
      try {
        const tracksResponse = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}/tracks?market=JP&limit=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          return tracksData.items.map((track: any) => ({
            id: track.id,
            name: track.name,
            artists: track.artists.map((artist: any) => ({
              id: artist.id,
              name: artist.name,
            })),
            album: {
              id: album.id,
              name: album.name,
              images: album.images,
              release_date: album.release_date,
            },
            duration_ms: track.duration_ms,
            popularity: 0,
            preview_url: track.preview_url,
            external_urls: track.external_urls,
            explicit: track.explicit,
          }));
        }
        return [];
      } catch (error) {
        console.error(`Error fetching tracks for album ${album.id}:`, error);
        return [];
      }
    });
    
    const albumTracksArrays = await Promise.all(albumTracksPromises);
    const albumTracks = albumTracksArrays.flat();
    
    // トップトラックとアルバムトラックを結合
    const allTracks = [
      ...topTracksData.tracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
        })),
        album: {
          id: track.album.id,
          name: track.album.name,
          images: track.album.images,
          release_date: track.album.release_date,
        },
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        preview_url: track.preview_url,
        external_urls: track.external_urls,
        explicit: track.explicit,
      })),
      ...albumTracks
    ];
    
    // 重複を除去（楽曲IDで重複を除去）
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );
    
    // ページネーション適用
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTracks = uniqueTracks.slice(startIndex, endIndex);

    return NextResponse.json({
      tracks: paginatedTracks,
      total: uniqueTracks.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < uniqueTracks.length,
    });

  } catch (error) {
    console.error("Spotify楽曲取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
