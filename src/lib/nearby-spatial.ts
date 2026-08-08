import type { Person } from "@/lib/fendee-data";

export const maxNearbyDistanceMeters = 100;

export const nearbyAnchor = { x: 50, y: 68 };
const canvasRadius = { x: 38, y: 45 };

export type NearbyPerson = Person & {
  distanceMeters: number;
};

export type PositionedNearbyPerson = NearbyPerson & {
  x: number;
  y: number;
  scale: number;
};

export function groupPeopleByNearby(users: Person[]) {
  const locationVisibleFriends = users.filter(
    (user) => user.isFriend && user.visibility !== "hidden",
  );

  return {
    nearbyUsers: locationVisibleFriends.filter(
      (user): user is NearbyPerson =>
        user.distanceMeters != null && user.distanceMeters <= maxNearbyDistanceMeters,
    ),
    fartherFriends: users.filter(
      (user) =>
        user.isFriend &&
        (user.visibility === "hidden" ||
          user.distanceMeters == null ||
          user.distanceMeters > maxNearbyDistanceMeters),
    ),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableHash(value: string) {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function stableAngle(user: NearbyPerson, index: number) {
  if (user.relativeAngle != null) return user.relativeAngle;
  const hash = stableHash(user.id);
  return ((hash % 360) + index * 19) * (Math.PI / 180);
}

export function getNearbyCanvasPositions(users: NearbyPerson[]): PositionedNearbyPerson[] {
  const sortedUsers = [...users].sort((a, b) => a.id.localeCompare(b.id));
  const placed: PositionedNearbyPerson[] = [];

  sortedUsers.forEach((user, index) => {
    const normalizedDistance = clamp(user.distanceMeters / maxNearbyDistanceMeters, 0, 1);
    const baseRadius = 0.18 + normalizedDistance * 0.78;
    let angle = stableAngle(user, index);
    let radius = baseRadius;
    let x = nearbyAnchor.x + Math.cos(angle) * canvasRadius.x * radius;
    let y = nearbyAnchor.y + Math.sin(angle) * canvasRadius.y * radius;

    for (let pass = 0; pass < 4; pass += 1) {
      const collides = placed.some((other) => Math.hypot(other.x - x, other.y - y) < 16);
      if (!collides) break;
      angle += (pass + 1) * 0.28 * (index % 2 === 0 ? 1 : -1);
      radius = clamp(radius + (pass % 2 === 0 ? 0.04 : -0.03), 0.16, 1);
      x = nearbyAnchor.x + Math.cos(angle) * canvasRadius.x * radius;
      y = nearbyAnchor.y + Math.sin(angle) * canvasRadius.y * radius;
    }

    placed.push({
      ...user,
      x: clamp(x, 14, 86),
      y: clamp(y, 12, 82),
      scale: 1.08 - normalizedDistance * 0.14,
    });
  });

  return placed;
}
