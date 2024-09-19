import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CompilationService__Consumer } from "@crosslab-ide/crosslab-compilation-service";

export async function registerDeviceHandler() {
  const deviceHandler = new DeviceHandler();
  const compilationService__Consumer = new CompilationService__Consumer(
    "compilation"
  );

  compilationService__Consumer.on("compilation:initialize", () => {});
  compilationService__Consumer.on("compilation:result", () => {});

  deviceHandler.addService(compilationService__Consumer);
}
