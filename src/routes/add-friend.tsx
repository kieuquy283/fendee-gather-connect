import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Link2, QrCode, Share2, UserPlus } from "lucide-react";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/lib/auth";
import { useSocialGraph } from "@/lib/social-graph";

export const Route = createFileRoute("/add-friend")({
  head: () => ({
    meta: [
      { title: "Thêm bạn bằng link hoặc QR - Fendee" },
      {
        name: "description",
        content:
          "Chia sẻ link mời hoặc quét mã QR để kết bạn trên Fendee. Chỉ bạn bè mới thấy vị trí chi tiết của bạn.",
      },
      { property: "og:title", content: "Thêm bạn trên Fendee" },
      { property: "og:description", content: "Mời bạn bè bằng link hoặc mã QR." },
    ],
  }),
  component: AddFriend,
});

function AddFriend() {
  const socialGraph = useSocialGraph();
  const busy = socialGraph.actionState.friendRequest.status === "loading";
  const error = socialGraph.actionState.friendRequest.error;
  const profile = socialGraph.currentProfile;

  return (
    <RequireAuth>
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-10">
        <TopBar title="Thêm bạn bè" subtitle="Bước 3 / 3" back="/setup-profile" />

        <div className="rounded-3xl bg-brand-gradient p-6 text-center text-primary-foreground shadow-glow">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-3">
            <QrCode className="h-full w-full text-black" strokeWidth={1} />
          </div>
          <p className="mt-4 text-sm font-semibold">Mã QR của bạn</p>
          <p className="mt-1 text-xs text-primary-foreground/70">
            Cho bạn bè quét để kết bạn ngay tại chỗ
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3">
          <Link2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {profile ? `fendee.app/u/${profile.id}` : "fendee.app/u/me"}
          </span>
          <button className="rounded-full p-1.5 hover:bg-secondary" aria-label="Sao chép link">
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="secondary" className="h-12 rounded-2xl">
            <QrCode className="h-4 w-4" /> Quét mã
          </Button>
          <Button variant="secondary" className="h-12 rounded-2xl">
            <Share2 className="h-4 w-4" /> Chia sẻ link
          </Button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            {error}
          </p>
        )}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Gợi ý kết bạn
        </h2>
        <ul className="mt-3 space-y-2">
          {socialGraph.suggestions.map((person) => (
            <li
              key={person.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
            >
              <Ava src={person.avatar} alt={person.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">{person.canHelp[0]}</p>
              </div>
              <Chip tone="accent">{person.match}%</Chip>
              <Button
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label={`Kết bạn với ${person.name}`}
                disabled={busy}
                onClick={() => void socialGraph.sendFriendRequest(person.id)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        <Button size="lg" className="mt-8 w-full rounded-full" asChild>
          <Link to="/home">Vào Fendee</Link>
        </Button>
      </div>
    </RequireAuth>
  );
}
