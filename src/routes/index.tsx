import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/fendee-logo.png.asset.json";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fendee — Rủ bạn gặp nhau trong 15 giây" },
      {
        name: "description",
        content:
          "Fendee giúp bạn chia sẻ trạng thái ngắn kèm vị trí, tạo Gather rủ bạn bè đi cà phê và kết nối với người quanh bạn. Riêng tư mặc định, không theo dõi vị trí liên tục.",
      },
      { property: "og:title", content: "Fendee — Rủ bạn gặp nhau trong 15 giây" },
      {
        property: "og:description",
        content: "Chia sẻ trạng thái, tạo Gather và khám phá người phù hợp quanh bạn.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-brand-gradient px-6 py-16 text-primary-foreground">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
      <div />
      <div className="relative flex flex-col items-center text-center">
        <img
          src={logo.url}
          alt="Logo Fendee"
          className="h-28 w-28 rounded-[28px] shadow-glow"
          width={112}
          height={112}
        />
        <h1 className="mt-7 text-5xl font-bold tracking-tight">Fendee</h1>
        <p className="mt-3 max-w-[26ch] text-sm text-primary-foreground/75">
          Rủ bạn gặp nhau ngoài đời — nhanh, gọn và riêng tư.
        </p>
      </div>
      <div className="relative w-full max-w-[380px] space-y-3">
        <Button size="lg" className="w-full rounded-full" asChild>
          <Link to="/onboarding">Bắt đầu</Link>
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="w-full rounded-full text-primary-foreground hover:bg-white/10"
          asChild
        >
          <Link to="/auth">Tôi đã có tài khoản</Link>
        </Button>
        <p className="pt-2 text-center text-[11px] text-primary-foreground/50">
          Fendee không phải app hẹn hò · Không theo dõi vị trí liên tục
        </p>
      </div>
    </div>
  );
}
