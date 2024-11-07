import express from "express";
import { SimavrInstance } from "./instance.mjs";
import { Configuration } from "./configuration.mjs";

export class SimavrServer {
  start(configuration: Configuration): void {
    const app = express();

    app.post("/", async (req, res) => {
      const instanceUrl = req.query.instanceUrl;
      const deviceToken = req.query.deviceToken;

      console.log(`Instantiating a new simavr instance at "${instanceUrl}"!`);

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

      const instance = new SimavrInstance(instanceUrl, deviceToken);

      try {
        await instance.connect();
      } catch (error) {
        return res.status(400).send();
      }

      console.log(
        `Successfully instantiated a new simavr instance at "${instanceUrl}"!`
      );

      return res.status(201).send();
    });

    app.listen(configuration.PORT, () => {
      console.log(`Simavr server listening on port ${configuration.PORT}`);
    });
  }
}
