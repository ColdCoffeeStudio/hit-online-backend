import { Player } from './player';
import { Game } from './game';

export enum GameState {
  LOBBY = 0,
  STARTED = 1,
  ENDED = 2,
}

export interface Lobby {
  id: string;
  name: string;
  players: Player[];
  creatorId: string;
  gameState: GameState;
  game: Game;
}
