import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(".output", "public");
const forbiddenPatterns = [
  { label: "@tanstack/start-server-core", regex: /@tanstack\/start-server-core/g },
  { label: "node:async_hooks", regex: /node:async_hooks/g },
  { label: "AsyncLocalStorage", regex: /AsyncLocalStorage/g },
  { label: "server-auth.server", regex: /server-auth\.server/g },
  { label: "social-repositories.server", regex: /social-repositories\.server/g },
  { label: "social-store.server", regex: /social-store\.server/g },
  { label: "social-api.server", regex: /social-api\.server/g },
  { label: "presence-repositories.server", regex: /presence-repositories\.server/g },
  { label: "presence-store.server", regex: /presence-store\.server/g },
  { label: "presence-api.server", regex: /presence-api\.server/g },
  { label: "gather-repositories.server", regex: /gather-repositories\.server/g },
  { label: "gather-store.server", regex: /gather-store\.server/g },
  { label: "gather-api.server", regex: /gather-api\.server/g },
  { label: "chat-repositories.server", regex: /chat-repositories\.server/g },
  { label: "chat-store.server", regex: /chat-store\.server/g },
  { label: "chat-api.server", regex: /chat-api\.server/g },
];

function collectJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

if (!statSync(rootDir).isDirectory()) {
  throw new Error(`Client build directory not found: ${rootDir}`);
}

const jsFiles = collectJsFiles(rootDir);
const violations = [];

for (const filePath of jsFiles) {
  const content = readFileSync(filePath, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(content)) {
      violations.push({
        filePath,
        label: pattern.label,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Client boundary check failed.");
  for (const violation of violations) {
    console.error(`- ${violation.label} in ${path.relative(process.cwd(), violation.filePath)}`);
  }
  process.exit(1);
}

console.log(`Client boundary check passed for ${jsFiles.length} client assets.`);
