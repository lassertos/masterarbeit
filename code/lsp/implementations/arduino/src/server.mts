import { ArduinoCliLanguageServerInstance } from "./instance.mjs";
import { Configuration } from "./configuration.mjs";
import { WebSocketServer } from "ws";

export class ArduinoCliCompilationServer {
  start(configuration: Configuration): void {
    const wss = new WebSocketServer({
      port: configuration.PORT,
    });

    wss.on("connection", (ws) => {
      const interval = setInterval(() => ws.ping(), 5000);
      ws.on("close", () => {
        clearInterval(interval);
      });
      new ArduinoCliLanguageServerInstance(ws);
    });

    console.log(
      `Arduino-cli compilation server listening on port ${configuration.PORT}`
    );
  }
}
