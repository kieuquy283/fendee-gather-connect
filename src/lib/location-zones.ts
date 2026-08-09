import type { PresenceZone } from "./presence-contracts";

export const presenceZones: PresenceZone[] = [
  {
    id: "area-a",
    label: "Area A - The Coffee House Thai Ha",
    shortLabel: "Area A",
    nearbyLabel: "The Coffee House Thai Ha",
  },
  {
    id: "area-b",
    label: "Area B - Lang Ha Library",
    shortLabel: "Area B",
    nearbyLabel: "Lang Ha Library",
  },
  {
    id: "area-c",
    label: "Area C - Dreamplex Lang Ha",
    shortLabel: "Area C",
    nearbyLabel: "Dreamplex Lang Ha",
  },
];

export function getPresenceZone(zoneId: PresenceZone["id"]) {
  return presenceZones.find((zone) => zone.id === zoneId) ?? presenceZones[0]!;
}
