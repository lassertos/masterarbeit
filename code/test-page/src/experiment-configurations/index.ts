import { getDeviceUrl } from "../helper/index.js";
import filesystemOnly from "./filesystem-only.js";
import simulation from "./simulation.js";

const deviceUrls = {
  "code-editor": await getDeviceUrl("code-editor"),
  compiler: await getDeviceUrl("compiler"),
  languageServer: await getDeviceUrl("language-server"),
  simulation: await getDeviceUrl("simulation"),
  vpspu: await getDeviceUrl("vpspu"),
};

export const templates = [filesystemOnly(deviceUrls), simulation(deviceUrls)];
