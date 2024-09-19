import {
    IncomingMessage,
    MessagingProtocol,
    OutgoingMessage,
    Role,
} from "./types.mjs";
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
    protected _protocol: MP;
    protected _role: R;

    protected constructor(protocol: MP, role: R) {
        super();
        this._protocol = protocol;
        this._role = role;
    }

    abstract send(message: OutgoingMessage<MP, R>): Promise<void> | void;
}
