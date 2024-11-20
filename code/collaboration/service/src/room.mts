import { YjsCollaborationProvider } from "./collaborationProviders/index.mjs";
import {
  CollaborationProvider,
  CollaborationUpdateEventType,
} from "./collaborationTypes.mjs";
import { collaborationProtocol } from "./protocol.mjs";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import { ProtocolMessage } from "@crosslab-ide/abstract-messaging-channel";
import { TypedEmitter } from "tiny-typed-emitter";

interface RoomEvents {
  update: (events: CollaborationUpdateEventType[]) => void;
}

export class Room extends TypedEmitter<RoomEvents> {
  private _participants: Map<
    string,
    CrossLabMessagingChannel<typeof collaborationProtocol, "participant">
  > = new Map();
  private _name: string;
  private _collaborationProvider: CollaborationProvider;

  constructor(
    name: string,
    _collaborationProvider: "yjs",
    initialValue: Record<string, unknown>
  ) {
    super();
    this._name = name;
    this._collaborationProvider = new YjsCollaborationProvider(initialValue);
    this._collaborationProvider.on("update-message", (update) => {
      for (const participant of this._participants.values()) {
        participant.send({
          type: "collaboration:message",
          content: { room: this._name, ...update },
        });
      }
    });
  }

  addParticipant(
    participantId: string,
    messagingChannel: CrossLabMessagingChannel<
      typeof collaborationProtocol,
      "participant"
    >
  ) {
    this._participants.set(participantId, messagingChannel);
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

      if (message.type !== "collaboration:message") {
        throw new Error(
          `Expected message of type "collaboration:message", got "${message.type}"`
        );
      }

      if (message.content.room !== this._name) {
        return;
      }

      const response = await this.handleCollaborationMessage(message.content);

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

  handleCollaborationMessage(
    message: ProtocolMessage<
      typeof collaborationProtocol,
      "collaboration:message"
    >["content"]
  ) {
    return this._collaborationProvider.handleCollaborationMessage(message);
  }

  get: CollaborationProvider["get"] = (key, type) => {
    return this._collaborationProvider.get(key, type);
  };
}
