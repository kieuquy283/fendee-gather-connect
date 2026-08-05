import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { GatherCard } from "@/components/fendee/cards";
import { EmptyState, TopBar } from "@/components/fendee/ui";
import { gathers } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gather/")({
  head: () => ({
    meta: [
      { title: "Gather — Lời mời gặp mặt của bạn | Fendee" },
      {
        name: "description",
        content:
          "Quản lý các Gather bạn tạo và được mời. Mỗi lời mời tự hết hạn theo thời lượng bạn chọn.",
      },
      { property: "og:title", content: "Gather trên Fendee" },
      { property: "og:description", content: "Rủ bạn bè gặp nhau, lời mời tự hết hạn." },
    ],
  }),
  component: GatherList,
});

function GatherList() {
  const [tab, setTab] = useState<"live" | "mine" | "expired">("live");
  const list = gathers.filter((g) =>
    tab === "expired" ? g.status === "expired" : tab === "mine" ? false : g.status === "live",
  );

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
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "rounded-full py-2 text-[13px] font-medium transition-colors",
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.length ? (
          list.map((g) => <GatherCard key={g.id} gather={g} />)
        ) : (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title="Bạn chưa tạo Gather nào"
            body="Một Gather chỉ mất 15 giây: chọn người, chọn thời lượng, gửi. Hết giờ là lời mời tự biến mất."
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
          Gather hết hạn sẽ tự xoá vị trí kèm theo sau 24 giờ.
        </p>
      )}
      <div className="h-4" />
    </AppShell>
  );
}
