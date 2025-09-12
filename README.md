# Lyricer

Spotify Web APIと連携した音楽アプリケーションです。

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. Spotify Developer Dashboard設定
1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)にアクセス
2. 新しいアプリを作成
3. リダイレクトURIに以下を設定：
   ```
   http://127.0.0.1:3000/api/auth/callback
   ```

### 3. 環境変数の設定
`.env.local`ファイルを作成し、以下を設定：

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

アプリケーションは `http://127.0.0.1:3000` で起動します。

## 機能

- **Spotify連携**: OAuth認証による安全な連携
- **アーティスト検索**: お気に入りのアーティストを発見
- **楽曲一覧**: アーティストの楽曲を一覧表示
- **検索機能**: 楽曲名やアルバム名で検索

## 技術スタック

- Next.js 15
- React 18
- HeroUI
- TypeScript
- Tailwind CSS