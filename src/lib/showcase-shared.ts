/** A game approved for the public showcase. The showcase is a demonstration of
 * what students build by finishing the course, not a game-promotion catalog —
 * a card carries a short description and an optional play link, nothing more. */
export interface ShowcaseGame {
  /** GitHub issue number acts as the stable id. */
  id: string;
  gameName: string;
  description: string;
  /** Optional link to the finished Roblox experience. */
  gameUrl: string | null;
  authorName: string;
  /** Profile handle of the submitter, when it exists. */
  handle: string | null;
  acceptedAt: string;
}

export const MAX_GAME_NAME = 100;
export const MAX_GAME_DESCRIPTION = 2000;
export const MAX_GAME_URL = 2048;