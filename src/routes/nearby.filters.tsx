import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Chip, TopBar } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nearby/filters")({
  head: () => ({
    meta: [
      { title: "Bộ lọc Nearby — Fendee" },
      {
        name: "description",
        content:
          "Tùy chỉnh bán kính, sở thích chung và loại kết nối bạn muốn thấy trong Nearby của Fendee.",
      },
      { property: "og:title", content: "Bộ lọc Nearby" },
      { property: "og:description", content: "Lọc theo bán kính, sở thích và nhu cầu giúp đỡ." },
    ],
  }),
  component: Filters,
});

const interests = ["Cà phê", "Chạy bộ", "Board game", "Sách", "Code", "Nhiếp ảnh"];

function Filters() {
  const [radius, setRadius] = useState([3]);
  const [picked, setPicked] = useState<string[]>(["Cà phê"]);

  return (
    <AppShell>
      <TopBar
        title="Bộ lọc"
        back="/nearby"
        right={
          <button
            className="flex items-center gap-1 text-xs font-medium text-primary"
            onClick={() => {
              setRadius([3]);
              setPicked([]);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
          </button>
        }
      />

      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-baseline justify-between">
          <Label>Bán kính</Label>
          <span className="text-sm font-semibold text-primary">{radius[0]} km</span>
        </div>
        <Slider value={radius} onValueChange={setRadius} min={1} max={10} step={1} className="mt-4" />
        <p className="mt-3 text-[11px] text-muted-foreground">
          Fendee luôn làm tròn khoảng cách. Người khác chỉ thấy “cách ~{radius[0]}km”, không thấy
          điểm bạn đang đứng.
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <Label>Sở thích chung</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {interests.map((i) => {
            const on = picked.includes(i);
            return (
              <button
                key={i}
                onClick={() =>
                  setPicked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))
                }
              >
                <Chip
                  tone={on ? "accent" : "outline"}
                  className={cn("px-3 py-1.5 text-xs", on && "ring-1 ring-primary")}
                >
                  {i}
                </Chip>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 space-y-1 rounded-3xl border border-border/70 bg-card p-1 shadow-card">
        {[
          ["Chỉ hiện người đang online", "Bỏ qua người đã rời khu vực"],
          ["Có thể giúp điều tôi đang cần", "Ưu tiên người khớp với mục “Cần giúp”"],
          ["Ẩn người tôi đã chặn", "Luôn bật để bảo vệ bạn"],
        ].map(([title, sub], idx) => (
          <div key={title} className="flex items-center justify-between rounded-2xl px-3 py-3">
            <div className="pr-4">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
            </div>
            <Switch defaultChecked={idx !== 0} disabled={idx === 2} />
          </div>
        ))}
      </section>

      <Button size="lg" className="mb-4 mt-6 w-full rounded-full" asChild>
        <Link to="/nearby">Áp dụng bộ lọc</Link>
      </Button>
    </AppShell>
  );
}
