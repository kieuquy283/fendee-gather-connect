import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/nearby/")({
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
