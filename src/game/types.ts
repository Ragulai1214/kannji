export type GroupId = 'sky' | 'earth' | 'plants' | 'life' | 'mind' | 'action' | 'quality';
export type Vector = readonly [number, number, number];
export type Kanji = Readonly<{ kind: 'kanji'; char: string; group: GroupId; rarity?: Rarity }>;
export type Filler = Readonly<{ kind: 'filler'; char: '1' }>;
export type Character = Kanji | Filler;
export type FourCharacters = readonly [Character, Character, Character, Character];
export type Rarity = 'N' | 'C' | 'R' | 'SR' | 'UR';
export type Random = () => number;
export type GachaState = Readonly<{
  draws: number;
  selected: readonly Character[];
  pending: Kanji | null;
  complete: boolean;
}>;
export type ScoreStep = Readonly<{
  kind: 'character' | 'combination' | 'rarity' | 'filler' | 'limit';
  points: number;
  label: string;
  index?: number;
  rarity?: Rarity;
}>;
export type Side = 'player' | 'enemy';
export type Outcome = 'win' | 'lose' | 'draw';
export type Stats = Readonly<{ hp: number; atk: number; def: number }>;
export type Score = Readonly<{
  characters: FourCharacters;
  steps: readonly ScoreStep[];
  total: number;
  hasFiller: boolean;
}>;
