import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, EmptyState, TopBar } from "@/components/fendee/ui";
import { friendRequests, getPerson } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/friends/requests")({
  head: () => ({
    meta: [
      { title: "Lời mời kết bạn — Fendee" },
      {
        name: "description",
        content: "Xem và phản hồi các lời mời kết bạn đang chờ trên Fendee.",
      },
      { property: "og:title", content: "Lời mời kết bạn" },
      { property: "og:description", content: "Chấp nhận hoặc từ chối lời mời kết bạn." },
    ],
  }),
  component: Requests,
});

function Requests() {
  const [handled, setHandled] = useState<string[]>([]);
  const pending = friendRequests.filter((r) => !handled.includes(r.id));

  return (
    <AppShell>
      <TopBar title="Lời mời kết bạn" subtitle={`${pending.length} đang chờ`} back="/friends" />

      {pending.length ? (
        <ul className="space-y-3">
          {pending.map((r) => {
            const p = getPerson(r.id)!;
            return (
              <li
                key={r.id}
                className="rounded-3xl border border-border/70 bg-card p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <Ava src={p.avatar} alt={p.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.bio}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip tone="outline">{r.mutual} bạn chung</Chip>
                      <Chip tone="accent">{r.reason}</Chip>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-full"
                    onClick={() => setHandled((h) => [...h, r.id])}
                  >
                    <Check className="h-4 w-4" /> Chấp nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 rounded-full"
                    onClick={() => setHandled((h) => [...h, r.id])}
                  >
                    <X className="h-4 w-4" /> Từ chối
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Không còn lời mời nào"
          body="Bạn đã xử lý hết lời mời. Chia sẻ mã QR để kết bạn nhanh khi gặp ngoài đời."
          action={
            <Button className="rounded-full" asChild>
              <Link to="/add-friend">Chia sẻ mã QR</Link>
            </Button>
          }
        />
      )}
      <div className="h-4" />
    </AppShell>
  );
}
