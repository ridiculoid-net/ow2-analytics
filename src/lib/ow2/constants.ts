// src/lib/ow2/constants.ts

export type Role = "Tank" | "Damage" | "Support";

export const HEROES: { name: string; role: Role }[] = [
  // Tank
  { name: "D.Va", role: "Tank" },
  { name: "Doomfist", role: "Tank" },
  { name: "Hazard", role: "Tank" },
  { name: "Junker Queen", role: "Tank" },
  { name: "Mauga", role: "Tank" },
  { name: "Orisa", role: "Tank" },
  { name: "Ramattra", role: "Tank" },
  { name: "Reinhardt", role: "Tank" },
  { name: "Roadhog", role: "Tank" },
  { name: "Sigma", role: "Tank" },
  { name: "Winston", role: "Tank" },
  { name: "Wrecking Ball", role: "Tank" },
  { name: "Zarya", role: "Tank" },

  // Damage
  { name: "Ashe", role: "Damage" },
  { name: "Bastion", role: "Damage" },
  { name: "Cassidy", role: "Damage" },
  { name: "Echo", role: "Damage" },
  { name: "Freja", role: "Damage" },
  { name: "Genji", role: "Damage" },
  { name: "Hanzo", role: "Damage" },
  { name: "Junkrat", role: "Damage" },
  { name: "Mei", role: "Damage" },
  { name: "Pharah", role: "Damage" },
  { name: "Reaper", role: "Damage" },
  { name: "Sojourn", role: "Damage" },
  { name: "Soldier: 76", role: "Damage" },
  { name: "Sombra", role: "Damage" },
  { name: "Symmetra", role: "Damage" },
  { name: "Torbjörn", role: "Damage" },
  { name: "Tracer", role: "Damage" },
  { name: "Venture", role: "Damage" },
  { name: "Widowmaker", role: "Damage" },

  // Support
  { name: "Ana", role: "Support" },
  { name: "Baptiste", role: "Support" },
  { name: "Brigitte", role: "Support" },
  { name: "Illari", role: "Support" },
  { name: "Juno", role: "Support" },
  { name: "Kiriko", role: "Support" },
  { name: "Lifeweaver", role: "Support" },
  { name: "Lúcio", role: "Support" },
  { name: "Mercy", role: "Support" },
  { name: "Moira", role: "Support" },
  { name: "Zenyatta", role: "Support" },
];

// convenience map for auto-role
export const HERO_TO_ROLE = new Map(HEROES.map((h) => [h.name.toLowerCase(), h.role]));

// Maps list (editable). If you notice a missing/new map, add it here.
export const MAPS: string[] = [
  // Control
  "Antarctic Peninsula",
  "Busan",
  "Ilios",
  "Lijiang Tower",
  "Nepal",
  "Oasis",
  "Samoa",

  // Escort
  "Circuit Royal",
  "Dorado",
  "Havana",
  "Junkertown",
  "Rialto",
  "Route 66",
  "Shambali Monastery",
  "Watchpoint: Gibraltar",

  // Hybrid
  "Blizzard World",
  "Eichenwalde",
  "Hollywood",
  "King's Row",
  "Midtown",
  "Numbani",
  "Paraiso",

  // Push
  "Colosseo",
  "Esperança",
  "New Queen Street",
  "Runasapi",

  // Flashpoint
  "New Junk City",
  "Suravasa",

  // Clash (if enabled in your modes)
  "Hanaoka",
  "Throne of Anubis",
].sort((a, b) => a.localeCompare(b));
