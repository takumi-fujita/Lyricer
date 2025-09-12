"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SpotifyContextType {
  isConnected: boolean;
  accessToken: string | null;
  user: SpotifyUser | null;
  connect: () => void;
  disconnect: () => void;
  isLoading: boolean;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // アクセストークンの検証
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  };

  // 初期化時に保存されたトークンを確認
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("spotify_access_token");
      
      if (savedToken) {
        const isValid = await verifyToken(savedToken);
        if (isValid) {
          setAccessToken(savedToken);
          setIsConnected(true);
        } else {
          // 無効なトークンは削除
          localStorage.removeItem("spotify_access_token");
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const connect = () => {
    // 認証フローを開始（既存のhandleSpotifyConnectと同じ処理）
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "your_client_id";
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/callback";
    const scopes = [
      "user-read-private",
      "user-read-email",
      "user-top-read",
      "user-read-recently-played",
      "playlist-read-private",
      "playlist-read-collaborative",
      "streaming",
      "user-read-playback-state",
      "user-modify-playback-state"
    ].join(" ");
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `show_dialog=true`;
    
    window.location.href = authUrl;
  };

  const disconnect = () => {
    localStorage.removeItem("spotify_access_token");
    setAccessToken(null);
    setIsConnected(false);
    setUser(null);
  };

  const value = {
    isConnected,
    accessToken,
    user,
    connect,
    disconnect,
    isLoading,
  };

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}
