import {
    IncomingMessage,
    MessagingProtocol,
    OutgoingMessage,
    Role,
} from "./types.js";
import { TypedEmitter } from "tiny-typed-emitter";

interface MessagingChannelEvents<
    MP extends MessagingProtocol | undefined = undefined,
    R extends Role<MP> | undefined = undefined,
> {
    message: (message: IncomingMessage<MP, R>) => void;
    ready: () => void;
    close: () => void;
}

export abstract class AbstractMessagingChannel<
    MP extends MessagingProtocol | undefined = undefined,
    R extends Role<MP> | undefined = undefined,
> extends TypedEmitter<MessagingChannelEvents<MP, R>> {
    protected _protocolInfo:
        | {
              protocol: MP;
              role: R;
          }
        | undefined;

    protected constructor(options?: { protocol: MP; role: R }) {
        super();
        this._protocolInfo = options;
    }

    abstract send(message: OutgoingMessage<MP, R>): Promise<void> | void;
}
