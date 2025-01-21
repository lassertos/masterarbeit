import { getDeviceUrl } from "../helper/index.js";
import collaborationMinimal from "./collaboration-minimal.js";
import collaborationCompilation from "./collaboration-compilation.js";
import filesystemOnly from "./filesystem-only.js";
import simulation from "./simulation.js";
import collaborationDebugging from "./collaboration-debugging.js";
import collaborationComplete from "./collaboration-complete.js";
import languageServer from "./language-server.js";

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
  "language-server": urls[3],
  simulation: urls[4],
  vpspu: urls[5],
};

export const templates = [
  filesystemOnly(deviceUrls),
  languageServer(deviceUrls),
  collaborationMinimal(deviceUrls),
  collaborationCompilation(deviceUrls),
  collaborationDebugging(deviceUrls),
  simulation(deviceUrls),
  collaborationComplete(deviceUrls),
];
