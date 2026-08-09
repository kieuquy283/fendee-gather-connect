import { createMiddleware } from "@tanstack/react-start";
import { readSessionIdFromCookieHeader, resolveAuthContextFromSessionId } from "./server-auth-core";

export const authRequestMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const resolved = resolveAuthContextFromSessionId(
      readSessionIdFromCookieHeader(request.headers.get("cookie")),
    );

    return next({
      context: {
        auth: resolved.auth,
      },
    });
  },
);
