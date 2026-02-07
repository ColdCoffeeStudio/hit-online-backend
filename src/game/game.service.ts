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
    lobbyName: string;
    error: CustomError;
  } {
    let result: {
      succeeded: boolean;
      lobbyName: string;
      error: CustomError;
    };

    if (lobbyName) {
      const guid: string = uuid();
      const playerName: string | undefined =
        this.connectedPlayers.get(socketId);

      if (this.lobbies.get(lobbyName)){
        result = {
          succeeded: false,
          lobbyName: '',
          error: this.lobbyErrors.lobbyNameAlreadyTaken()
        };
      } else {
        if (!playerName) {
          result = {
            succeeded: false,
            lobbyName: '',
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
            lobbyName: lobbyName,
            error: CustomError.empty(),
          };
        }
      }
    } else {
      result = {
        succeeded: false,
        lobbyName: '',
        error: this.lobbyErrors.emptyLobbyName(),
      };
    }

    console.debug(result);
    return result;
  }

  joinLobby(socketId: string, lobbyName: string): Result {
    const lobby: Lobby | undefined = this.lobbies.get(lobbyName);
    let result: Result;
    const presentInLobby: { present: boolean; lobbyName: string } =
      this.inLobby(socketId);

    if (!presentInLobby.present) {
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
            this.lobbies.set(lobby.name, lobby);
            result = new Result(true, CustomError.empty());
          }
        } else {
          result = new Result(false, this.lobbyErrors.gameAlreadyStarted());
        }
      }
    } else {
      result = new Result(
        false,
        this.lobbyErrors.playerAlreadyInLobby(presentInLobby.lobbyName),
      );
    }

    return result;
  }

  availableLobbies(): Lobby[] {
    const lobbies: Map<string, Lobby> = this.lobbies;
    const availableLobbies: Lobby[] = [];

    for (const lobby of lobbies.values()) {
      if (lobby.gameState === GameState.LOBBY) {
        availableLobbies.push(lobby);
      }
    }

    return availableLobbies;
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
    for (const [lobbyName, lobby] of this.lobbies.entries()) {
      const playersBefore = lobby.players.length;
      lobby.players = lobby.players.filter(
        (p: Player): boolean => p.id !== socketId,
      );

      if (lobby.players.length !== playersBefore) {
        if (lobby.players.length === 0) {
          this.lobbies.delete(lobbyName);
          continue;
        }

        if (lobby.creatorId === socketId) {
          lobby.creatorId = lobby.players[0].id;
        }

        this.lobbies.set(lobbyName, lobby);
      }
    }
  }

  inLobby(socketId: string): { present: boolean; lobbyName: string } {
    let presentInLobby = false;
    let lobbyName: string = '';

    for (const lobby of this.lobbies.values()) {
      const filteredPlayers = lobby.players.filter(
        (p: Player): boolean => p.id === socketId,
      );

      console.debug(filteredPlayers);

      if (filteredPlayers.length > 0) {
        presentInLobby = true;
        lobbyName = lobby.name;
        break;
      }
    }

    return { present: presentInLobby, lobbyName: lobbyName };
  }

  playersInLobby(lobbyId: string) {
    console.debug(this.lobbies);

    const lobby = this.lobbies.get(lobbyId);
    let players: Player[] = [];
    if (lobby) {
      players = lobby.players;
    }
    return players;
  }
}
