import ArtistSearch from "../../components/artist-search";

export default function ArtistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-background-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            アーティスト検索
          </h1>
        </div>
        <ArtistSearch />
      </div>
    </main>
  );
}
