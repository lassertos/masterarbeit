import { configuration } from "./configuration.mjs";
import { GdbDebuggingServer } from "./server.mjs";

const gdbDebuggingServer = new GdbDebuggingServer();
gdbDebuggingServer.start(configuration);
