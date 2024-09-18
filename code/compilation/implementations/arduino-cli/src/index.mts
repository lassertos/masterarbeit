import { configuration } from "./configuration.mjs";
import { ArduinoCliCompilationServer } from "./server.mjs";

const arduinoCliCompilationServer = new ArduinoCliCompilationServer();
arduinoCliCompilationServer.start(configuration);
