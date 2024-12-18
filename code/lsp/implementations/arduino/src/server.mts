import express from "express";
import { Configuration } from "./configuration.mjs";
import { ArduinoCliLanguageServerInstance } from "./instance.mjs";

export class ArduinoCliLanguageServer {
  start(configuration: Configuration): void {
    const app = express();

    app.post("/", async (req, res) => {
      const instanceUrl = req.query.instanceUrl;
      const deviceToken = req.query.deviceToken;

      if (typeof instanceUrl !== "string") {
        throw new Error(
          `Expected parameter "instanceUrl" to be of type "string" instead got "${typeof instanceUrl}"`
        );
      }

      if (typeof deviceToken !== "string") {
        throw new Error(
          `Expected parameter "instanceUrl" to be of type "string" instead got "${typeof instanceUrl}"`
        );
      }

      const instance = new ArduinoCliLanguageServerInstance(
        instanceUrl,
        deviceToken
      );

      try {
        await instance.connect();
      } catch (error) {
        return res.status(400).send();
      }

      return res.status(201).send();
    });

    app.listen(configuration.PORT, () => {
      console.log(
        `Arduino-cli language server listening on port ${configuration.PORT}`
      );
    });
  }
}
