import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/fendee/AppShell";
import { TopBar } from "@/components/fendee/ui";
import { WidgetLarge, WidgetMiniInterface } from "@/components/fendee/widgets";

export const Route = createFileRoute("/widgets")({
  head: () => ({
    meta: [
      { title: "Widget màn hình chính — Fendee" },
      {
        name: "description",
        content:
          "Widget Fendee là giao diện thu nhỏ để xem Trạm hiện tại, bạn bè đang hiện diện, người đáng chú ý và Gather đang mở.",
      },
      { property: "og:title", content: "Widget Fendee" },
      { property: "og:description", content: "Bản thu nhỏ của Fendee: không bản đồ, không tọa độ." },
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

      <WidgetMiniInterface />

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Bản xem nhanh 4x4</h2>
        <div className="rounded-3xl border border-border/70 bg-surface-2 p-4">
          <WidgetLarge />
        </div>
      </section>

      <p className="mb-4 mt-6 text-center text-[11px] text-muted-foreground">
        Widget chỉ dùng khoảng cách tương đối và không hiển thị bản đồ hoặc tọa độ.
      </p>
    </AppShell>
  );
}
