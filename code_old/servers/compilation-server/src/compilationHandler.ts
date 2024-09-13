import { InstantiationRequest } from "./types.js";
import { config } from "./config.js";
import { AbstractMessagingChannel, IncomingMessage } from "messaging-channels";
import {
    Directory,
    compilationProtocol,
    CrosslabMessagingChannel,
} from "shared-library";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

export class CompilationHandler {
    private messagingChannel: AbstractMessagingChannel<
        typeof compilationProtocol,
        "server"
    >;

    private constructor(
        messagingChannel: AbstractMessagingChannel<
            typeof compilationProtocol,
            "server"
        >,
    ) {
        this.messagingChannel = messagingChannel;

        this.messagingChannel.on("message", (message) =>
            this.handleRequest(message),
        );
    }

    static async instantiate(data: InstantiationRequest) {
        const messagingChannel = new CrosslabMessagingChannel(
            {
                endpoint: config.WEBSOCKET_ENDPOINT,
                id: data.url,
                token: data.token,
            },
            compilationProtocol,
            "server",
        );

        const compilationHandler = new CompilationHandler(messagingChannel);

        return compilationHandler;
    }

    private async handleRequest(
        message: IncomingMessage<typeof compilationProtocol, "server">,
    ) {
        switch (message.type) {
            case "compilation:request":
                await this.compile(message.content.directory);
                break;
            default:
                await this.messagingChannel.send({
                    type: "compilation:response",
                    content: {
                        success: false,
                        message: `Unknown message type ${message.type}!`,
                    },
                });
        }
    }

    private async copyDirectoryContent(path: string, directory: Directory) {
        for (const entry of directory.content) {
            if (entry.type === "directory") {
                const directoryPath = `${path}/${entry.name}`;
                await fs.mkdir(directoryPath);
                await this.copyDirectoryContent(directoryPath, entry);
            } else {
                await fs.writeFile(`${path}/${entry.name}`, entry.content);
            }
        }
    }

    private async compile(directory: Directory) {
        console.log("compiling:", JSON.stringify(directory, null, 4));

        const path = `/tmp/${randomUUID()}`;
        await fs.mkdir(path);
        await this.copyDirectoryContent(path, directory);

        const avrGccResult = await new Promise<number>((resolve) => {
            const process = spawn(
                "avr-gcc",
                ["-Wall", "-Os", "-o", "main.elf", "main.c"],
                { cwd: path },
            );
            process.on("exit", (code) => {
                resolve(code ?? 1);
            });
        });
        if (avrGccResult !== 0)
            return this.messagingChannel.send({
                type: "compilation:response",
                content: {
                    success: false,
                    message: "Compilation failed!",
                },
            });

        const avrObjcopyResult = await new Promise<number>((resolve) => {
            const process = spawn(
                "avr-objcopy",
                [
                    "-j",
                    ".text",
                    "-j",
                    ".data",
                    "-O",
                    "ihex",
                    "main.elf",
                    "main.hex",
                ],
                { cwd: path },
            );
            process.on("exit", (code) => {
                resolve(code ?? 1);
            });
        });
        if (avrObjcopyResult !== 0)
            return this.messagingChannel.send({
                type: "compilation:response",
                content: {
                    success: false,
                    message: "Transformation to hex failed!",
                },
            });

        return this.messagingChannel.send({
            type: "compilation:response",
            content: {
                success: true,
                message: (await fs.readFile(`${path}/main.hex`)).toString(),
            },
        });
    }
}
