import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/session")({
  component: () => null,
});
