import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Inbox, X } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, EmptyState, TopBar } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { useSocialGraph } from "@/lib/social-graph";

export const Route = createFileRoute("/friends/requests")({
  head: () => ({
    meta: [
      { title: "Lời mời kết bạn - Fendee" },
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
  const socialGraph = useSocialGraph();
  const pending = socialGraph.incomingRequests;
  const busy = socialGraph.actionState.friendRequest.status === "loading";
  const error = socialGraph.actionState.friendRequest.error;

  return (
    <AppShell>
      <TopBar title="Lời mời kết bạn" subtitle={`${pending.length} đang chờ`} back="/friends" />

      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
          {error}
        </p>
      )}

      {socialGraph.loading && !pending.length ? (
        <div className="rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
          Đang tải lời mời kết bạn...
        </div>
      ) : pending.length ? (
        <ul className="space-y-3">
          {pending.map((request) => (
            <li
              key={request.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <Ava src={request.person.avatar} alt={request.person.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{request.person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{request.person.bio}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Chip tone="outline">{request.mutualCount} bạn chung</Chip>
                    <Chip tone="accent">{request.reason}</Chip>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-full"
                  disabled={busy}
                  onClick={() => void socialGraph.acceptFriendRequest(request.id)}
                >
                  <Check className="h-4 w-4" /> Chấp nhận
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 rounded-full"
                  disabled={busy}
                  onClick={() => void socialGraph.declineFriendRequest(request.id)}
                >
                  <X className="h-4 w-4" /> Từ chối
                </Button>
              </div>
            </li>
          ))}
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
