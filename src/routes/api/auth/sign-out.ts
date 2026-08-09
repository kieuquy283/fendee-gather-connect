import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/sign-out")({
  component: () => null,
});
