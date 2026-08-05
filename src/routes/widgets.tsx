import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import { WidgetLarge, WidgetMedium, WidgetSmall } from "@/components/fendee/widgets";

export const Route = createFileRoute("/widgets")({
  head: () => ({
    meta: [
      { title: "Widget màn hình chính — Fendee" },
      {
        name: "description",
        content:
          "Widget nhỏ, vừa và lớn của Fendee: xem nhanh Gather của bạn bè và người phù hợp ở gần, deep link thẳng vào app.",
      },
      { property: "og:title", content: "Widget Fendee" },
      { property: "og:description", content: "Ba kích cỡ widget với hành động nhanh." },
    ],
  }),
  component: Widgets,
});

function Widgets() {
  return (
    <AppShell>
      <TopBar title="Widget màn hình chính" back="/profile" />

      <p className="text-sm text-muted-foreground">
        Widget là bản thu nhỏ của Fendee: chạm vào bất kỳ thẻ nào để mở thẳng màn hình tương ứng
        trong app.
      </p>

      <section className="mt-5">
        <h2 className="mb-1 text-sm font-semibold">Small · 2×2</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Một cập nhật ưu tiên · deep link <code className="text-primary">fendee://gather/g1</code>
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
          2–3 thẻ Gather / người phù hợp · deep link <code className="text-primary">fendee://nearby</code>
        </p>
        <div className="rounded-3xl border border-border/70 bg-surface-2 p-5">
          <WidgetMedium />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Large · 4×4</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Danh sách ngắn + CTA nhanh “Tạo Gather” và “Xem Nearby”
        </p>
        <div className="rounded-3xl border border-border/70 bg-surface-2 p-5">
          <WidgetLarge />
        </div>
      </section>

      <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
        Widget không hiển thị toạ độ, chỉ khoảng cách tương đối. Khi bạn tắt chia sẻ vị trí, widget
        chuyển sang trạng thái “Đang tắt vị trí”.
      </p>
    </AppShell>
  );
}
