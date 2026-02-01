import { Injectable } from '@nestjs/common';
import { GameState, Lobby } from '../shared/lobby';
import { Result } from '../shared/result';
import { LobbyErrors } from '../shared/customErrors/lobbyErrors';
import { CustomError } from '../shared/customError';
import { v4 as uuid } from 'uuid';
import { Player } from '../shared/player';
import { Game } from '../shared/game';

@Injectable()
export class GameService {
  private connectedPlayers: Map<string, string> = new Map();
  private lobbies: Map<string, Lobby> = new Map();
  private lobbyErrors: LobbyErrors = new LobbyErrors();

  registerPlayer(socketId: string, username: string): Result {
    let result: Result;
    const exists = Array.from(this.connectedPlayers.values()).includes(
      username,
    );

    if (!exists) {
      this.connectedPlayers.set(socketId, username);
      result = new Result(true, CustomError.empty());
    } else {
      result = new Result(
        false,
        this.lobbyErrors.usernameAlreadyTaken(username),
      );
    }

    return result;
  }

  createLobby(
    socketId: string,
    lobbyName: string,
  ): {
    succeeded: boolean;
    lobbyId: string;
    error: CustomError;
  } {
    let result: {
      succeeded: boolean;
      lobbyId: string;
      error: CustomError;
    };

    if (lobbyName) {
      const guid: string = uuid();
      const playerName: string | undefined =
        this.connectedPlayers.get(socketId);

      if (!playerName) {
        result = {
          succeeded: false,
          lobbyId: '',
          error: this.lobbyErrors.playerNotFound(),
        };
      } else {
        const player: Player = { id: socketId, name: playerName };
        const lobby: Lobby = {
          id: guid,
          name: lobbyName,
          players: [player],
          creatorId: socketId,
          gameState: GameState.LOBBY,
          game: Game.empty(),
        };
        this.lobbies.set(lobbyName, lobby);
        result = {
          succeeded: true,
          lobbyId: lobbyName,
          error: CustomError.empty(),
        };
      }
    } else {
      result = {
        succeeded: false,
        lobbyId: '',
        error: this.lobbyErrors.emptyLobbyName(),
      };
    }
    return result;
  }

  joinLobby(socketId: string, lobbyName: string): Result {
    const lobby: Lobby | undefined = this.lobbies.get(lobbyName);
    let result: Result;

    console.debug(lobbyName);

    if (!lobby) {
      result = new Result(false, this.lobbyErrors.lobbyNotFound());
    } else if (lobby.players.length >= 5) {
      result = new Result(false, this.lobbyErrors.lobbyAlreadyFull());
    } else {
      if (lobby.gameState === GameState.LOBBY) {
        const playerName: string | undefined =
          this.connectedPlayers.get(socketId);

        if (!playerName) {
          result = new Result(false, this.lobbyErrors.playerNotFound());
        } else {
          const player: Player = { id: socketId, name: playerName };

          this.leaveLobby(socketId);
          lobby.players = [...lobby.players, player];
          this.lobbies.set(lobby.id, lobby);
          result = new Result(true, CustomError.empty());
        }
      } else {
        result = new Result(false, this.lobbyErrors.gameAlreadyStarted());
      }
    }
    return result;
  }

  availableLobbies(): Map<string, Lobby> {
    return this.lobbies;
  }

  removePlayer(socketId: string): Result {
    const existed = this.connectedPlayers.delete(socketId);
    let result: Result;

    if (!existed) {
      result = new Result(false, this.lobbyErrors.playerNotFound());
    } else {
      this.leaveLobby(socketId);
      result = new Result(true, CustomError.empty());
    }
    return result;
  }

  playerName(socketId: string): {
    succeeded: boolean;
    name: string;
    error: CustomError;
  } {
    const playerName: string | undefined = this.connectedPlayers.get(socketId);
    return playerName
      ? { succeeded: true, name: playerName, error: CustomError.empty() }
      : {
          succeeded: false,
          name: '',
          error: this.lobbyErrors.playerNotFound(),
        };
  }

  leaveLobby(socketId: string): void {
    for (const [lobbyId, lobby] of this.lobbies.entries()) {
      const playersBefore = lobby.players.length;
      lobby.players = lobby.players.filter(
        (p: Player): boolean => p.id !== socketId,
      );

      if (lobby.players.length !== playersBefore) {
        if (lobby.players.length === 0) {
          this.lobbies.delete(lobbyId);
          continue;
        }

        if (lobby.creatorId === socketId) {
          lobby.creatorId = lobby.players[0].id;
        }

        this.lobbies.set(lobbyId, lobby);
      }
    }
  }
}
