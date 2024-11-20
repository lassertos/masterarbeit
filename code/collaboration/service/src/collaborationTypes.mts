import {
  Message,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { collaborationProtocol } from "./protocol.mjs";
import { TypedEmitter } from "tiny-typed-emitter";

interface CollaborationProviderEvents {
  "update-message": (update: Message) => void;
  update: (events: CollaborationUpdateEventType[]) => void;
}

export abstract class CollaborationProvider extends TypedEmitter<CollaborationProviderEvents> {
  constructor(_initialValue?: Record<string, unknown>) {
    super();
  }

  abstract handleCollaborationMessage(
    message: ProtocolMessage<
      typeof collaborationProtocol,
      "collaboration:message"
    >["content"]
  ): Promise<Message | void> | Message | void;

  abstract startSynchronization(): Message;

  abstract get<T extends CollaborationTypeName>(
    key: string,
    type: T
  ): CollaborationType<T>;
}

interface CollaborationObjectEvents {
  update: (event: {
    target: CollaborationObject;
    path: (string | number)[];
    origin: unknown;
    changes: Map<
      string,
      {
        action: "add" | "update" | "delete";
        oldValue?: unknown;
        newValue?: unknown;
      }
    >;
  }) => void;
}

export abstract class CollaborationObject extends TypedEmitter<CollaborationObjectEvents> {
  abstract set(key: string, value: CollaborationType): void;
  abstract get(key: string): CollaborationType | undefined;
  abstract delete(key: string): void;
  abstract toJSON(): Record<string, unknown>;
}

interface CollaborationArrayEvents {
  update: (event: {
    target: CollaborationArray;
    path: (string | number)[];
    origin: unknown;
    delta: ({ insert: unknown } | { retain: number } | { delete: number })[];
  }) => void;
}

export abstract class CollaborationArray extends TypedEmitter<CollaborationArrayEvents> {
  abstract push(item: CollaborationType): void;
  abstract get(index: number): CollaborationType | undefined;
  abstract delete(index: number, length?: number): void;
  abstract toJSON(): Array<unknown>;
}

interface CollaborationNumberEvents {
  update: (event: {
    target: CollaborationNumber;
    path: (string | number)[];
    origin: unknown;
    newValue: number;
  }) => void;
}

export abstract class CollaborationNumber extends TypedEmitter<CollaborationNumberEvents> {
  abstract set(value: number): void;
  abstract toJSON(): number;
}

interface CollaborationStringEvents {
  update: (event: {
    target: CollaborationString;
    path: (string | number)[];
    origin: unknown;
    changes: {
      insert?: string;
      delete?: number;
      retain?: number;
    }[];
  }) => void;
}

export abstract class CollaborationString extends TypedEmitter<CollaborationStringEvents> {
  abstract set(value: string): void;
  abstract insert(index: number, value: string): void;
  abstract delete(index: number, count: number): void;
  abstract toJSON(): string;
}

interface CollaborationBooleanEvents {
  update: (event: {
    target: CollaborationBoolean;
    path: (string | number)[];
    origin: unknown;
    newValue: boolean;
  }) => void;
}

export abstract class CollaborationBoolean extends TypedEmitter<CollaborationBooleanEvents> {
  abstract set(value: boolean): void;
  abstract toJSON(): boolean;
}

export abstract class CollaborationNull {
  abstract toJSON(): null;
}

export type CollaborationTypeName =
  | "object"
  | "array"
  | "number"
  | "string"
  | "boolean"
  | "null";

export type CollaborationType<
  T extends CollaborationTypeName | undefined = undefined
> = T extends "object"
  ? CollaborationObject
  : T extends "array"
  ? CollaborationArray
  : T extends "number"
  ? CollaborationNumber
  : T extends "string"
  ? CollaborationString
  : T extends "boolean"
  ? CollaborationBoolean
  : T extends "null"
  ? CollaborationNull
  :
      | CollaborationObject
      | CollaborationArray
      | CollaborationNumber
      | CollaborationString
      | CollaborationBoolean
      | CollaborationNull;

export type CollaborationUpdateEventType<
  T extends Exclude<CollaborationTypeName, "null"> | undefined = undefined
> = T extends "object"
  ? Parameters<CollaborationObjectEvents["update"]>[0]
  : T extends "array"
  ? Parameters<CollaborationArrayEvents["update"]>[0]
  : T extends "number"
  ? Parameters<CollaborationNumberEvents["update"]>[0]
  : T extends "string"
  ? Parameters<CollaborationStringEvents["update"]>[0]
  : T extends "boolean"
  ? Parameters<CollaborationBooleanEvents["update"]>[0]
  :
      | Parameters<CollaborationObjectEvents["update"]>[0]
      | Parameters<CollaborationArrayEvents["update"]>[0]
      | Parameters<CollaborationNumberEvents["update"]>[0]
      | Parameters<CollaborationStringEvents["update"]>[0]
      | Parameters<CollaborationBooleanEvents["update"]>[0];
