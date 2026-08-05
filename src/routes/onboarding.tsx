import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPinOff, Users, HandHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Giới thiệu Fendee — Cách Fendee hoạt động" },
      {
        name: "description",
        content:
          "Ba bước để hiểu Fendee: chia sẻ trạng thái ngắn, tạo Gather rủ bạn gặp, và kiểm soát quyền riêng tư vị trí của bạn.",
      },
      { property: "og:title", content: "Giới thiệu Fendee" },
      { property: "og:description", content: "Cách Fendee giúp bạn gặp bạn bè ngoài đời." },
    ],
  }),
  component: Onboarding,
});

const slides = [
  {
    icon: HandHeart,
    title: "Nói bạn đang làm gì",
    body: "Một dòng trạng thái ngắn, kèm “Tôi có thể giúp gì” và “Tôi đang cần giúp gì”. Bạn bè hiểu ngay nên rủ bạn việc gì.",
  },
  {
    icon: Users,
    title: "Tạo Gather trong 15 giây",
    body: "Chọn người nhận, chọn thời lượng, gửi. Lời mời tự hết hạn khi hết giờ — không để lại dấu vết.",
  },
  {
    icon: MapPinOff,
    title: "Vị trí luôn tắt mặc định",
    body: "Người lạ chỉ thấy khoảng cách tương đối, không bao giờ thấy toạ độ. Bạn bật Public/Nearby khi muốn, tắt bất cứ lúc nào.",
  },
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const s = slides[step]!;
  const Icon = s.icon;
  const last = step === slides.length - 1;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 py-10">
      <div className="flex justify-end">
        <Link to="/auth" className="text-sm text-muted-foreground">
          Bỏ qua
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-accent-gradient text-primary-foreground shadow-glow">
          <Icon className="h-11 w-11" />
        </div>
        <h1 className="mt-8 text-3xl font-bold">{s.title}</h1>
        <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-muted-foreground">
          {s.body}
        </p>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
            )}
          />
        ))}
      </div>

      <div className="space-y-3">
        {last ? (
          <Button size="lg" className="w-full rounded-full" asChild>
            <Link to="/auth">Tạo tài khoản</Link>
          </Button>
        ) : (
          <Button size="lg" className="w-full rounded-full" onClick={() => setStep(step + 1)}>
            Tiếp tục
          </Button>
        )}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Privacy-first · bạn kiểm soát mọi
          thứ
        </p>
      </div>
    </div>
  );
}
