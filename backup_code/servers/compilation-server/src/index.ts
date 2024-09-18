import express from "express";
import { isInstantiationRequest } from "./types.js";
import bodyParser from "body-parser";
import { config } from "./config.js";
import { CompilationHandler } from "./compilationHandler.js";
import { DeviceHandler } from "@cross-lab-project/soa-client";
import {
    MessageService__Consumer,
    MessageService__Producer,
} from "@cross-lab-project/soa-service-message";
import { APIClient } from "@cross-lab-project/api-client";

async function startCompilationServer() {
    const app = express();

    app.use(bodyParser.json());

    const deviceHandler = new DeviceHandler();
    deviceHandler.addService(new MessageService__Consumer("incoming"));
    deviceHandler.addService(new MessageService__Producer("outgoing"));

    const apiClient = new APIClient(config.API_ENDPOINT);
    // TODO: change to token / ip based authentication
    await apiClient.login("compilation-server", "compilation-server");
    await apiClient.updateDevice(config.CLOUD_INSTANTIABLE_DEVICE_URL, {
        type: "cloud instantiable",
        services: deviceHandler.getServiceMeta(),
    });

    app.post("/", async (req, res) => {
        console.log("POST / called!");

        if (!isInstantiationRequest(req.body)) return res.status(400).send();
        await CompilationHandler.instantiate(req.body);

        console.log("POST / executed successfully!");

        res.status(200).send();
    });

    app.listen(config.PORT, () => {
        console.log(`Compilation Server listening on port ${config.PORT}`);
    });
}

startCompilationServer();
