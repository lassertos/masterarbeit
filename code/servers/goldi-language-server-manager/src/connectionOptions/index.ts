import { CrossLabConnectionOptions } from "./crossLabConnectionOptions";
import { WebSocketConnectionOptions } from "./webSocketConnectionOption";

export type ConnectionOptions =
  | WebSocketConnectionOptions
  | CrossLabConnectionOptions;
