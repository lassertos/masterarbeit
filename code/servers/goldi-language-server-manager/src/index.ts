import express from "express";
import { LanguageServerManager } from "./languageServerManager";
import bodyParser from "body-parser";
import expressWs from "express-ws";
import { WebSocketRoomManager } from "./webSocketRoomManager";

const app = expressWs(express()).app;
const languageServerManager = new LanguageServerManager();
const webSocketRoomManager = new WebSocketRoomManager();

app.use(bodyParser.json());

app.get("/providers", function (_req, res) {
  res.status(200).send(languageServerManager.getProviders());
});

app.get("/providers/:id", function (req, res) {
  const provider = languageServerManager.getProvider(req.params.id);
  if (!provider)
    return res
      .status(404)
      .send(`Provider with id "${req.params.id}" could not be found`);
  return res.status(200).send(provider);
});

app.post("/provider/:id", function (req, res) {
  languageServerManager.createInstance();
});

app.ws("/ws", function (ws, _req) {
  webSocketRoomManager.handleConnection(ws);
});

app.listen(3010);
