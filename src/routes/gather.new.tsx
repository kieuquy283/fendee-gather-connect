import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Clock, Lock, MapPin, Users, Globe2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { Ava, Chip, TopBar } from "@/components/fendee/ui";
import { people } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gather/new")({
  head: () => ({
    meta: [
      { title: "Tạo Gather trong 15 giây — Fendee" },
      {
        name: "description",
        content:
          "Chọn người nhận, chọn thời lượng và gửi lời mời gặp mặt. Gather tự hết hạn, không lưu vị trí sau khi kết thúc.",
      },
      { property: "og:title", content: "Tạo Gather — Fendee" },
      { property: "og:description", content: "Rủ bạn gặp mặt chỉ trong ba bước." },
    ],
  }),
  component: NewGather,
});

const durations = ["30 phút", "1 giờ", "2 giờ", "3 giờ"];

function NewGather() {
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState<"friends" | "public" | "selected">("friends");
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState("1 giờ");
  const [title, setTitle] = useState("Cà phê làm việc chung");
  const [note, setNote] = useState("Mình ngồi tầng 2, ai rảnh qua ngồi cho vui.");

  const friends = people.filter((p) => p.isFriend);
  const steps = ["Nội dung", "Người nhận", "Thời lượng", "Xem trước"];

  return (
    <AppShell>
      <TopBar title="Tạo Gather" subtitle={`Bước ${step + 1}/4 · ${steps[step]}`} back="/gather" />

      <div className="mb-5 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t">Bạn muốn rủ làm gì?</Label>
            <Input
              id="t"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Cà phê", "Đi bộ", "Ăn trưa", "Học chung", "Board game"].map((q) => (
              <button key={q} onClick={() => setTitle(q)}>
                <Chip tone="outline" className="px-3 py-1.5 text-xs">
                  {q}
                </Chip>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n">Ghi chú ngắn</Label>
            <Textarea
              id="n"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">The Coffee House Nguyễn Du</p>
              <p className="text-[11px] text-muted-foreground">
                Địa điểm chỉ hiện với người bạn mời
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          {(
            [
              ["friends", "Tất cả bạn bè", "142 người bạn sẽ thấy lời mời", Users],
              ["selected", "Chọn từng người", "Chỉ những người bạn tick", Lock],
              ["public", "Công khai quanh đây", "Người đang Public trong 3km", Globe2],
            ] as const
          ).map(([key, title2, sub, Icon]) => (
            <button
              key={key}
              onClick={() => setAudience(key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                audience === key ? "border-primary bg-accent/40" : "border-border bg-card",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{title2}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
              {audience === key && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}

          {audience === "selected" && (
            <ul className="space-y-2 pt-1">
              {friends.map((p) => {
                const on = selected.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() =>
                        setSelected((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border p-3 text-left",
                        on ? "border-primary bg-accent/40" : "border-border bg-card",
                      )}
                    >
                      <Ava src={p.avatar} alt={p.name} size={40} online={p.online} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{p.distance}</p>
                      </div>
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {audience === "public" && (
            <p className="rounded-2xl bg-accent/40 p-3 text-[11px] text-muted-foreground">
              Chế độ công khai chỉ hiển thị tên, ảnh và khoảng cách tương đối của bạn. Địa điểm chi
              tiết chỉ mở khi bạn duyệt người tham gia.
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <Label>Gather kéo dài bao lâu?</Label>
          <div className="grid grid-cols-2 gap-3">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "rounded-2xl border p-4 text-center",
                  duration === d ? "border-primary bg-accent/40" : "border-border bg-card",
                )}
              >
                <Clock className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{d}</p>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium">Tự động hết hạn</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sau {duration}, lời mời biến mất khỏi feed và vị trí kèm theo bị xoá. Không ai xem lại
              được lịch sử.
            </p>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <article className="rounded-3xl border border-border/70 bg-card p-4 shadow-card">
            <Chip tone="accent">Xem trước</Chip>
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{note}</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> The Coffee House Nguyễn Du
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" /> {duration} · hết hạn tự động
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                {audience === "friends"
                  ? "Tất cả bạn bè"
                  : audience === "public"
                    ? "Công khai trong 3km"
                    : `${selected.length} người được chọn`}
              </p>
            </div>
          </article>
          <p className="text-center text-[11px] text-muted-foreground">
            Bạn có thể huỷ Gather bất cứ lúc nào — người nhận sẽ được báo ngay.
          </p>
        </section>
      )}

      <div className="mb-4 mt-8 flex gap-3">
        {step > 0 && (
          <Button
            variant="secondary"
            size="lg"
            className="flex-1 rounded-full"
            onClick={() => setStep(step - 1)}
          >
            Quay lại
          </Button>
        )}
        {step < 3 ? (
          <Button size="lg" className="flex-1 rounded-full" onClick={() => setStep(step + 1)}>
            Tiếp tục
          </Button>
        ) : (
          <Button size="lg" className="flex-1 rounded-full" asChild>
            <Link to="/gather/$id" params={{ id: "g1" }}>
              Gửi Gather
            </Link>
          </Button>
        )}
      </div>
    </AppShell>
  );
}
