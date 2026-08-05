import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Flag, Lock, MapPin, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/privacy")({
  head: () => ({
    meta: [
      { title: "Quyền riêng tư & an toàn — Fendee" },
      {
        name: "description",
        content:
          "Vị trí mặc định tắt, không theo dõi liên tục, chỉ hiển thị khoảng cách tương đối. Bạn kiểm soát mọi thứ.",
      },
      { property: "og:title", content: "Quyền riêng tư trên Fendee" },
      { property: "og:description", content: "Privacy-first: bạn quyết định ai thấy gì." },
    ],
  }),
  component: Privacy,
});

type Row = { key: string; label: string; sub: string; def: boolean };

const groups: { title: string; icon: typeof MapPin; rows: Row[] }[] = [
  {
    title: "Vị trí",
    icon: MapPin,
    rows: [
      {
        key: "loc",
        label: "Chia sẻ vị trí",
        sub: "Mặc định TẮT. Chỉ bật khi bạn muốn được tìm thấy.",
        def: false,
      },
      {
        key: "public",
        label: "Xuất hiện trong Nearby",
        sub: "Phải bật chủ động. Tự tắt sau 2 giờ.",
        def: false,
      },
      {
        key: "rough",
        label: "Chỉ hiển thị khoảng cách tương đối",
        sub: "Luôn bật — người lạ không bao giờ thấy toạ độ chính xác.",
        def: true,
      },
    ],
  },
  {
    title: "Hiển thị",
    icon: Eye,
    rows: [
      { key: "note", label: "Cho người lạ xem Note", sub: "Có thể giúp / Đang cần giúp", def: true },
      { key: "online", label: "Hiện trạng thái đang hoạt động", sub: "Bạn bè thấy chấm xanh", def: true },
      { key: "match", label: "Cho phép gợi ý theo sở thích", sub: "Dùng để tính độ phù hợp", def: true },
    ],
  },
  {
    title: "Liên hệ",
    icon: Users,
    rows: [
      { key: "msg", label: "Chỉ bạn bè được nhắn tin", sub: "Người lạ phải gửi lời mời trước", def: true },
      { key: "gather", label: "Chỉ bạn bè được mời tôi vào Gather", sub: "Hạn chế lời mời rác", def: true },
    ],
  },
];

function Privacy() {
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.flatMap((g) => g.rows.map((r) => [r.key, r.def]))),
  );

  return (
    <AppShell>
      <TopBar title="Quyền riêng tư & an toàn" back="/profile" />

      <div className="rounded-3xl bg-brand-gradient p-4 text-primary-foreground shadow-glow">
        <ShieldCheck className="h-6 w-6" />
        <p className="mt-2 text-sm font-semibold">Fendee không theo dõi vị trí liên tục</p>
        <p className="mt-1 text-xs text-primary-foreground/75">
          Vị trí chỉ được cập nhật một lần khi bạn chủ động chia sẻ trạng thái hoặc tạo Gather.
        </p>
      </div>

      {groups.map((g) => {
        const Icon = g.icon;
        return (
          <section key={g.title} className="mt-5">
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4 text-primary" /> {g.title}
            </h2>
            <div className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card">
              {g.rows.map((r) => (
                <div key={r.key} className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{r.sub}</p>
                  </div>
                  <Switch
                    checked={on[r.key] ?? false}
                    onCheckedChange={(v) => setOn((s) => ({ ...s, [r.key]: v }))}
                    aria-label={r.label}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-5 space-y-2">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-4 w-4 text-primary" /> Không có chế độ ẩn danh
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mọi tương tác trên Fendee đều gắn với hồ sơ thật. “Ẩn khỏi Nearby” chỉ ẩn bạn khỏi danh
            sách khám phá, không biến bạn thành người vô danh.
          </p>
        </div>
        <Button variant="secondary" className="w-full justify-start rounded-2xl py-6" asChild>
          <Link to="/profile">
            <ShieldAlert className="h-4 w-4 text-primary" /> Danh sách đã chặn
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start rounded-2xl py-6" asChild>
          <Link to="/profile">
            <Flag className="h-4 w-4 text-primary" /> Báo cáo & lịch sử xử lý
          </Link>
        </Button>
      </section>
      <div className="h-4" />
    </AppShell>
  );
}
