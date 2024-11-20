import { getDeviceUrl } from "../helper/index.js";
import collaboration from "./collaboration.js";
import filesystemOnly from "./filesystem-only.js";
import simulation from "./simulation.js";

const urls = await Promise.all([
  getDeviceUrl("code-editor"),
  getDeviceUrl("compiler"),
  getDeviceUrl("debugger"),
  getDeviceUrl("language-server"),
  getDeviceUrl("simulation"),
  getDeviceUrl("vpspu"),
]);

const deviceUrls = {
  "code-editor": urls[0],
  compiler: urls[1],
  debugger: urls[2],
  languageServer: urls[3],
  simulation: urls[4],
  vpspu: urls[5],
};

export const templates = [
  filesystemOnly(deviceUrls),
  collaboration(deviceUrls),
  simulation(deviceUrls),
];
