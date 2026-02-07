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
import { Player } from '../shared/player';

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
    this.gameService.removePlayer(client.id);
  }

  @SubscribeMessage('create_lobby')
  async handleLobbyCreation(
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
        await client.join(result.lobbyName);
        client.emit('lobby_created');

        this.server.to(result.lobbyName).emit('player_joined', {
          playerName: usernameResult.name,
          lobbyName: result.lobbyName,
        });

        this.server.to(result.lobbyName).emit('request_lobbies');
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
  async handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyName: string },
  ) {
    const result: Result = this.gameService.joinLobby(
      client.id,
      data.lobbyName,
    );

    if (result.succeeded) {
      this.server.emit('request_lobbies');

      await client.join(data.lobbyName);
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

  @SubscribeMessage('request_lobbies')
  handleLobbies(@ConnectedSocket() client: Socket) {
    const lobbies: Lobby[] = this.gameService.availableLobbies() ?? [];

    const lobbiesResult: { name: string; playersAmount: number }[] = [];

    for (const lobby of lobbies) {
      lobbiesResult.push({
        name: lobby.name,
        playersAmount: lobby.players.length,
      });
    }

    client.emit('lobbies', { lobbies: lobbiesResult });
  }

  @SubscribeMessage('request_players_in_lobby')
  handlePlayersInLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyName: string },
  ) {
    console.debug(`players_in_lobby: '${data.lobbyName}'`);
    const players: Player[] = this.gameService.playersInLobby(data.lobbyName);

    if (players.length > 0) {
      this.server
        .to(data.lobbyName)
        .emit('players_in_lobby', { players: players });
    } else {
      client.emit('players_in_lobby_error');
    }
  }
}

export default GameGateway;
