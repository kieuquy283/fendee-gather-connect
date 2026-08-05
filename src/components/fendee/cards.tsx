import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Users, HandHeart, HelpCircle, Heart } from "lucide-react";
import { Ava, Chip } from "./ui";
import { getPerson, type Gather, type Person, type StatusPost } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StatusCard({ post }: { post: StatusPost }) {
  const author = getPerson(post.authorId)!;
  return (
    <article className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Link to="/profile/$id" params={{ id: author.id }}>
          <Ava src={author.avatar} alt={author.name} online={author.online} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              to="/profile/$id"
              params={{ id: author.id }}
              className="truncate font-semibold hover:underline"
            >
              {author.name}
            </Link>
            <span className="text-xs text-muted-foreground">{post.time}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" />
            {post.distance} · {post.place}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[15px] leading-relaxed">{post.text}</p>

      <div className="mt-3 space-y-1.5">
        {post.canHelp && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <HandHeart className="h-3.5 w-3.5 text-primary" /> Có thể giúp:{" "}
            <span className="text-foreground">{post.canHelp}</span>
          </p>
        )}
        {post.needHelp && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-primary" /> Đang cần:{" "}
            <span className="text-foreground">{post.needHelp}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1 rounded-full" asChild>
          <Link to="/gather/new">Rủ gặp</Link>
        </Button>
        <Button size="sm" variant="secondary" className="flex-1 rounded-full" asChild>
          <Link to="/chat/$id" params={{ id: "c1" }}>
            Nhắn tin
          </Link>
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full px-3" aria-label="Thả tim">
          <Heart className="h-4 w-4" /> {post.reactions}
        </Button>
      </div>
    </article>
  );
}

export function GatherCard({ gather }: { gather: Gather }) {
  const host = getPerson(gather.hostId)!;
  const expired = gather.status === "expired";
  return (
    <Link
      to="/gather/$id"
      params={{ id: gather.id }}
      className={cn(
        "block rounded-3xl border border-border/70 bg-card p-4 shadow-card transition-transform active:scale-[0.99]",
        expired && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <Ava src={host.avatar} alt={host.name} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{gather.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {host.name} · {gather.distance}
          </p>
        </div>
        <Chip tone={expired ? "outline" : "accent"}>
          {expired ? "Đã hết hạn" : gather.startsIn}
        </Chip>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{gather.note}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-primary" />
          {gather.place}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3 text-primary" />
          {gather.duration}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3 text-primary" />
          {gather.joined.length}/{gather.slots}
        </span>
      </div>
    </Link>
  );
}

export function PersonCard({ person }: { person: Person }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Link to="/profile/$id" params={{ id: person.id }}>
          <Ava src={person.avatar} alt={person.name} online={person.online} size={52} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to="/profile/$id"
              params={{ id: person.id }}
              className="truncate font-semibold hover:underline"
            >
              {person.name}
            </Link>
            <span className="text-xs text-muted-foreground">{person.age}t</span>
            <Chip tone="accent" className="ml-auto">
              Hợp {person.match}%
            </Chip>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{person.bio}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" />
            {person.distance} · {person.place}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {person.interests.slice(0, 3).map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {person.canHelp[0] && (
          <p className="truncate">
            <HandHeart className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
            Có thể giúp: <span className="text-foreground">{person.canHelp[0]}</span>
          </p>
        )}
        {person.needHelp[0] && (
          <p className="truncate">
            <HelpCircle className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
            Đang cần: <span className="text-foreground">{person.needHelp[0]}</span>
          </p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1 rounded-full">
          {person.isFriend ? "Rủ gặp" : "Kết bạn"}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1 rounded-full" asChild>
          <Link to="/profile/$id" params={{ id: person.id }}>
            Xem hồ sơ
          </Link>
        </Button>
      </div>
    </div>
  );
}
