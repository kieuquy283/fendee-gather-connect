import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { GatherCard } from "@/components/fendee/cards";
import { EmptyState, TopBar } from "@/components/fendee/ui";
import { useGatherStore } from "@/lib/gather-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gather/")({
  head: () => ({
    meta: [
      { title: "Gather - Lời mời gặp mặt của bạn | Fendee" },
      {
        name: "description",
        content: "Quản lý Gather bạn tạo, cùng tạo và được mời. Mỗi lời mời có RSVP và tự hết hạn.",
      },
      { property: "og:title", content: "Gather trên Fendee" },
      { property: "og:description", content: "Rủ bạn bè gặp nhau, lời mời tự hết hạn." },
    ],
  }),
  component: GatherList,
});

function GatherList() {
  const store = useGatherStore();
  const [tab, setTab] = useState<"live" | "mine" | "expired">("live");
  const list = store.gathers.filter((gather) => {
    const isMine =
      gather.ownerId === store.currentUserId ||
      gather.hosts.some(
        (host) => host.personId === store.currentUserId && host.cohostStatus !== "declined",
      );

    if (tab === "expired") return gather.status !== "live";
    if (tab === "mine") return isMine && gather.status === "live";
    return gather.status === "live";
  });

  return (
    <AppShell>
      <TopBar
        title="Gather"
        subtitle="Lời mời gặp mặt trong ngày"
        right={
          <Link
            to="/gather/new"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Tạo Gather"
          >
            <Plus className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
        {(
          [
            ["live", "Đang mở"],
            ["mine", "Của tôi"],
            ["expired", "Đã hết hạn"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            data-testid={`gather-tab-${key}`}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full py-2 text-[13px] font-medium transition-colors",
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.length ? (
          list.map((gather) => <GatherCard key={gather.id} gather={gather} />)
        ) : (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title={tab === "mine" ? "Bạn chưa quản lý Gather nào" : "Chưa có Gather phù hợp"}
            body="Tạo Gather, chọn co-host riêng với người được mời, rồi gửi lời mời có thời hạn."
            action={
              <Button className="rounded-full" asChild>
                <Link to="/gather/new">Tạo Gather đầu tiên</Link>
              </Button>
            }
          />
        )}
      </div>

      {tab === "expired" && list.length > 0 && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Gather hết hạn không còn nhận RSVP mới và chỉ giữ thông tin lịch sử được phép.
        </p>
      )}
      <div className="h-4" />
    </AppShell>
  );
}
