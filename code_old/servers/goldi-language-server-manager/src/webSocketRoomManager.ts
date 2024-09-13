import { randomUUID } from "crypto";
import WebSocket from "ws";

type WebSocketParticipant = {
  webSocket?: WebSocket;
  token: string;
};

type WebSocketRoom = {
  participants: [WebSocketParticipant, WebSocketParticipant];
};

export class WebSocketRoomManager {
  private _rooms: Map<string, WebSocketRoom> = new Map();

  public handleConnection(webSocket: WebSocket) {
    webSocket.once("message", (message) => {
      const parsedMessage = JSON.parse(message.toString());
      const room = this._rooms.get(parsedMessage.room);
      if (!room) {
        webSocket.send(JSON.stringify({ authorized: false }));
        return;
      }
      if (room.participants[0].token === parsedMessage.token) {
        room.participants[0].webSocket = webSocket;
        webSocket.send(JSON.stringify({ authorized: true }));
      } else if (room.participants[1].token === parsedMessage.token) {
        room.participants[1].webSocket = webSocket;
        webSocket.send(JSON.stringify({ authorized: true }));
      }
      if (room.participants[0].webSocket && room.participants[1].webSocket) {
        this._startRoom(room);
      }
    });
  }

  private _startRoom(room: WebSocketRoom) {
    room.participants[0].webSocket?.on("message", (message) =>
      room.participants[1].webSocket?.send(message)
    );

    room.participants[1].webSocket?.on("message", (message) =>
      room.participants[0].webSocket?.send(message)
    );

    room.participants[0].webSocket?.send(JSON.stringify({ ready: true }));
    room.participants[1].webSocket?.send(JSON.stringify({ ready: true }));
  }

  public createRoom(): { id: string; tokens: [string, string] } {
    const id = randomUUID();
    const tokens: [string, string] = [randomUUID(), randomUUID()];

    this._rooms.set(id, {
      participants: [{ token: tokens[0] }, { token: tokens[1] }],
    });

    return { id, tokens };
  }
}
