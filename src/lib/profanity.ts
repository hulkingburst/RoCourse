/**
 * Lightweight moderation for public display names — weekly leaderboard rows
 * (guests and accounts), guest names saved in the browser, and account names
 * chosen at sign-up.
 *
 * Matching is deliberately "not too harsh": a name is only flagged when a whole
 * word matches a banned word after light normalization, so a name like
 * "assassin" — which merely *contains* the word "ass" as a substring — passes,
 * while the word on its own ("bob the ass") is caught. Common leet
 * substitutions are folded in first, so "b1tch" still resolves to "bitch".
 * Composites that *embed* a banned word ("fuckthisname") are deliberately not
 * caught — that level of matching would also flag innocent names and surnames
 * ("Dickinson" contains "dick") — the same false-positive problem the whole-token
 * approach exists to avoid.
 */

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "!": "i",
  "@": "a",
  "$": "s",
};

/** Neutral name shown in place of a moderated one. */
export const FALLBACK_DISPLAY_NAME = "Learner";

// Curated list of slurs, strong profanity, and their common inflections.
// Deliberately excludes mild, reclaimed, or ambiguous words so legit names
// aren't swept up by substring accidents.
const BANNED_RESERVED: string[] = [
  "anal",
  "anus",
  "arse",
  "arsehole",
  "ass",
  "asses",
  "asshole",
  "assholes",
  "autistic",
  "bastard",
  "bastards",
  "bdsm",
  "beaner",
  "beaners",
  "bitch",
  "bitches",
  "bitching",
  "bitchy",
  "blowjob",
  "bullshit",
  "chink",
  "chinks",
  "clit",
  "clitoris",
  "cock",
  "cocks",
  "cocksucker",
  "condom",
  "coon",
  "coons",
  "cum",
  "cunt",
  "cunts",
  "dick",
  "dickhead",
  "dicks",
  "dildo",
  "dipshit",
  "douche",
  "douchebag",
  "dyke",
  "dykes",
  "ejaculate",
  "fag",
  "faggot",
  "faggots",
  "fags",
  "fellatio",
  "fuck",
  "fucked",
  "fucker",
  "fuckers",
  "fucking",
  "gook",
  "gooks",
  "hitler",
  "incest",
  "kike",
  "kikes",
  "kraut",
  "krauts",
  "masturbate",
  "milf",
  "nazi",
  "nazis",
  "nigg",
  "nigga",
  "niggas",
  "nigger",
  "niggers",
  "nipple",
  "nips",
  "orgasm",
  "paedophile",
  "paki",
  "pedo",
  "pedophile",
  "pedophiles",
  "penis",
  "porn",
  "porno",
  "prick",
  "pricks",
  "pussy",
  "pussies",
  "rape",
  "raped",
  "raper",
  "rapes",
  "rapist",
  "rapists",
  "redskin",
  "redskins",
  "retard",
  "retarded",
  "retards",
  "sandnigger",
  "scrotum",
  "sex",
  "sexual",
  "shit",
  "shithead",
  "shitheads",
  "shits",
  "shitting",
  "shitty",
  "slut",
  "sluts",
  "sperm",
  "spic",
  "spics",
  "tits",
  "tranny",
  "trannies",
  "twat",
  "twats",
  "vagina",
  "vibrator",
  "wetback",
  "wetbacks",
  "whore",
  "whores",
  "wank",
  "wanker",
  "wankers",
];

const BANNED = new Set(BANNED_RESERVED);

/** Fold leet substitutions and lower-case a single token. */
export function normalizeToken(raw: string): string {
  let out = "";
  for (const ch of raw.toLowerCase()) {
    out += LEET[ch] ?? ch;
  }
  return out;
}

/**
 * Splits text into normalized word tokens. Letters, digits, and the leet
 * punctuation marked above are part of a token ("n!gga" stays one token so it
 * can normalize to "nigga"); anything else — spaces, dashes, dots — splits.
 */
export function tokenizeName(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  for (const ch of text) {
    if (/[a-z0-9!@$]/i.test(ch)) {
      current += ch;
    } else {
      if (current) tokens.push(normalizeToken(current));
      current = "";
    }
  }
  if (current) tokens.push(normalizeToken(current));
  return tokens;
}

/** The first banned word found in `text`, or null when the name is fine. */
export function containsBadWord(text: string): string | null {
  for (const token of tokenizeName(text)) {
    if (BANNED.has(token)) return token;
  }
  return null;
}

// ----- email & website protection -----
// Two extra shapes usernames are checked against (beyond profanity):
//   - an embedded email address, so a sign-up auto-fill can't leak the user's
//     real inbox into a public leaderboard/name,
//   - an obvious website (a scheme, "www.", or a "word.tld" like "pearl.shop"),
//     so names can't be used to promote sites — the usual prelude to scams.
// Deliberately only whole domains: a plain dotted name ("sam.lee") passes.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /(?:^|[\s(])(?:www\.|https?:\/\/|ftp:\/\/)/i;
const PROMOTION_TLDS =
  "com|net|org|io|co|me|info|biz|dev|xyz|app|site|online|store|shop|club|gg|tv|ai|us|uk|link|top|work|fun|world|blog|space|cloud|pro|game|live|tech|page|team|media|news";
const PROMOTION_RE = new RegExp(
  `(^|[\\s(])[a-z0-9][a-z0-9-]*\\.(${PROMOTION_TLDS})(?![a-z0-9-])`,
  "i"
);

export type ProhibitedNameReason = "badword" | "email" | "site";

/**
 * Higher-level moderation gate used everywhere a public name is accepted:
 * returns the first rule a name trips (a banned word, an embedded email, or a
 * website), or null when the name is fine.
 */
export function prohibitedNameReason(text: string): ProhibitedNameReason | null {
  if (EMAIL_RE.test(text)) return "email";
  if (URL_RE.test(text) || PROMOTION_RE.test(text)) return "site";
  if (containsBadWord(text)) return "badword";
  return null;
}

/** Returns `text` unchanged, or a neutral fallback when it trips moderation. */
export function moderateName(text: string): string {
  return prohibitedNameReason(text) === null ? text : FALLBACK_DISPLAY_NAME;
}

/**
 * Guest-specific fallback tied to the guest's id, so a name already stored in
 * the browser that turns out banned still yields a stable, anonymous display
 * name instead of rejecting the XP post outright.
 */
export function moderateGuestName(name: string, guestId: string): string {
  return prohibitedNameReason(name) === null
    ? name
    : `Guest-${guestId.slice(-4).toUpperCase()}`;
}