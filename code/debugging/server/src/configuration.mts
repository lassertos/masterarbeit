export type Configuration = {
  PORT: number;
};

function loadConfiguration(): Configuration {
  const PORT = parseInt(process.env["PORT"] ?? "3000");

  return { PORT };
}

export const configuration = loadConfiguration();
