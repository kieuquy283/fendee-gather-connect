import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Check } from "lucide-react";
import { me } from "@/lib/fendee-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/fendee/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup-profile")({
  head: () => ({
    meta: [
      { title: "Thiết lập hồ sơ Fendee" },
      {
        name: "description",
        content:
          "Thêm ảnh, sở thích, điều bạn có thể giúp và điều bạn đang cần giúp để Fendee gợi ý người phù hợp.",
      },
      { property: "og:title", content: "Thiết lập hồ sơ Fendee" },
      { property: "og:description", content: "Hồ sơ càng rõ, gợi ý càng đúng người." },
    ],
  }),
  component: SetupProfile,
});

const allInterests = [
  "Cà phê",
  "Chạy bộ",
  "Board game",
  "Sách",
  "Nhiếp ảnh",
  "Code",
  "Gym",
  "Nhạc indie",
  "Leo núi",
  "Nấu ăn",
  "Phim",
  "Vẽ",
];

function SetupProfile() {
  const [picked, setPicked] = useState<string[]>(["Cà phê", "Code"]);
  const toggle = (i: string) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-8">
      <p className="text-xs font-medium uppercase tracking-widest text-primary">Bước 2 / 3</p>
      <h1 className="mt-2 text-2xl font-bold">Hồ sơ của bạn</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Fendee dùng thông tin này để gợi ý người phù hợp — không dùng để xếp hạng ngoại hình.
      </p>

      <div className="mt-7 flex items-center gap-4">
        <div className="relative">
          <img src={me.avatar} alt="Ảnh đại diện" className="h-20 w-20 rounded-full object-cover" />
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="name">Tên hiển thị</Label>
          <Input id="name" defaultValue={me.name} className="h-11 rounded-2xl" />
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="bio">Giới thiệu ngắn</Label>
        <Input id="bio" defaultValue={me.bio} className="h-11 rounded-2xl" />
      </div>

      <div className="mt-6">
        <Label>Sở thích</Label>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {allInterests.map((i) => {
            const on = picked.includes(i);
            return (
              <button key={i} onClick={() => toggle(i)}>
                <Chip
                  tone={on ? "accent" : "outline"}
                  className={cn("px-3 py-1.5 text-xs", on && "ring-1 ring-primary")}
                >
                  {on && <Check className="h-3 w-3" />}
                  {i}
                </Chip>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="can">Tôi có thể giúp gì</Label>
        <Textarea
          id="can"
          rows={2}
          className="rounded-2xl"
          defaultValue={me.canHelp.join(", ")}
          placeholder="Ví dụ: review CV, chụp ảnh film..."
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="need">Tôi đang cần giúp gì</Label>
        <Textarea
          id="need"
          rows={2}
          className="rounded-2xl"
          defaultValue={me.needHelp.join(", ")}
          placeholder="Ví dụ: bạn tập gym buổi sáng..."
        />
      </div>

      <div className="mt-8 space-y-3">
        <Button size="lg" className="w-full rounded-full" asChild>
          <Link to="/add-friend">Tiếp tục</Link>
        </Button>
        <Button variant="ghost" size="lg" className="w-full rounded-full" asChild>
          <Link to="/home">Để sau</Link>
        </Button>
      </div>
    </div>
  );
}
