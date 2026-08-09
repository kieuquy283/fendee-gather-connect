import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { ApiError } from "@/lib/api-errors";
import { getProfileByIdFn, type ViewableProfile } from "@/lib/social.functions";
import { usePrivacy } from "@/lib/privacy-store";
import { useSocialGraph } from "@/lib/social-graph";

export const Route = createFileRoute("/profile/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} - Hồ sơ trên Fendee` }, { name: "robots", content: "noindex" }],
  }),
  component: OtherProfile,
});

function OtherProfile() {
  const { id } = Route.useParams();
  const privacy = usePrivacy();
  const socialGraph = useSocialGraph();
  const [profile, setProfile] = useState<ViewableProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden" | "not_found" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    setProfile(null);

    void getProfileByIdFn({ data: { targetUserId: id } })
      .then((next) => {
        if (cancelled) return;
        setProfile(next);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === "FORBIDDEN") {
            setStatus("forbidden");
            setError(err.message);
            return;
          }
          if (err.code === "NOT_FOUND") {
            setStatus("not_found");
            setError(err.message);
            return;
          }
        }
        setStatus("error");
        setError(err instanceof Error ? err.message : "Không thể tải hồ sơ này.");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const blocked = privacy.isBlocked(id);
  const blockBusy = privacy.actionState.block.status === "loading";
  const reportBusy = privacy.actionState.report.status === "loading";

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
                aria-label="Tùy chọn"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[340px] rounded-3xl">
              <DialogHeader>
                <DialogTitle>Tùy chọn an toàn</DialogTitle>
                <DialogDescription>
                  Chặn sẽ ẩn bạn khỏi hồ sơ, Nearby và các tương tác xã hội của người này.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  variant="destructive"
                  className="w-full rounded-full"
                  disabled={blockBusy || reportBusy}
                  onClick={() => void privacy.blockUser(id).catch(() => undefined)}
                >
                  <ShieldAlert className="h-4 w-4" /> Chặn người này
                </Button>
                <Button
                  variant="secondary"
                  className="w-full rounded-full"
                  disabled={blockBusy || reportBusy}
                  onClick={() =>
                    void privacy.reportUser(id, "profile_safety_report").catch(() => undefined)
                  }
                >
                  <Flag className="h-4 w-4" /> Báo cáo hành vi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {blocked ? (
        <div
          data-testid="blocked-profile"
          className="rounded-3xl border border-border bg-surface-2 p-6 text-center"
        >
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Bạn đã chặn người này</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Người này không còn thấy hồ sơ, trạng thái hay Gather của bạn nữa.
          </p>
          <Button
            variant="secondary"
            className="mt-5 rounded-full"
            disabled={blockBusy}
            onClick={() => void privacy.unblockUser(id).catch(() => undefined)}
          >
            Bỏ chặn
          </Button>
        </div>
      ) : status === "loading" ? (
        <div className="rounded-3xl border border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">
          Đang tải hồ sơ...
        </div>
      ) : status === "forbidden" ? (
        <div
          data-testid="profile-access-denied"
          className="rounded-3xl border border-border bg-surface-2 p-6 text-center"
        >
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Không thể xem hồ sơ này</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "Bạn không thể xem hồ sơ này hoặc tương tác này đã bị chặn."}
          </p>
        </div>
      ) : status === "not_found" ? (
        <div className="rounded-3xl border border-border bg-surface-2 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Không tìm thấy hồ sơ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hồ sơ này không còn tồn tại hoặc đã bị thu hồi quyền truy cập.
          </p>
        </div>
      ) : status === "error" || !profile ? (
        <div className="rounded-3xl border border-border bg-surface-2 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Không thể tải hồ sơ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "Kiểm tra kết nối rồi thử lại."}
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-3xl bg-brand-gradient p-5 text-center text-primary-foreground shadow-glow">
            <Ava src={profile.avatar} alt={profile.name} size={84} online={profile.online} />
            <h1 className="mt-3 text-xl font-bold">
              {profile.name} <span className="text-base font-normal">· {profile.age}t</span>
            </h1>
            <p className="text-xs text-primary-foreground/70">{profile.bio}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary-foreground/70">
              <MapPin className="h-3 w-3" /> {profile.distance} · {profile.place}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                size="sm"
                className="rounded-full"
                disabled={socialGraph.actionState.friendRequest.status === "loading"}
                onClick={() =>
                  !profile.isFriend ? void socialGraph.sendFriendRequest(profile.id) : undefined
                }
              >
                {profile.isFriend ? (
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
            <Chip tone="accent">{profile.match}% · dựa trên sở thích & nhu cầu</Chip>
          </div>

          <section className="mt-4">
            <h2 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sở thích
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Chip key={interest}>{interest}</Chip>
              ))}
            </div>
          </section>

          <section className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <HandHeart className="h-4 w-4 text-primary" /> Có thể giúp
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {profile.canHelp.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <HelpCircle className="h-4 w-4 text-primary" /> Đang cần giúp
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {profile.needHelp.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </section>

          <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
            Fendee không hiển thị tọa độ chính xác. Khoảng cách luôn được làm tròn.
          </p>
        </>
      )}
      <div className="h-2" />
    </AppShell>
  );
}
