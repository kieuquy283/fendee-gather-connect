import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Flag, Lock, MapPin, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePrivacy } from "@/lib/privacy-store";
import type { PrivacySettings } from "@/lib/social.functions";

export const Route = createFileRoute("/settings/privacy")({
  head: () => ({
    meta: [
      { title: "Quyền riêng tư & an toàn - Fendee" },
      {
        name: "description",
        content:
          "Vị trí mặc định tắt, không theo dõi liên tục, chỉ hiển thị khoảng cách tương đối. Bạn kiểm soát mọi thứ.",
      },
      { property: "og:title", content: "Quyền riêng tư trên Fendee" },
      {
        property: "og:description",
        content: "Ưu tiên quyền riêng tư: bạn quyết định ai thấy gì.",
      },
    ],
  }),
  component: Privacy,
});

type PrivacySettingKey = keyof Pick<
  PrivacySettings,
  | "shareLocation"
  | "showInNearby"
  | "relativeDistanceOnly"
  | "allowStrangerNotes"
  | "showOnlineStatus"
  | "allowInterestMatching"
  | "friendsOnlyMessaging"
  | "friendsOnlyGatherInvites"
>;

type Row = { key: PrivacySettingKey; label: string; sub: string };

const groups: { title: string; icon: typeof MapPin; rows: Row[] }[] = [
  {
    title: "Vị trí",
    icon: MapPin,
    rows: [
      {
        key: "shareLocation",
        label: "Chia sẻ vị trí",
        sub: "Mặc định tắt. Chỉ bật khi bạn muốn được tìm thấy.",
      },
      {
        key: "showInNearby",
        label: "Xuất hiện trong Nearby",
        sub: "Phải bật chủ động. Tự tắt sau 2 giờ.",
      },
      {
        key: "relativeDistanceOnly",
        label: "Chỉ hiển thị khoảng cách tương đối",
        sub: "Luôn ưu tiên ẩn tọa độ chính xác với người khác.",
      },
    ],
  },
  {
    title: "Hiển thị",
    icon: Eye,
    rows: [
      {
        key: "allowStrangerNotes",
        label: "Cho người lạ xem Note",
        sub: "Có thể giúp / Đang cần giúp",
      },
      {
        key: "showOnlineStatus",
        label: "Hiện trạng thái đang hoạt động",
        sub: "Bạn bè thấy chấm xanh",
      },
      {
        key: "allowInterestMatching",
        label: "Cho phép gợi ý theo sở thích",
        sub: "Dùng để tính độ phù hợp",
      },
    ],
  },
  {
    title: "Liên hệ",
    icon: Users,
    rows: [
      {
        key: "friendsOnlyMessaging",
        label: "Chỉ bạn bè được nhắn tin",
        sub: "Người lạ phải gửi lời mời trước",
      },
      {
        key: "friendsOnlyGatherInvites",
        label: "Chỉ bạn bè được mời tôi vào Gather",
        sub: "Hạn chế lời mời rác",
      },
    ],
  },
];

function Privacy() {
  const privacy = usePrivacy();
  const settings = privacy.settings;
  const saving = privacy.actionState.settings.status === "loading";
  const error = privacy.actionState.settings.error ?? privacy.actionState.block.error;

  return (
    <AppShell>
      <TopBar title="Quyền riêng tư & an toàn" back="/settings" />

      <div className="rounded-3xl bg-brand-gradient p-4 text-primary-foreground shadow-glow">
        <ShieldCheck className="h-6 w-6" />
        <p className="mt-2 text-sm font-semibold">Fendee không theo dõi vị trí liên tục</p>
        <p className="mt-1 text-xs text-primary-foreground/75">
          Vị trí chỉ được cập nhật một lần khi bạn chủ động chia sẻ trạng thái hoặc tạo Gather.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
          {error}
        </p>
      )}

      {!settings ? (
        <div className="mt-5 rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
          {privacy.actionState.settings.status === "loading"
            ? "Đang tải quyền riêng tư..."
            : "Không thể tải quyền riêng tư lúc này."}
        </div>
      ) : (
        groups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.title} className="mt-5">
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" /> {group.title}
              </h2>
              <div className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card">
                {group.rows.map((row) => (
                  <div key={row.key} className="flex items-center gap-3 p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{row.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{row.sub}</p>
                    </div>
                    <Switch
                      checked={settings[row.key]}
                      disabled={saving}
                      onCheckedChange={(value) =>
                        void privacy.updateSettings({
                          [row.key]: value,
                        })
                      }
                      aria-label={row.label}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

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
