import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Result } from '../shared/result';
import { CustomError } from '../shared/customError';
import { Lobby } from '../shared/lobby';

@WebSocketGateway({
  cors: {
    origin: '*', // For development - restrict this in production!
  },
})
class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const usernameResult = this.gameService.playerName(client.id);

    if (usernameResult.error.message === '') {
      const username = usernameResult.name;

      const lobbies = this.gameService.availableLobbies();
      for (const [lobbyId, lobby] of lobbies.entries()) {
        const playerInLobby = lobby.players.find((p) => p.id === client.id);

        if (playerInLobby) {
          this.gameService.removePlayer(client.id);

          this.server.to(lobbyId).emit('player_left', {
            playerName: username,
            message: `${username} has left the lobby`,
          });

          break;
        }
      }
    }
  }

  @SubscribeMessage('create_lobby')
  handleLobbyCreation(
    @ConnectedSocket() client: Socket,
    @MessageBody() lobbyName: string,
  ) {
    const result = this.gameService.createLobby(client.id, lobbyName);

    if (result.succeeded) {
      const usernameResult: {
        succeeded: boolean;
        name: string;
        error: CustomError;
      } = this.gameService.playerName(client.id);

      if (usernameResult.succeeded) {
        client.join(result.lobbyId);
        this.server.to(result.lobbyId).emit('player_joined', {
          playerName: usernameResult.name,
          lobbyId: result.lobbyId,
        });
        this.server.emit('lobbies');
      } else {
        client.emit('lobby_creation_error', {
          error: usernameResult.error.message,
        });
      }
    } else {
      client.emit('lobby_creation_error', { error: result.error.message });
    }
  }

  @SubscribeMessage('register_player')
  handleRegisterPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string },
  ) {
    const result = this.gameService.registerPlayer(client.id, data.username);

    if (result.succeeded) {
      client.emit('register_success', true);
    } else {
      client.emit('register_error', { error: result.error.message });
    }
  }

  @SubscribeMessage('join_lobby')
  handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyName: string },
  ) {
    const result: Result = this.gameService.joinLobby(
      client.id,
      data.lobbyName,
    );

    if (result.succeeded) {
      this.server.emit('lobbies');

      client.join(data.lobbyName);
      const usernameResult: { name: string; error: CustomError } =
        this.gameService.playerName(client.id);
      this.server.to(data.lobbyName).emit('player_joined', {
        playerName: usernameResult.name,
        lobbyName: data.lobbyName,
      });
    } else {
      client.emit('joining_error', { error: result.error.message });
    }
  }

  @SubscribeMessage('lobbies')
  handleLobbies(@ConnectedSocket() client: Socket) {
    const lobbies: Map<string, Lobby> =
      this.gameService.availableLobbies() ?? new Map<string, Lobby>();

    const lobbiesResult: { name: string; playersAmount: number }[] = [];

    for (const lobby of lobbies.values()) {
      console.debug(lobby.name);
      lobbiesResult.push({
        name: lobby.name,
        playersAmount: lobby.players.length,
      });
    }

    console.debug('lobbiesResult', lobbiesResult);
    client.emit('lobbies_values', { lobbies: lobbiesResult });
  }
}

export default GameGateway;
