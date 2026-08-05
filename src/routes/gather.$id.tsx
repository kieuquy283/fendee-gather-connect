import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle, Share2, Users, X } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { getGather, getPerson } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gather/$id")({
  loader: ({ params }) => {
    const gather = getGather(params.id);
    if (!gather) throw notFound();
    return { gather };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Gather không tồn tại — Fendee" }, { name: "robots", content: "noindex" }],
      };
    }
    const t = `${loaderData.gather.title} — Gather trên Fendee`;
    return {
      meta: [
        { title: t },
        { name: "description", content: loaderData.gather.note },
        { property: "og:title", content: t },
        { property: "og:description", content: loaderData.gather.note },
      ],
    };
  },
  component: GatherDetail,
});

function GatherDetail() {
  const { gather } = Route.useLoaderData();
  const host = getPerson(gather.hostId)!;
  const expired = gather.status === "expired";

  return (
    <AppShell>
      <TopBar
        title="Chi tiết Gather"
        back="/gather"
        right={
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Chia sẻ"
          >
            <Share2 className="h-4 w-4" />
          </button>
        }
      />

      <section className="overflow-hidden rounded-3xl bg-brand-gradient p-5 text-primary-foreground shadow-glow">
        <Chip tone="accent" className="bg-white/15 text-primary-foreground">
          {expired ? "Đã hết hạn" : gather.startsIn}
        </Chip>
        <h1 className="mt-3 text-2xl font-bold leading-snug">{gather.title}</h1>
        <p className="mt-2 text-sm text-primary-foreground/75">{gather.note}</p>
        <div className="mt-4 flex items-center gap-3">
          <Ava src={host.avatar} alt={host.name} size={40} />
          <div>
            <p className="text-sm font-semibold">{host.name}</p>
            <p className="text-[11px] text-primary-foreground/70">Người tạo · {gather.distance}</p>
          </div>
        </div>
      </section>

      {expired && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Gather này đã kết thúc</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Vị trí kèm theo đã được xoá. Bạn vẫn nhắn tin được với những người đã tham gia.
            </p>
          </div>
        </div>
      )}

      <section className="mt-4 space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <p className="flex items-center gap-2.5 text-sm">
          <MapPin className="h-4 w-4 text-primary" /> {gather.place}
        </p>
        <p className="flex items-center gap-2.5 text-sm">
          <Clock className="h-4 w-4 text-primary" /> {gather.duration} · {gather.expiresAt}
        </p>
        <p className="flex items-center gap-2.5 text-sm">
          <Users className="h-4 w-4 text-primary" />
          {gather.audience === "friends"
            ? "Bạn bè"
            : gather.audience === "public"
              ? "Công khai quanh đây"
              : "Chỉ người được mời"}
        </p>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Đã tham gia ({gather.joined.length}/{gather.slots})
        </h2>
        {gather.joined.length ? (
          <ul className="space-y-2">
            {gather.joined.map((id) => {
              const p = getPerson(id)!;
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
                >
                  <Ava src={p.avatar} alt={p.name} size={40} online={p.online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.distance}</p>
                  </div>
                  <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full" asChild>
                    <Link to="/chat/$id" params={{ id: "c1" }} aria-label="Nhắn tin">
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Chưa ai tham gia. Là người đầu tiên đi!
          </p>
        )}
      </section>

      {!expired && (
        <div className="mb-4 mt-6 flex gap-3">
          <Button size="lg" className="flex-1 rounded-full">
            Tham gia
          </Button>
          <Button size="lg" variant="secondary" className="flex-1 rounded-full" asChild>
            <Link to="/chat/$id" params={{ id: "c1" }}>
              Nhắn cho {host.name}
            </Link>
          </Button>
        </div>
      )}
      <div className="h-2" />
    </AppShell>
  );
}
