export interface Player {
  id: string;
  name: string;
}

export interface PlayerBoard {
  id: string;
  name: string;
  cards: { card: number; count: number }[];
  score: number;
  bank: number;
}
