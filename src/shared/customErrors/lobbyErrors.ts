import { CustomError } from '../customError';

export class LobbyErrors {
  usernameAlreadyTaken(username: string): CustomError {
    return new CustomError(
      'registerError',
      `The username '${username}' is already taken.`,
    );
  }
  playerNotFound(): CustomError {
    return new CustomError('playerNotFound', 'No player was found.');
  }

  lobbyNotFound(): CustomError {
    return new CustomError('lobbyNotFound', 'No lobby was found.');
  }

  lobbyAlreadyFull(): CustomError {
    return new CustomError('lobbyAlreadyFull', 'The given lobby already full.');
  }

  lobbyNameAlreadyTaken(): CustomError {
    return new CustomError(
      'lobbyNameAlreadyTaken',
      'The given lobby name is already taken.',
    );
  }

  gameAlreadyStarted(): CustomError {
    return new CustomError(
      'gameAlreadyStarted',
      'Cannot join lobby. Game already started.',
    );
  }

  emptyLobbyName() {
    return new CustomError(
      'emptyLobbyName',
      'The lobby name is required to create a lobby.',
    );
  }

  playerAlreadyInLobby(lobbyId: string) {
    return new CustomError(
      'alreadyInLobby',
      `The player is already in a lobby (${lobbyId}).`,
    );
  }
}
