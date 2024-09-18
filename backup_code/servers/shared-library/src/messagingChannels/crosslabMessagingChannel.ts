import { DeviceHandler } from "@cross-lab-project/soa-client";
import {
    AbstractMessagingChannel,
    isIncomingMessage,
    Message,
    MessagingProtocol,
    OutgoingMessage,
    Role,
} from "messaging-channels";
import {
    MessageService__Consumer,
    MessageService__Producer,
} from "@cross-lab-project/soa-service-message";

export class CrosslabMessagingChannel<
    MP extends MessagingProtocol | undefined = undefined,
    R extends Role<MP> | undefined = undefined,
> extends AbstractMessagingChannel<MP, R> {
    private _deviceHandler: DeviceHandler;
    private _messageServiceConsumer: MessageService__Consumer;
    private _messageServiceProducer: MessageService__Producer;

    constructor(
        options: { endpoint: string; id: string; token: string },
        protocol: MP,
        role: R,
    ) {
        super({ protocol, role });
        this._deviceHandler = new DeviceHandler();
        this._messageServiceConsumer = new MessageService__Consumer("incoming");
        this._messageServiceProducer = new MessageService__Producer("outgoing");

        this._messageServiceConsumer.on("message", (event) => {
            const message: Message = {
                type: event.message_type,
                content: event.message,
            };

            if (!isIncomingMessage(protocol, role, message)) {
                throw new Error("invalid message format!");
            }

            this.emit("message", message);
        });

        this._deviceHandler.on("experimentStatusChanged", (event) => {
            if (event.status === "running") this.emit("ready");
            else if (event.status === "finished") this.emit("close");
        });

        this._deviceHandler.addService(this._messageServiceConsumer);
        this._deviceHandler.addService(this._messageServiceProducer);

        this._deviceHandler.connect(options);
    }

    async send(message: OutgoingMessage<MP, R>): Promise<void> {
        await this._messageServiceProducer.sendMessage(
            message.content,
            message.type,
        );
    }
}
