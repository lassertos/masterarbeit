import express from "express";
import bodyParser from "body-parser";
import { InviteInit, isInviteInit } from "./types.mjs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import {
  APIClient,
  ExperimentServiceTypes,
} from "@cross-lab-project/api-client";
import { configuration } from "./configuration.mjs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const application = express();
const invites: Map<string, InviteInit> = new Map();

application.use(bodyParser.json());

application.get("/", (req, res, next) => {
  return res.sendFile(path.join(__dirname, "web", "index.html"));
});

application.post("/invites", (req, res, next) => {
  const inviteInit = req.body;
  if (!isInviteInit(inviteInit)) {
    return res.status(400).send();
  }

  const id = uuidv4();

  invites.set(id, inviteInit);

  console.log(configuration.URL + `/invites/${id}`);

  return res.status(201).send(configuration.URL + `/invites/${id}`);
});

application.get("/invites/:id", async (req, res, next) => {
  console.log(req.url, req.params.id);
  const inviteInit = invites.get(req.params.id);

  if (!inviteInit) {
    console.log(`Could not find invite with id "${req.params.id}"!`);
    return res.status(404).send();
  }

  const apiClient = new APIClient(configuration.API_URL);

  await apiClient.login("admin", "admin");

  console.log(configuration.API_URL);
  console.log(inviteInit);
  const experiment = await apiClient.getExperiment(inviteInit.experiment);

  const id = uuidv4();

  const newRoles = inviteInit.devices
    .filter((device) => "basedOn" in device.role)
    .map((device) => {
      if ("basedOn" in device.role) {
        console.log(device.role);
        const basedOn = device.role.basedOn;
        console.log(basedOn);
        const basedOnRole = experiment.roles.find(
          (role) => role.name === basedOn
        );

        if (!basedOnRole) {
          throw new Error(
            `Experiment "${experiment.url}" does not contain a role "${basedOn}"`
          );
        }

        return { ...basedOnRole, name: `${basedOnRole.name}:${id}`, basedOn };
      }
    })
    .filter(
      (value, index, array) =>
        array.findIndex((role) => role?.name === value?.name) === index
    )
    .filter((value) => value !== undefined);

  const newDevices = inviteInit.devices.map((device) => {
    return {
      device: device.device,
      role:
        "existing" in device.role
          ? device.role.existing
          : `${device.role.basedOn}:${id}`,
    };
  });

  const newServiceConfigurations = experiment.serviceConfigurations
    .map((serviceConfiguration) => {
      if (
        !serviceConfiguration.participants?.find((participant) =>
          participant.role !== undefined
            ? newRoles.map((role) => role.basedOn).includes(participant.role)
            : false
        )
      ) {
        return;
      }

      return {
        serviceType: serviceConfiguration.serviceType,
        configuration: serviceConfiguration.configuration,
        participants: serviceConfiguration.participants.map((participant) => {
          if (
            participant.role === undefined ||
            !newRoles.map((role) => role.basedOn).includes(participant.role)
          ) {
            return participant;
          }

          const newRole = `${participant.role}:${id}`;

          return {
            ...participant,
            role: newRole,
          };
        }),
      } satisfies ExperimentServiceTypes.ServiceConfiguration<"request">;
    })
    .filter((serviceConfiguration) => serviceConfiguration !== undefined);

  console.log(experiment);

  console.log({
    devices: [...experiment.devices, ...newDevices],
    roles: [...experiment.roles, ...newRoles],
    serviceConfigurations: [
      ...experiment.serviceConfigurations,
      ...newServiceConfigurations,
    ],
  });

  const updatedExperiment = await apiClient.updateExperiment(
    inviteInit.experiment,
    {
      devices: [...experiment.devices, ...newDevices],
      roles: [...experiment.roles, ...newRoles],
      serviceConfigurations: [
        ...experiment.serviceConfigurations,
        ...newServiceConfigurations,
      ],
    }
  );

  fs.readFile(
    path.join(__dirname, "web", "index.html"),
    {
      encoding: "utf-8",
    },
    (err, data) => {
      if (err) {
        return res.status(500).send();
      }

      return res
        .status(200)
        .send(
          data.replace(
            "<test-page-application>",
            `<test-page-application experiment='${JSON.stringify(
              updatedExperiment
            )}'>`
          )
        );
    }
  );
});

application.use((req, res, next) => {
  let reqPath = req.path;

  console.log(
    `Received request with path: "${reqPath}", "${path.join(
      __dirname,
      reqPath
    )}"`
  );

  // make sure redirect occurs at mount
  if (!reqPath?.startsWith("/web/") && !reqPath?.startsWith("/invites/web/")) {
    return next();
  }

  if (reqPath.startsWith("/invites/web/")) {
    reqPath = reqPath.replace("/invites", "");
  }

  // We only answer to GET
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }

  const exists = fs.existsSync(path.join(__dirname, reqPath));

  if (!exists) {
    return next();
  }
  fs.readFile(
    path.join(__dirname, reqPath),
    { encoding: "utf-8" },
    (err, data) => {
      if (err) {
        return next();
      }

      console.log(configuration);
      data = data
        .replaceAll("{{URL}}", configuration.URL)
        .replaceAll("{{API_URL}}", configuration.API_URL)
        .replaceAll("{{CODE_EDITOR_URL}}", configuration.CODE_EDITOR_URL)
        .replaceAll("{{COMPILER_URL}}", configuration.COMPILER_URL)
        .replaceAll("{{DEBUGGER_URL}}", configuration.DEBUGGER_URL)
        .replaceAll(
          "{{LANGUAGE_SERVER_URL}}",
          configuration.LANGUAGE_SERVER_URL
        )
        .replaceAll("{{SIMULATION_URL}}", configuration.SIMULATION_URL)
        .replaceAll("{{VPSPU_URL}}", configuration.VPSPU_URL)
        .replaceAll("{{USERNAME}}", configuration.USERNAME)
        .replaceAll("{{PASSWORD}}", configuration.PASSWORD);

      // Setup mime type of the file
      res.setHeader(
        "content-type",
        reqPath.endsWith(".html")
          ? "text/html"
          : reqPath.endsWith("js")
          ? "text/javascript"
          : "text"
      );

      res.send(data);
    }
  );
});

application.listen(8081);
