import { TypedEmitter } from "tiny-typed-emitter";

export interface MessageChannelEvents {
  message: (message: string) => void;
  ready: () => void;
  close: () => void;
}

export abstract class MessageChannel extends TypedEmitter<MessageChannelEvents> {
  abstract send(message: string): void;
}
