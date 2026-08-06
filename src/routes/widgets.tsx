import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import {
  WidgetLarge,
  WidgetLock,
  WidgetMedium,
  WidgetSmall,
} from "@/components/fendee/widgets";

export const Route = createFileRoute("/widgets")({
  head: () => ({
    meta: [
      { title: "Widget màn hình chính — Fendee" },
      {
        name: "description",
        content:
          "Widget small, medium, large và lock-screen của Fendee: một tín hiệu quan trọng, bạn bè đang hiện diện và lối tắt Tạo Gather / Mở Trạm.",
      },
      { property: "og:title", content: "Widget Fendee" },
      { property: "og:description", content: "Nội dung ổn định 10–15 phút, không bản đồ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Widgets,
});

function Widgets() {
  return (
    <AppShell>
      <TopBar title="Widget màn hình chính" back="/profile" />

      <p className="text-sm text-muted-foreground">
        Widget là bản thu nhỏ của Fendee: chạm vào thẻ để mở thẳng màn hình tương ứng. Nội dung giữ
        ổn định khoảng 10–15 phút và không bao giờ hiển thị bản đồ.
      </p>

      <section className="mt-5">
        <h2 className="mb-1 text-sm font-semibold">Small · 2×2</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Một tín hiệu quan trọng nhất: Gather trực tiếp, bạn thân đang gần, người phù hợp vừa xuất
          hiện hoặc phiên Public sắp hết hạn ·{" "}
          <code className="text-primary">fendee://gather/g1</code>
        </p>
        <div className="rounded-3xl border border-border/70 bg-surface-2 p-5">
          <div className="mx-auto w-[160px]">
            <WidgetSmall />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Medium · 4×2</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Hai khối Bạn bè / Phù hợp + CTA Tạo Gather và Mở Trạm ·{" "}
          <code className="text-primary">fendee://tram</code>
        </p>
        <div className="rounded-3xl border border-border/70 bg-surface-2 p-5">
          <WidgetMedium />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Large · 4×4</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Ba khối: Trạng thái của tôi, Bạn bè gần đây, Đáng chú ý
        </p>
        <div className="rounded-3xl border border-border/70 bg-surface-2 p-5">
          <WidgetLarge />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Lock screen</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Mặc định chỉ nội dung chung — không tên địa điểm, khoảng cách hay tên người lạ.
        </p>
        <WidgetLock />
      </section>

      <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
        Khi bạn tắt hiện diện, widget chuyển sang trạng thái “Đang tắt vị trí”.
      </p>
    </AppShell>
  );
}
