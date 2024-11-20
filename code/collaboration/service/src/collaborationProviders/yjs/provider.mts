import {
  ProtocolMessage,
  Message,
  isIncomingMessage,
  IncomingMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import {
  CollaborationTypeName,
  CollaborationProvider,
  CollaborationUpdateEventType,
} from "../../collaborationTypes.mjs";
import { collaborationProtocol } from "../../protocol.mjs";
import { yjsCollaborationProtocol } from "./protocol.mjs";
import {
  YjsCollaborationObject,
  YjsCollaborationArray,
  YjsCollaborationNumber,
  YjsCollaborationString,
  YjsCollaborationBoolean,
  YjsCollaborationNull,
  YjsCollaborationType,
  yjsToCollaborationType,
} from "./types.mjs";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as encoding from "lib0/encoding.js";
import * as decoding from "lib0/decoding.js";

export class YjsCollaborationProvider extends CollaborationProvider {
  private _document: Y.Doc;
  private _awareness: awarenessProtocol.Awareness;

  constructor(initialValue: Record<string, unknown>) {
    super();
    this._document = new Y.Doc();
    this._awareness = new awarenessProtocol.Awareness(this._document);

    // TODO: add observers
    this._initialize(initialValue);
  }

  private _initialize(initialValue: Record<string, unknown>) {
    for (const [key, value] of Object.entries(initialValue)) {
      console.log("collaboration: current entry", key, value);
      if (
        typeof value === "undefined" ||
        typeof value === "function" ||
        typeof value === "symbol"
      ) {
        throw new Error(
          `Cannot initialize property "${key}" with type "${typeof value}"!`
        );
      }

      if (Array.isArray(value)) {
        const array = this.get(key, "array");
        array
          .toYjs()
          .observeDeep((events, transaction) =>
            this._handleYjsEvents(key, events, transaction)
          );
        array.push(...value.map((item) => this.valueToCollaborationType(item)));
        console.log(
          "collaboration: initialized as array",
          key,
          value,
          array.toJSON()
        );
        continue;
      }

      if (typeof value === "object") {
        if (value === null) {
          this.get(key, "null");
          continue;
        }
        const object = this.get(key, "object");
        object
          .toYjs()
          .observeDeep((events, transaction) =>
            this._handleYjsEvents(key, events, transaction)
          );
        for (const [key, val] of Object.entries(value)) {
          console.log("collaboration: current entry", key, val);
          object.set(key, this.valueToCollaborationType(val));
        }
        console.log(
          "collaboration: initialized as object",
          key,
          value,
          object.toJSON()
        );
        continue;
      }

      switch (typeof value) {
        case "number": {
          const number = this.get(key, "number");
          number
            .toYjs()
            .observeDeep((events, transaction) =>
              this._handleYjsEvents(key, events, transaction)
            );
          number.set(value);
          console.log(
            "collaboration: initialized as number",
            key,
            value,
            number.toJSON()
          );
          continue;
        }
        case "string": {
          const string = this.get(key, "string");
          string
            .toYjs()
            .observeDeep((events, transaction) =>
              this._handleYjsEvents(key, events, transaction)
            );
          string.set(value);
          console.log(
            "collaboration: initialized as string",
            key,
            value,
            string.toJSON()
          );
          continue;
        }
        case "boolean": {
          const boolean = this.get(key, "boolean");
          boolean
            .toYjs()
            .observeDeep((events, transaction) =>
              this._handleYjsEvents(key, events, transaction)
            );
          boolean.set(value);
          console.log(
            "collaboration: initialized as boolean",
            key,
            value,
            boolean.toJSON()
          );
          continue;
        }
      }
    }

    this._document.on("update", async (update, origin) => {
      if (origin !== this) {
        this.emit("update-message", {
          type: "yjs:sync:update",
          content: {
            message: update,
          },
        } satisfies ProtocolMessage<typeof yjsCollaborationProtocol, "yjs:sync:update">);
      }
    });
  }

  valueToCollaborationType(value: unknown): YjsCollaborationType {
    if (
      typeof value === "undefined" ||
      typeof value === "function" ||
      typeof value === "symbol" ||
      typeof value === "bigint"
    ) {
      throw new Error(
        `Cannot convert type "${typeof value}" to yjs collaboration type!`
      );
    }

    if (Array.isArray(value)) {
      const array = new YjsCollaborationArray();
      array.push(...value.map((item) => this.valueToCollaborationType(item)));
      return array;
    }

    if (typeof value === "object") {
      if (value === null) {
        return new YjsCollaborationNull();
      }
      const object = new YjsCollaborationObject();
      for (const [key, val] of Object.entries(value)) {
        console.log("collaboration: current entry", key, val);
        object.set(key, this.valueToCollaborationType(val));
      }
      return object;
    }

    switch (typeof value) {
      case "number": {
        const number = new YjsCollaborationNumber();
        number.set(value);
        return number;
      }
      case "string": {
        const string = new YjsCollaborationString();
        string.set(value);
        return string;
      }
      case "boolean": {
        const boolean = new YjsCollaborationBoolean();
        boolean.set(value);
        return boolean;
      }
    }

    throw new Error(`Could not convert "${value}" to yjs collaboration type!`);
  }

  executeTransaction(transaction: () => void, origin: unknown) {
    this._document.transact(transaction, origin);
  }

  startSynchronization(): ProtocolMessage<
    typeof yjsCollaborationProtocol,
    "yjs:sync:step1"
  > {
    const encoder = new encoding.Encoder();
    syncProtocol.writeSyncStep1(encoder, this._document);
    return {
      type: "yjs:sync:step1",
      content: { message: encoding.toUint8Array(encoder) },
    };
  }

  handleCollaborationMessage(
    message: ProtocolMessage<
      typeof collaborationProtocol,
      "collaboration:message"
    >["content"]
  ): Promise<Message | void> | Message | void {
    if (!isIncomingMessage(yjsCollaborationProtocol, "participant", message)) {
      throw new Error("Received invalid yjs collaboration message!");
    }
    return this._handleMessage(message);
  }

  get<T extends CollaborationTypeName>(
    key: string,
    type: T
  ): YjsCollaborationType<T> {
    switch (type) {
      case "object": {
        const yMap = this._document.getMap(key);
        return new YjsCollaborationObject(yMap) as YjsCollaborationType<T>;
      }
      case "array": {
        const yArray = this._document.getArray(key);
        return new YjsCollaborationArray(yArray) as YjsCollaborationType<T>;
      }
      case "number": {
        const yText = this._document.getText(key);
        return new YjsCollaborationNumber(yText) as YjsCollaborationType<T>;
      }
      case "string": {
        const yText = this._document.getText(key);
        return new YjsCollaborationString(yText) as YjsCollaborationType<T>;
      }
      case "boolean": {
        const yText = this._document.getText(key);
        return new YjsCollaborationBoolean(yText) as YjsCollaborationType<T>;
      }
      case "null": {
        const yText = this._document.getText(key);
        return new YjsCollaborationNull(yText) as YjsCollaborationType<T>;
      }
    }

    throw new Error(`Cannot get value of type "${type}"!`);
  }

  private _handleMessage(
    message: IncomingMessage<typeof yjsCollaborationProtocol, "participant">
  ) {
    switch (message.type) {
      case "yjs:sync:step1":
        return this._handleSyncStep1Message(message.content);
      case "yjs:sync:step2":
        return this._handleSyncStep2Message(message.content);
      case "yjs:sync:done":
        return this._handleSyncDoneMessage(message.content);
      case "yjs:sync:update":
        return this._handleSyncUpdateMessage(message.content);
      case "yjs:awareness:query":
        return this._handleAwarenessQueryMessage(message.content);
      case "yjs:awareness:update":
        return this._handleAwarenessUpdateMessage(message.content);
    }
  }

  private _handleSyncStep1Message(
    syncStep1Message: ProtocolMessage<
      typeof yjsCollaborationProtocol,
      "yjs:sync:step1"
    >["content"]
  ): ProtocolMessage<typeof yjsCollaborationProtocol, "yjs:sync:step2"> {
    console.log(
      "collaboration: handling sync step 1 message",
      syncStep1Message
    );

    const decoder = new decoding.Decoder(syncStep1Message.message);
    const encoder = new encoding.Encoder();

    // TODO: check if "this" is correct here!
    syncProtocol.readSyncMessage(decoder, encoder, this._document, this);

    console.log("collaboration:", this._document);

    console.log(
      "collaboration: successfully handled sync step 1 message",
      syncStep1Message
    );

    return {
      type: "yjs:sync:step2",
      content: {
        message: encoding.toUint8Array(encoder),
      },
    };
  }

  private _handleSyncStep2Message(
    syncStep2Message: ProtocolMessage<
      typeof yjsCollaborationProtocol,
      "yjs:sync:step2"
    >["content"]
  ): ProtocolMessage<typeof yjsCollaborationProtocol, "yjs:sync:done"> {
    console.log(
      "collaboration: handling sync step 2 message",
      syncStep2Message
    );

    const encoder = new encoding.Encoder();
    const decoder = new decoding.Decoder(syncStep2Message.message);

    // TODO: check if "this" is correct here!
    syncProtocol.readSyncMessage(decoder, encoder, this._document, this);

    console.log("collaboration:", this._document);

    console.log("collaboration: successfully handled sync step 2 message");

    return {
      type: "yjs:sync:done",
      content: undefined,
    };
  }

  private _handleSyncDoneMessage(
    syncDoneMessage: ProtocolMessage<
      typeof yjsCollaborationProtocol,
      "yjs:sync:done"
    >["content"]
  ) {
    console.log("collaboration: handling sync done message", syncDoneMessage);
    console.log("collaboration: successfully handled sync done message");
  }

  private _handleSyncUpdateMessage(
    syncUpdateMessage: ProtocolMessage<
      typeof yjsCollaborationProtocol,
      "yjs:sync:update"
    >["content"]
  ) {
    console.log(
      "collaboration: handling sync updated message",
      syncUpdateMessage
    );

    // TODO: check if "this" is correct here!
    Y.applyUpdate(this._document, syncUpdateMessage.message, this);

    console.log("collaboration: successfully handled sync update message");
  }

  private _handleAwarenessQueryMessage(
    awarenessQueryMessage: ProtocolMessage<
      typeof yjsCollaborationProtocol,
      "yjs:awareness:query"
    >["content"]
  ): ProtocolMessage<typeof yjsCollaborationProtocol, "yjs:awareness:update"> {
    console.log(
      "collaboration: handling awareness query message",
      awarenessQueryMessage
    );

    console.log("collaboration: successfully handled awareness query message");

    return {
      type: "yjs:awareness:update",
      content: {
        message: awarenessProtocol.encodeAwarenessUpdate(
          this._awareness,
          Array.from(this._awareness.getStates().keys())
        ),
      },
    };
  }

  private _handleAwarenessUpdateMessage(
    awarenessUpdateMessage: ProtocolMessage<
      typeof yjsCollaborationProtocol,
      "yjs:awareness:update"
    >["content"]
  ) {
    console.log(
      "collaboration: handling awareness update message",
      awarenessUpdateMessage
    );

    // TODO: check if "this" is correct here!
    awarenessProtocol.applyAwarenessUpdate(
      this._awareness,
      awarenessUpdateMessage.message,
      this
    );

    console.log("collaboration: successfully handled awareness update message");
  }

  private _handleYjsEvents(
    property: string,
    events: Y.YEvent<any>[],
    transaction: Y.Transaction
  ) {
    const updatedEvents: CollaborationUpdateEventType[] = [];
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        const updatedEvent = this._handleYjsMapEvent(event, transaction);
        updatedEvents.push({
          ...updatedEvent,
          path: [property, ...updatedEvent.path],
        });
        continue;
      }

      if (event instanceof Y.YArrayEvent) {
        const updatedEvent = this._handleYjsArrayEvent(event, transaction);
        updatedEvents.push({
          ...updatedEvent,
          path: [property, ...updatedEvent.path],
        });
        continue;
      }

      if (event instanceof Y.YTextEvent) {
        const updatedEvent = this._handleYjsTextEvent(event, transaction);
        updatedEvents.push({
          ...updatedEvent,
          path: [property, ...updatedEvent.path],
        });
        continue;
      }
    }
    this.emit("update", updatedEvents);
  }

  private _handleYjsMapEvent(
    event: Y.YMapEvent<unknown>,
    transaction: Y.Transaction
  ): CollaborationUpdateEventType<"object"> {
    return {
      target: new YjsCollaborationObject(event.target),
      path: event.path,
      origin: transaction.origin,
      changes: new Map(
        event.keys.entries().map(([key, entry]) => {
          return [
            key,
            {
              action: entry.action,
              oldValue:
                entry.oldValue !== undefined
                  ? yjsToCollaborationType(entry.oldValue).toJSON()
                  : undefined,
              newValue:
                entry.newValue !== undefined
                  ? yjsToCollaborationType(entry.newValue).toJSON()
                  : undefined,
            },
          ];
        })
      ),
    };
  }

  private _handleYjsArrayEvent(
    event: Y.YArrayEvent<unknown>,
    transaction: Y.Transaction
  ): CollaborationUpdateEventType<"array"> {
    return {
      target: new YjsCollaborationArray(event.target),
      path: event.path,
      origin: transaction.origin,
      delta: event.delta
        .map((action) => {
          if (action.insert) {
            const inserted = action.insert;

            if (
              !Array.isArray(inserted) &&
              !(inserted instanceof Y.Map) &&
              !(inserted instanceof Y.Array) &&
              !(inserted instanceof Y.Text)
            ) {
              throw Error(`Invalid insertion into array!`);
            }

            if (Array.isArray(inserted)) {
              for (const insert of inserted) {
                if (
                  !Array.isArray(inserted) &&
                  !(insert instanceof Y.Map) &&
                  !(insert instanceof Y.Array) &&
                  !(insert instanceof Y.Text)
                ) {
                  throw Error(`Invalid insertion into array!`);
                }
              }
            }

            return {
              insert: Array.isArray(inserted)
                ? inserted.map((insert) =>
                    yjsToCollaborationType(insert).toJSON()
                  )
                : yjsToCollaborationType(inserted).toJSON(),
            };
          }

          if (action.retain) {
            return { retain: action.retain };
          }

          if (action.delete) {
            return { delete: action.delete };
          }
        })
        .filter((action) => action !== undefined),
    };
  }

  private _handleYjsTextEvent(
    event: Y.YTextEvent,
    transaction: Y.Transaction
  ):
    | CollaborationUpdateEventType<"number">
    | CollaborationUpdateEventType<"string">
    | CollaborationUpdateEventType<"boolean"> {
    const type = event.target.getAttribute("type") as unknown;

    if (type !== "number" && type !== "string" && type !== "boolean") {
      throw new Error(`Cannot handle event for unknown type "${type}"!`);
    }

    switch (type) {
      case "number":
        return {
          target: new YjsCollaborationNumber(event.target),
          path: event.path,
          origin: transaction.origin,
          newValue: JSON.parse(event.target.toJSON()),
        } satisfies CollaborationUpdateEventType<"number">;
      case "string":
        return {
          target: new YjsCollaborationString(event.target),
          path: event.path,
          origin: transaction.origin,
          changes: event.delta
            .map((action) => {
              if (action.insert && typeof action.insert === "string") {
                return { insert: action.insert };
              }

              if (action.retain) {
                return { retain: action.retain };
              }

              if (action.delete) {
                return { delete: action.delete };
              }
            })
            .filter((action) => action !== undefined),
        } satisfies CollaborationUpdateEventType<"string">;
      case "boolean":
        return {
          target: new YjsCollaborationBoolean(event.target),
          path: event.path,
          origin: transaction.origin,
          newValue: JSON.parse(event.target.toJSON()),
        } satisfies CollaborationUpdateEventType<"boolean">;
    }
  }
}
