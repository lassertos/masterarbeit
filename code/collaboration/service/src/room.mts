import { YjsCollaborationProvider } from "./collaborationProviders/index.mjs";
import {
  Awareness,
  CollaborationProvider,
  CollaborationType,
  CollaborationUpdateEventType,
} from "./collaborationTypes.mjs";
import { collaborationProtocol } from "./protocol.mjs";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import { TypedEmitter } from "tiny-typed-emitter";

interface RoomEvents {
  update: (events: CollaborationUpdateEventType[]) => void;
}

export class Room extends TypedEmitter<RoomEvents> {
  // TODO: change depending on service direction
  private _participants: Map<
    string,
    CrossLabMessagingChannel<typeof collaborationProtocol, "prosumer">
  > = new Map();
  private _name: string;
  private _collaborationProvider: CollaborationProvider;

  constructor(
    id: string,
    name: string,
    _collaborationProvider: "yjs",
    initialValue: Record<string, unknown> = {}
  ) {
    console.log("collaboration: creating room", initialValue);
    super();
    this._name = name;
    this._collaborationProvider = new YjsCollaborationProvider(
      id,
      initialValue
    );
    this._collaborationProvider.on("update-message", (update) => {
      for (const participant of this._participants.values()) {
        participant.send({
          type: "collaboration:message",
          content: { room: this._name, ...update },
        });
      }
    });
    this._collaborationProvider.on("update", (events) => {
      this.emit("update", events);
    });
    this._collaborationProvider.on(
      "awareness-update-message",
      (message, origin) => {
        for (const [id, participant] of this._participants.entries()) {
          if (id === origin) {
            continue;
          }
          participant.send(message);
        }
      }
    );
  }

  get awareness(): Awareness {
    return this._collaborationProvider.awareness;
  }

  // TODO: change depending on service direction
  addParticipant(
    participantId: string,
    messagingChannel: CrossLabMessagingChannel<
      typeof collaborationProtocol,
      "prosumer"
    >
  ) {
    this._participants.set(participantId, messagingChannel);
  }

  valueToCollaborationType(value: unknown): CollaborationType {
    return this._collaborationProvider.valueToCollaborationType(value);
  }

  executeTransaction(transaction: () => void, origin: unknown) {
    this._collaborationProvider.executeTransaction(transaction, origin);
  }

  async startSynchronization(participantId: string) {
    const participant = this._participants.get(participantId);
    if (!participant) {
      throw new Error(`Could not find participant with id "${participantId}"!`);
    }

    participant.on("message", async (message) => {
      if (!this._participants.has(participantId)) {
        return;
      }

      if (message.type === "collaboration:awareness:update") {
        return await this._collaborationProvider.handleCollaborationMessage({
          ...message,
          participantId,
        });
      }

      if (message.type !== "collaboration:message") {
        throw new Error(
          `Expected message of type "collaboration:message", got "${message.type}"`
        );
      }

      if (message.content.room !== this._name) {
        return;
      }

      const response =
        await this._collaborationProvider.handleCollaborationMessage(
          message.content
        );

      if (response) {
        await participant.send({
          type: "collaboration:message",
          content: {
            room: this._name,
            ...response,
          },
        });
      }
    });

    const startMessage = this._collaborationProvider.startSynchronization();

    await participant.send({
      type: "collaboration:message",
      content: {
        room: this._name,
        ...startMessage,
      },
    });
  }

  removeParticipant(participantId: string) {
    this._participants.delete(participantId);
  }

  get: CollaborationProvider["get"] = (key, type) => {
    console.log("collaboration: getting room value", key, type);
    return this._collaborationProvider.get(key, type);
  };
}
