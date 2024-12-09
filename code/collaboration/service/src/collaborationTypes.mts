import {
  Message,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { collaborationProtocol } from "./protocol.mjs";
import { TypedEmitter } from "tiny-typed-emitter";
import deepEqual from "deep-equal";

export interface Awareness {
  getLocalState: () => Record<string, unknown> | null;
  setLocalState: (state: Record<string, unknown>) => void;
  setLocalStateField: (field: string, value: unknown) => void;
  getStates: () => Map<string, Record<string, unknown>>;
  on: (
    event: "change" | "update",
    listener: (
      changes: { added: string[]; updated: string[]; removed: string[] },
      origin: unknown
    ) => void
  ) => void;
}

interface AwarenessProviderEvents {
  change: (
    changes: { added: string[]; updated: string[]; removed: string[] },
    origin: unknown
  ) => void;
  update: (
    changes: { added: string[]; updated: string[]; removed: string[] },
    origin: unknown
  ) => void;
}

export class AwarenessProvider
  extends TypedEmitter<AwarenessProviderEvents>
  implements Awareness
{
  private _id: string;
  private _states: Map<string, Record<string, unknown>> = new Map();
  private _meta: Map<
    string,
    {
      clock: number;
      lastUpdated: number;
    }
  > = new Map();

  constructor(id: string) {
    super();
    this._id = id;
  }

  getLocalState(): Record<string, unknown> | null {
    return this._id ? this._states.get(this._id) ?? null : null;
  }

  setLocalState(state: Record<string, unknown>): void {
    console.log("collaboration: setting local state", state);
    const previousState = this._states.get(this._id);
    this._states.set(this._id, state);

    const currentLocalMeta = this._meta.get(this._id);
    const clock =
      currentLocalMeta === undefined ? 0 : currentLocalMeta.clock + 1;

    if (state === null) {
      this._states.delete(this._id);
    } else {
      this._states.set(this._id, state);
    }

    this._meta.set(this._id, {
      clock,
      lastUpdated: Date.now(),
    });

    const added = [];
    const updated = [];
    const filteredUpdated = [];
    const removed = [];

    if (state === null) {
      removed.push(this._id);
    } else if (previousState === null) {
      if (state !== null) {
        added.push(this._id);
      }
    } else {
      updated.push(this._id);
      if (!deepEqual(previousState, state, { strict: true })) {
        filteredUpdated.push(this._id);
      }
    }

    console.log(
      "collaboration: updated local state",
      added,
      filteredUpdated,
      updated,
      removed
    );

    if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
      this.emit(
        "change",
        { added, updated: filteredUpdated, removed },
        "local"
      );
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      this.emit("update", { added, updated, removed }, "local");
    }
  }

  setLocalStateField(field: string, value: unknown): void {
    const state = this.getLocalState();
    console.log(
      "collaboration: setting local state field",
      state,
      field,
      value
    );

    if (state !== null) {
      this.setLocalState({
        ...state,
        [field]: value,
      });
    }
  }

  getStates(): Map<string, Record<string, unknown>> {
    return this._states;
  }

  encodeStates(): Record<
    string,
    {
      clock: number;
      lastUpdated: number;
      state: Record<string, unknown> | null;
    }
  > {
    return Object.fromEntries(
      this._states.entries().map(([key, state]) => {
        const meta = this._meta.get(key)!;
        return [
          key,
          {
            clock: meta.clock,
            lastUpdated: meta.lastUpdated,
            state,
          },
        ];
      })
    );
  }

  applyUpdate(
    update: Record<
      string,
      {
        clock: number;
        lastUpdated: number;
        state: Record<string, unknown> | null;
      }
    >,
    origin: unknown
  ) {
    const timestamp = Date.now();
    const added = [];
    const updated = [];
    const filteredUpdated = [];
    const removed = [];

    for (const id in update) {
      let clock = update[id].clock;
      const state = update[id].state;
      const meta = this._meta.get(id);
      const previousState = this._states.get(id);
      const currentClock = meta === undefined ? 0 : meta.clock;

      if (
        currentClock < clock ||
        (currentClock === clock && state === null && this._states.has(id))
      ) {
        if (state === null) {
          if (id === this._id && this.getLocalState() !== null) {
            clock++;
          } else {
            this._states.delete(id);
          }
        } else {
          this._states.set(id, state);
        }

        this._meta.set(id, {
          clock,
          lastUpdated: timestamp,
        });

        if (meta === undefined && state !== null) {
          added.push(id);
        } else if (meta !== undefined && state === null) {
          removed.push(id);
        } else if (state !== null) {
          if (!deepEqual(state, previousState, { strict: true })) {
            filteredUpdated.push(id);
          }
          updated.push(id);
        }
      }
    }

    console.log(
      "collaboration: applied update",
      added,
      filteredUpdated,
      updated,
      removed
    );

    if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
      this.emit(
        "change",
        {
          added,
          updated: filteredUpdated,
          removed,
        },
        origin
      );
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      this.emit(
        "update",
        {
          added,
          updated,
          removed,
        },
        origin
      );
    }
  }
}

interface CollaborationProviderEvents {
  "update-message": (update: Message) => void;
  update: (events: CollaborationUpdateEventType[]) => void;
  "awareness-change": (
    changes: { added: string[]; updated: string[]; removed: string[] },
    origin: any
  ) => void;
  "awareness-update": (
    changes: { added: string[]; updated: string[]; removed: string[] },
    origin: any
  ) => void;
  "awareness-update-message": (
    message: ProtocolMessage<
      typeof collaborationProtocol,
      "collaboration:awareness:update"
    >,
    origin: unknown
  ) => void;
}

export abstract class CollaborationProvider extends TypedEmitter<CollaborationProviderEvents> {
  protected _awarenessProvider: AwarenessProvider;

  constructor(id: string) {
    super();

    this._awarenessProvider = new AwarenessProvider(id);
    this._awarenessProvider.on("update", (_changes, origin) => {
      this.emit(
        "awareness-update-message",
        {
          type: "collaboration:awareness:update",
          content: this._awarenessProvider.encodeStates(),
        },
        origin
      );
    });
  }

  get awareness(): Awareness {
    return {
      getLocalState: this._awarenessProvider.getLocalState.bind(
        this._awarenessProvider
      ),
      getStates: this._awarenessProvider.getStates.bind(
        this._awarenessProvider
      ),
      setLocalState: this._awarenessProvider.setLocalState.bind(
        this._awarenessProvider
      ),
      setLocalStateField: this._awarenessProvider.setLocalStateField.bind(
        this._awarenessProvider
      ),
      on: this._awarenessProvider.on.bind(this._awarenessProvider),
    };
  }

  abstract handleCollaborationMessage(
    message:
      | ProtocolMessage<
          typeof collaborationProtocol,
          "collaboration:message"
        >["content"]
      | (ProtocolMessage<
          typeof collaborationProtocol,
          "collaboration:awareness:update"
        > & { participantId: string })
  ): Promise<Message | void> | Message | void;
  abstract startSynchronization(): Message;
  abstract executeTransaction(transaction: () => void, origin: unknown): void;
  abstract valueToCollaborationType(value: unknown): CollaborationType;
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
