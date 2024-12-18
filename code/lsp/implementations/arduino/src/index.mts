import { configuration } from "./configuration.mjs";
import { ArduinoCliLanguageServer } from "./server.mjs";

const arduinoCliCompilationServer = new ArduinoCliLanguageServer();
arduinoCliCompilationServer.start(configuration);
