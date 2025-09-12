import { Card, CardBody } from "@heroui/card";
import { Image } from "@heroui/image";
import { Chip } from "@heroui/chip";
import Link from "next/link";

interface Artist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  image: string | null;
  external_urls: {
    spotify: string;
  };
}

interface ArtistCardProps {
  artist: Artist;
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const getGenreColor = (genre: string) => {
    const colors: { [key: string]: string } = {
      pop: "primary",
      "k-pop": "secondary",
      "r&b": "success",
      "hip-hop": "warning",
      alternative: "danger",
      country: "default",
      electronic: "primary",
      rock: "default",
      jazz: "secondary",
      classical: "default",
    };
    return colors[genre.toLowerCase()] || "default";
  };

  const formatFollowers = (followers: number) => {
    if (followers >= 1000000) {
      return `${(followers / 1000000).toFixed(1)}M`;
    } else if (followers >= 1000) {
      return `${(followers / 1000).toFixed(1)}K`;
    }
    return followers.toString();
  };

  return (
    <Link href={`/artist/${artist.id}`}>
      <Card className="w-full hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
        <CardBody className="p-0">
          <div className="relative w-full h-64 overflow-hidden flex justify-center">
            <Image
              alt={artist.name}
              className="object-cover w-full h-full object-center"
              src={artist.image || "/placeholder-artist.svg"}
              fallbackSrc="/placeholder-artist.svg"
              width={300}
              height={300}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h3 className="text-xl font-bold text-white mb-1">
                {artist.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {artist.genres.slice(0, 2).map((genre, index) => (
                  <Chip
                    key={index}
                    color={getGenreColor(genre) as any}
                    variant="flat"
                    size="sm"
                  >
                    {genre}
                  </Chip>
                ))}
                {artist.genres.length > 2 && (
                  <span className="text-white/80 text-xs">
                    +{artist.genres.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
        <div className="p-4">
          <h4 className="text-lg font-semibold text-foreground text-center mb-2">
            {artist.name}
          </h4>
          <div className="text-center text-sm text-default-500">
            <span className="font-medium">{formatFollowers(artist.followers)}</span> フォロワー
          </div>
        </div>
      </Card>
    </Link>
  );
}
