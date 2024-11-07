import codeEditor from "./code-editor.js";
import compiler from "./compiler.js";
import gdbServer from "./gdb-server.js";
import languageServer from "./language-server.js";
import simulation from "./simulation.js";
import vpspu from "./vpspu.js";

export async function getDeviceUrl(
  device:
    | "code-editor"
    | "compiler"
    | "debugger"
    | "language-server"
    | "simulation"
    | "vpspu"
) {
  switch (device) {
    case "code-editor":
      return await codeEditor();
    case "compiler":
      return await compiler();
    case "debugger":
      return await gdbServer();
    case "language-server":
      return await languageServer();
    case "simulation":
      return await simulation();
    case "vpspu":
      return await vpspu();
  }
}
