import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent("Spotify認証がキャンセルされました。")}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent("認証コードが取得できませんでした。")}`, request.url)
    );
  }

  try {
    // アクセストークンを取得
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/auth/callback";

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent("環境変数が設定されていません。")}`, request.url)
      );
    }

    // アクセストークンを取得
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("トークン取得に失敗しました");
    }

    const tokenData = await tokenResponse.json();
    
    // 成功時はホームページにリダイレクト（トークンはクライアント側で処理）
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("token", tokenData.access_token);
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("認証エラー:", error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent("認証処理中にエラーが発生しました。")}`, request.url)
    );
  }
}