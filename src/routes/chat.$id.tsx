import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Flag, MapPin, Plus, Send, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { conversations, getPerson, messages } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({
  loader: ({ params }) => {
    const convo = conversations.find((c) => c.id === params.id);
    if (!convo) throw notFound();
    return { convo, thread: messages[params.id] ?? [] };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Cuộc trò chuyện không tồn tại — Fendee" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = getPerson(loaderData.convo.personId)?.name ?? "Bạn bè";
    return {
      meta: [
        { title: `Trò chuyện với ${name} — Fendee` },
        { name: "description", content: `Nhắn tin với ${name} để chốt chỗ gặp mặt trên Fendee.` },
        { property: "og:title", content: `Trò chuyện với ${name}` },
        { property: "og:description", content: "Nhắn tin nhanh trên Fendee." },
      ],
    };
  },
  component: ChatRoom,
});

function ChatRoom() {
  const { convo, thread } = Route.useLoaderData();
  const p = getPerson(convo.personId)!;

  return (
    <AppShell nav={false}>
      <TopBar
        title={p.name}
        subtitle={p.online ? "Đang hoạt động" : "Hoạt động 2 giờ trước"}
        back="/chat"
        right={
          <Link
            to="/profile/$id"
            params={{ id: p.id }}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Xem hồ sơ"
          >
            <Ava src={p.avatar} alt={p.name} size={34} />
          </Link>
        }
      />

      <div className="flex flex-col gap-3 pb-28">
        <div className="mx-auto">
          <Chip tone="outline">Hôm nay</Chip>
        </div>

        <Link
          to="/gather/$id"
          params={{ id: "g1" }}
          className="rounded-2xl border border-primary/30 bg-accent/40 p-3"
        >
          <p className="text-xs font-semibold">Gather: Cà phê làm việc chung</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" /> The Coffee House · còn 1 giờ 20 phút
          </p>
        </Link>

        {thread.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[78%] rounded-3xl px-4 py-2.5 text-sm",
              m.from === "me"
                ? "self-end rounded-br-lg bg-primary text-primary-foreground"
                : "self-start rounded-bl-lg bg-secondary text-secondary-foreground",
            )}
          >
            {m.text}
            <span
              className={cn(
                "mt-1 block text-[10px]",
                m.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {m.time}
            </span>
          </div>
        ))}

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <button className="inline-flex items-center gap-1 hover:text-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> Chặn
          </button>
          <span className="h-3 w-px bg-border" />
          <button className="inline-flex items-center gap-1 hover:text-foreground">
            <Flag className="h-3.5 w-3.5" /> Báo cáo
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border/70 bg-background/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="secondary" className="h-11 w-11 shrink-0 rounded-full" asChild>
            <Link to="/gather/new" aria-label="Tạo Gather">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Input placeholder="Nhắn gì đó..." className="h-11 flex-1 rounded-full" />
          <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" aria-label="Gửi">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
