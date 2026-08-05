import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Phone } from "lucide-react";
import logo from "@/assets/fendee-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập Fendee — Tài khoản của bạn" },
      {
        name: "description",
        content: "Đăng nhập hoặc tạo tài khoản Fendee để chia sẻ trạng thái và tạo Gather.",
      },
      { property: "og:title", content: "Đăng nhập Fendee" },
      { property: "og:description", content: "Tạo tài khoản Fendee chỉ trong vài giây." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("signup");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-6 py-12">
      <img src={logo.url} alt="Fendee" className="h-16 w-16 rounded-2xl" />
      <h1 className="mt-6 text-3xl font-bold">
        {mode === "signup" ? "Tạo tài khoản" : "Chào mừng trở lại"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Chỉ mất 30 giây. Bạn có thể ẩn mọi thứ sau đó."
          : "Đăng nhập để xem bạn bè đang ở đâu."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full py-2 text-sm font-medium transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {m === "signup" ? "Đăng ký" : "Đăng nhập"}
          </button>
        ))}
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="phone">Số điện thoại</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="phone" placeholder="09xx xxx xxx" className="h-12 rounded-2xl pl-10" />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="ban@email.com"
              className="h-12 rounded-2xl pl-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-12 rounded-2xl pl-10"
            />
          </div>
        </div>

        <Button size="lg" className="w-full rounded-full" asChild>
          <Link to={mode === "signup" ? "/setup-profile" : "/home"}>
            {mode === "signup" ? "Tiếp tục" : "Đăng nhập"}
          </Link>
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> hoặc <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        <Button variant="secondary" size="lg" className="w-full rounded-full" asChild>
          <Link to="/setup-profile">Tiếp tục với Google</Link>
        </Button>
        <Button variant="secondary" size="lg" className="w-full rounded-full" asChild>
          <Link to="/setup-profile">Tiếp tục với Apple</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
        Fendee không cho phép tài khoản vô danh hoàn toàn. Mọi hồ sơ đều có tên và ảnh để cộng đồng
        an toàn hơn.
      </p>
    </div>
  );
}
