import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail, Phone } from "lucide-react";
import logo from "@/assets/fendee-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập Fendee - Tài khoản của bạn" },
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
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("ban@email.com");
  const [password, setPassword] = useState("password123");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signingIn = auth.signInState.status === "loading";

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email và mật khẩu là bắt buộc.");
      return;
    }
    try {
      await auth.signIn({ email, password });
      navigate({ to: mode === "signup" ? "/setup-profile" : "/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-6 py-12">
      <img src={logo.url} alt="Fendee" className="h-16 w-16 rounded-2xl" />
      <h1 className="mt-6 text-3xl font-bold">
        {mode === "signup" ? "Tạo tài khoản" : "Chào mừng trở lại"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Bạn có thể hoàn thiện hồ sơ sau."
          : "Đăng nhập để xem bạn bè đang ở đâu."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={signingIn}
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
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="phone">Số điện thoại</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09xx xxx xxx"
                className="h-12 rounded-2xl pl-10"
              />
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="password"
              className="h-12 rounded-2xl pl-10"
            />
          </div>
        </div>

        {(error || auth.signInState.error) && (
          <p role="alert" className="rounded-2xl bg-warn/10 p-3 text-xs text-warn-foreground">
            {error ?? auth.signInState.error}
          </p>
        )}

        <Button size="lg" className="w-full rounded-full" type="submit" disabled={signingIn}>
          {signingIn ? "Đang xử lý..." : mode === "signup" ? "Tiếp tục" : "Đăng nhập"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> hoac <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        <Button
          variant="secondary"
          size="lg"
          type="button"
          className="w-full rounded-full"
          disabled={signingIn}
          onClick={() =>
            void auth
              .signIn({ email: "google-dev@fendee.local", password: "dev" })
              .then(() => navigate({ to: "/setup-profile" }))
              .catch((err) => setError(err instanceof Error ? err.message : "Đăng nhập thất bại."))
          }
        >
          Tiếp tục với Google
        </Button>
        <Button
          variant="secondary"
          size="lg"
          type="button"
          className="w-full rounded-full"
          disabled={signingIn}
          onClick={() =>
            void auth
              .signIn({ email: "apple-dev@fendee.local", password: "dev" })
              .then(() => navigate({ to: "/setup-profile" }))
              .catch((err) => setError(err instanceof Error ? err.message : "Đăng nhập thất bại."))
          }
        >
          Tiếp tục với Apple
        </Button>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
        Fendee không cho phép tài khoản vô danh hoàn toàn. Mỗi hồ sơ đều có tên và ảnh để cộng đồng
        an toàn hơn.
      </p>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Chế độ đăng nhập hiện tại chỉ là phiên cục bộ cho môi trường frontend trước khi tích hợp nhà
        cung cấp danh tính thật.
      </p>
    </div>
  );
}
