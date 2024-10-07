import { configuration } from "./configuration.mjs";
import { SimavrServer } from "./server.mjs";

const simavrServer = new SimavrServer();
simavrServer.start(configuration);
