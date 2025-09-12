import { Card, CardBody } from "@heroui/card";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { PlayIcon } from "./icons";
import Link from "next/link";

interface Song {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  explicit: boolean;
}

interface SongCardProps {
  song: Song;
  artistId?: string;
}

export default function SongCard({ song, artistId }: SongCardProps) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  };

  const handlePlay = () => {
    // Spotifyで開く
    window.open(song.external_urls.spotify, '_blank');
  };

  return (
    <Card className="w-full hover:shadow-lg transition-all duration-300 hover:scale-105">
      <CardBody className="p-0">
        <div className="w-full flex justify-center">
          <Image
            alt={song.name}
            className="object-cover w-full h-48"
            src={song.album.images[0]?.url || "/placeholder-album.svg"}
            fallbackSrc="/placeholder-album.svg"
            width={300}
            height={300}
          />
        </div>
        
        <div className="px-4 py-3">
          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
            {song.name}
          </h3>
          <p className="text-sm text-default-500 mb-3 line-clamp-1">
            {song.artists.map(artist => artist.name).join(", ")}
          </p>
          
          <div className="flex items-center justify-between text-sm text-default-400 mb-4">
            <span>{formatReleaseDate(song.album.release_date)}</span>
            <span>{formatDuration(song.duration_ms)}</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              color="primary"
              variant="solid"
              size="sm"
              className="w-full"
              startContent={<PlayIcon className="w-4 h-4" />}
              onClick={handlePlay}
            >
              Spotifyで聴く
            </Button>
            
            {artistId && (
              <Link href={`/artist/${artistId}/track/${song.id}`}>
                <Button
                  color="secondary"
                  variant="bordered"
                  size="sm"
                  className="w-full"
                >
                  歌詞を見る
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
