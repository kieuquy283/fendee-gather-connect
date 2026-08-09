import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";
import { Chip } from "@/components/fendee/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/lib/auth";
import { useSocialGraph } from "@/lib/social-graph";
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
  const navigate = useNavigate();
  const socialGraph = useSocialGraph();
  const profile = socialGraph.currentProfile;
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [canHelp, setCanHelp] = useState("");
  const [needHelp, setNeedHelp] = useState("");
  const [picked, setPicked] = useState<string[]>(["Cà phê", "Code"]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setBio(profile.bio);
    setCanHelp(profile.canHelp.join(", "));
    setNeedHelp(profile.needHelp.join(", "));
    setPicked(profile.interests);
  }, [profile]);

  const toggle = (interest: string) =>
    setPicked((current) =>
      current.includes(interest)
        ? current.filter((value) => value !== interest)
        : [...current, interest],
    );

  const saving = socialGraph.actionState.updateProfile.status === "loading";

  return (
    <RequireAuth>
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-8">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Bước 2 / 3</p>
        <h1 className="mt-2 text-2xl font-bold">Hồ sơ của bạn</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Fendee dùng thông tin này để gợi ý người phù hợp, không dùng để xếp hạng ngoại hình.
        </p>

        {!profile ? (
          <div className="mt-6 rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            {socialGraph.loading
              ? "Đang tải hồ sơ..."
              : (socialGraph.error ?? "Không thể tải hồ sơ.")}
          </div>
        ) : (
          <>
            <div className="mt-7 flex items-center gap-4">
              <div className="relative">
                <img
                  src={profile.avatar}
                  alt="Ảnh đại diện"
                  className="h-20 w-20 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="name">Tên hiển thị</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
            </div>

            <div className="mt-6 space-y-1.5">
              <Label htmlFor="bio">Giới thiệu ngắn</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="mt-6">
              <Label>Sở thích</Label>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {allInterests.map((interest) => {
                  const selected = picked.includes(interest);
                  return (
                    <button key={interest} type="button" onClick={() => toggle(interest)}>
                      <Chip
                        tone={selected ? "accent" : "outline"}
                        className={cn("px-3 py-1.5 text-xs", selected && "ring-1 ring-primary")}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {interest}
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
                value={canHelp}
                onChange={(event) => setCanHelp(event.target.value)}
                placeholder="Ví dụ: review CV, chụp ảnh film..."
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="need">Tôi đang cần giúp gì</Label>
              <Textarea
                id="need"
                rows={2}
                className="rounded-2xl"
                value={needHelp}
                onChange={(event) => setNeedHelp(event.target.value)}
                placeholder="Ví dụ: bạn tập gym buổi sáng..."
              />
            </div>

            <div className="mt-8 space-y-3">
              <Button
                size="lg"
                className="w-full rounded-full"
                disabled={saving}
                onClick={() =>
                  void socialGraph
                    .updateProfile({
                      name,
                      bio,
                      interests: picked,
                      canHelp: canHelp
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                      needHelp: needHelp
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                    .then(() => navigate({ to: "/add-friend" }))
                }
              >
                {saving ? "Đang lưu..." : "Tiếp tục"}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full rounded-full"
                type="button"
                onClick={() => navigate({ to: "/home" })}
              >
                Để sau
              </Button>
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
