export type Configuration = {
  PORT: number;
  WEBSOCKET_ENDPOINT: string;
};

function loadConfiguration(): Configuration {
  const PORT = parseInt(process.env["PORT"] ?? "3023");
  const WEBSOCKET_ENDPOINT = process.env["WEBSOCKET_ENDPOINT"];

  if (!WEBSOCKET_ENDPOINT) {
    throw new Error('Environment variable "WEBSOCKET_ENDPOINT" is undefined!');
  }

  return { PORT, WEBSOCKET_ENDPOINT };
}

export const configuration = loadConfiguration();
