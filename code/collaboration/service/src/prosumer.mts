import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { TypedEmitter } from "tiny-typed-emitter";
import { collaborationProtocol } from "./protocol.mjs";
import { Room } from "./room.mjs";
import {
  CollaborationType,
  CollaborationTypeName,
  CollaborationUpdateEventType,
} from "./collaborationTypes.mjs";

const serviceConfigurationSchema = z.object({
  serviceType: z.string(),
  serviceId: z.string(),
  remoteServiceId: z.string(),
  rooms: z.array(z.string()),
});
function checkServiceConfiguration(
  serviceConfiguration: ServiceConfiguration
): serviceConfiguration is z.infer<typeof serviceConfigurationSchema> {
  return serviceConfigurationSchema.safeParse(serviceConfiguration).success;
}

type CollaborationServiceProsumerEvents = {
  "new-participant": (participantId: string) => void;
  update: (room: string, events: CollaborationUpdateEventType[]) => void;
};

export class CollaborationServiceProsumer
  extends TypedEmitter<CollaborationServiceProsumerEvents>
  implements Service
{
  private _prosumers: Map<
    string,
    CrossLabMessagingChannel<typeof collaborationProtocol, "participant">
  > = new Map();
  private _initialValues: Map<
    string,
    | Record<string, unknown>
    | Promise<Record<string, unknown>>
    | (() => Promise<Record<string, unknown>> | Record<string, unknown>)
  > = new Map();
  private _rooms: Map<string, Room> = new Map();
  private _id: string;
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/collaboration";
  serviceId: string;
  serviceDirection: ServiceDirection = "prosumer";

  constructor(serviceId: string) {
    super();
    this.serviceId = serviceId;
    this._id = uuidv4();
    console.log("collaboration: created prosumer with id", this.id);
  }

  get id() {
    return this._id;
  }

  executeTransaction(
    roomName: string,
    transaction: () => void,
    origin: unknown
  ) {
    const room = this._rooms.get(roomName);
    if (!room) {
      throw new Error(`Room with name "${roomName}" could not be found!`);
    }
    room.executeTransaction(transaction, origin);
  }

  valueToCollaborationType(
    roomName: string,
    value: unknown
  ): CollaborationType {
    const room = this._rooms.get(roomName);
    if (!room) {
      throw new Error(`Room with name "${roomName}" could not be found!`);
    }
    return room.valueToCollaborationType(value);
  }

  setInitialValue(
    room: string,
    initialValue:
      | Record<string, unknown>
      | Promise<Record<string, unknown>>
      | (() => Promise<Record<string, unknown>> | Record<string, unknown>)
  ) {
    this._initialValues.set(room, initialValue);
  }

  getCollaborationValue(
    roomName: string,
    key: string,
    type: CollaborationTypeName
  ) {
    const room = this._rooms.get(roomName);
    if (!room) {
      throw new Error(`Room with name "${roomName}" could not be found!`);
    }
    return room.get(key, type);
  }

  getMeta() {
    return {
      serviceId: this.serviceId,
      serviceType: this.serviceType,
      serviceDirection: this.serviceDirection,
      supportedConnectionTypes: ["webrtc", "websocket", "local"],
    };
  }

  setupConnection(
    connection: PeerConnection,
    serviceConfiguration: ServiceConfiguration
  ): void {
    // TODO: add checkConfig function
    console.log("collaboration: trying to set up connection");
    const channel = new DataChannel();
    const messagingChannel = new CrossLabMessagingChannel(
      channel,
      collaborationProtocol,
      "participant"
    );

    if (!checkServiceConfiguration(serviceConfiguration)) {
      throw new Error("Service configuration is invalid!");
    }

    const initializationRequestPromise =
      this._receiveInitializationRequest(messagingChannel);

    messagingChannel.once("ready", async () => {
      console.log("collaboration: sending initialization message!");
      await messagingChannel.send({
        type: "collaboration:initialization:request",
        content: {
          id: this._id,
        },
      });
      const [prosumerId, initializationResponsePromise] =
        await initializationRequestPromise;

      this.emit("new-participant", prosumerId);

      for (const roomName of serviceConfiguration.rooms) {
        if (!this._rooms.has(roomName)) {
          const initialValue = this._initialValues.get(roomName);
          const room = new Room(
            roomName,
            "yjs",
            typeof initialValue === "function"
              ? await initialValue()
              : await initialValue
          );
          room.on("update", (events) => {
            this.emit("update", roomName, events);
          });
          this._rooms.set(roomName, room);
        }
        const room = this._rooms.get(roomName);
        if (!room) {
          throw new Error(`Room with name "${roomName}" could not be found!`);
        }
        room.addParticipant(prosumerId, messagingChannel);
      }

      await messagingChannel.send({
        type: "collaboration:initialization:response",
        content: undefined,
      });

      await initializationResponsePromise;

      for (const roomName of serviceConfiguration.rooms) {
        const room = this._rooms.get(roomName);
        if (!room) {
          throw new Error(`Room with name "${roomName}" could not be found!`);
        }
        room.startSynchronization(prosumerId);
      }
    });

    messagingChannel.on("close", () => {});

    if (connection.tiebreaker) {
      connection.transmit(serviceConfiguration, "data", channel);
    } else {
      connection.receive(serviceConfiguration, "data", channel);
    }
    console.log("collaboration: successfully set up connection");
  }

  private _receiveInitializationRequest(
    messagingChannel: CrossLabMessagingChannel<
      typeof collaborationProtocol,
      "participant"
    >
  ): Promise<[string, Promise<void>]> {
    return new Promise<[string, Promise<void>]>((resolve, reject) => {
      messagingChannel.once("message", (message) => {
        console.log("collaboration: received first message!");
        if (message.type !== "collaboration:initialization:request") {
          return reject(
            `Expected first message to be of type "collaboration:initialization:request", instead received "${message.type}"!`
          );
        }
        console.log("collaboration: received initialization request!");
        this._prosumers.set(message.content.id, messagingChannel);
        resolve([
          message.content.id,
          this._receiveInitializationResponse(messagingChannel),
        ]);
      });
    });
  }

  private async _receiveInitializationResponse(
    messagingChannel: CrossLabMessagingChannel<
      typeof collaborationProtocol,
      "participant"
    >
  ) {
    return new Promise<void>((resolve, reject) => {
      messagingChannel.once("message", (message) => {
        console.log("collaboration: received second message!");
        if (message.type !== "collaboration:initialization:response") {
          return reject(
            `Expected second message to be of type "collaboration:initialization:response", instead received "${message.type}"!`
          );
        }
        console.log("collaboration: received initialization response!");
        resolve();
      });
    });
  }
}
