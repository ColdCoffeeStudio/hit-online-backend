import { PlayerBoard } from './player';
import { Card } from './card';

export class Game {
  id: string;
  boards: PlayerBoard[];
  currentPlayer: string;
  lastDrawned: Card;
  deck: Card[];
  constructor(
    id: string,
    boards: PlayerBoard[],
    currentPlayer: string,
    deck: Card[],
  ) {
    this.id = id;
    this.boards = boards;
    this.currentPlayer = currentPlayer;
    this.deck = deck;
    this.lastDrawned = Card.empty();
  }
  static empty(): Game {
    return new Game('', [], '', []);
  }
}
