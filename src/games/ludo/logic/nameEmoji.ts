/**
 * Easter-egg emojis for a few special player names. When a player's name matches
 * one of these, their token centres show the emoji instead of the piece number,
 * and the emoji is shown next to their name wherever it is *displayed* (never in
 * the editable name field).
 */

// Every affectionate variant of "Valeria/Lera" we recognise, Cyrillic and Latin
// alike (compared lowercased + trimmed). Kept as a Set for O(1) lookups.
const HEART_NAMES = new Set([
  // Russian
  'лера',
  'лерочка',
  'лерчик',
  'леруся',
  'лерусик',
  'лерусечка',
  'лерусенька',
  'лерунчик',
  'леруня',
  'лерка',
  'лерока',
  'валерия',
  'валерочка',
  'валерка',
  'валюша',
  // Ukrainian
  'валерія',
  'лєра',
  'лєрочка',
  // Latin transliterations
  'lera',
  'lerochka',
  'lerchik',
  'lerusya',
  'lerusia',
  'lerysa',
  'lerusik',
  'lerusechka',
  'lerunchik',
  'lerunya',
  'lerka',
  'valeria',
  'valeriia',
  'valeriya',
  'valerija',
  'valerochka',
  'valerka',
  'valyusha',
]);
const LION_NAMES = new Set(['leon', 'леон']);

/** The emoji for a name, or null if it isn't a special one. */
export function emojiForName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (HEART_NAMES.has(normalized)) return '❤️';
  if (LION_NAMES.has(normalized)) return '🦁';
  return null;
}

/** A display name with its emoji appended, if it has one. */
export function nameWithEmoji(name: string): string {
  const emoji = emojiForName(name);
  return emoji ? `${name} ${emoji}` : name;
}
