import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flag,
  HandHeart,
  HelpCircle,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { getPerson } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/profile/$id")({
  loader: ({ params }) => {
    const person = getPerson(params.id);
    if (!person) throw notFound();
    return { person };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Không tìm thấy hồ sơ — Fendee" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.person;
    return {
      meta: [
        { title: `${p.name} — Hồ sơ trên Fendee` },
        { name: "description", content: `${p.bio}. Có thể giúp: ${p.canHelp.join(", ")}.` },
        { property: "og:title", content: `${p.name} trên Fendee` },
        { property: "og:description", content: p.bio },
      ],
    };
  },
  component: OtherProfile,
});

function OtherProfile() {
  const { person } = Route.useLoaderData();
  const [blocked, setBlocked] = useState(false);

  return (
    <AppShell>
      <TopBar
        title="Hồ sơ"
        back="/nearby"
        right={
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
                aria-label="Tuỳ chọn"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[340px] rounded-3xl">
              <DialogHeader>
                <DialogTitle>Tuỳ chọn an toàn</DialogTitle>
                <DialogDescription>
                  Chặn sẽ ẩn bạn khỏi {person.name} ở mọi nơi, kể cả Nearby và Gather.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  variant="destructive"
                  className="w-full rounded-full"
                  onClick={() => setBlocked(true)}
                >
                  <ShieldAlert className="h-4 w-4" /> Chặn {person.name}
                </Button>
                <Button variant="secondary" className="w-full rounded-full">
                  <Flag className="h-4 w-4" /> Báo cáo hành vi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {blocked ? (
        <div className="rounded-3xl border border-border bg-surface-2 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Bạn đã chặn {person.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Người này không thấy hồ sơ, trạng thái hay Gather của bạn nữa.
          </p>
          <Button
            variant="secondary"
            className="mt-5 rounded-full"
            onClick={() => setBlocked(false)}
          >
            Bỏ chặn
          </Button>
        </div>
      ) : (
        <>
          <section className="rounded-3xl bg-brand-gradient p-5 text-center text-primary-foreground shadow-glow">
            <Ava src={person.avatar} alt={person.name} size={84} online={person.online} />
            <h1 className="mt-3 text-xl font-bold">
              {person.name} <span className="text-base font-normal">· {person.age}t</span>
            </h1>
            <p className="text-xs text-primary-foreground/70">{person.bio}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary-foreground/70">
              <MapPin className="h-3 w-3" /> {person.distance} · {person.place}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" className="rounded-full">
                {person.isFriend ? (
                  "Rủ gặp"
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" /> Kết bạn
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/25"
                asChild
              >
                <Link to="/chat/$id" params={{ id: "c1" }}>
                  <MessageCircle className="h-3.5 w-3.5" /> Nhắn tin
                </Link>
              </Button>
            </div>
          </section>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3">
            <p className="text-sm font-medium">Độ phù hợp</p>
            <Chip tone="accent">{person.match}% · dựa trên sở thích & nhu cầu</Chip>
          </div>

          <section className="mt-4">
            <h2 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sở thích
            </h2>
            <div className="flex flex-wrap gap-2">
              {person.interests.map((i: string) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </div>
          </section>

          <section className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <HandHeart className="h-4 w-4 text-primary" /> Có thể giúp
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {person.canHelp.map((c: string) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <HelpCircle className="h-4 w-4 text-primary" /> Đang cần giúp
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {person.needHelp.map((c: string) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </section>

          <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
            Fendee không hiển thị toạ độ chính xác. Khoảng cách luôn được làm tròn.
          </p>
        </>
      )}
      <div className="h-2" />
    </AppShell>
  );
}
