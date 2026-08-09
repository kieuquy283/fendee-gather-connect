const palette = [
  { start: "#F47B6A", end: "#DC5F4E" },
  { start: "#E98A61", end: "#C95D44" },
  { start: "#E6A95C", end: "#CD6C3C" },
  { start: "#D9755D", end: "#B94B49" },
  { start: "#C96D62", end: "#A7474B" },
  { start: "#D98773", end: "#B56250" },
];

function hashSeed(seed: string) {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) % 2147483647;
  }
  return value;
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "F";
  const first = words[0] ?? "";
  const last = words[words.length - 1] ?? first;

  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function makeAvatarDataUri(name: string, seed: string) {
  const color = palette[hashSeed(seed) % palette.length]!;
  const initials = initialsFromName(name);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${name}">
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color.start}" />
          <stop offset="100%" stop-color="${color.end}" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#avatarGradient)" />
      <circle cx="80" cy="80" r="73" fill="rgba(255,255,255,0.08)" />
      <text
        x="50%"
        y="53%"
        dominant-baseline="middle"
        text-anchor="middle"
        fill="#FFF8F2"
        font-family="Sora, Arial, sans-serif"
        font-size="54"
        font-weight="700"
        letter-spacing="1.5"
      >
        ${initials}
      </text>
    </svg>
  `.replace(/\s+/g, " ");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
