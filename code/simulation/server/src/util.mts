import net from "net";

export async function getFreePort(options?: {
  start: number;
  end?: number;
}): Promise<number | null> {
  const start = options?.start;
  const end = options?.end;
  let port: number | undefined;

  if (start !== undefined) {
    port = start;

    while (true) {
      if (end && port > end) {
        return null;
      }

      if (await isPortFree(port)) {
        return port;
      }

      port++;
    }
  }

  return new Promise<number | null>((resolve) => {
    const srv = net.createServer();

    srv.listen(start, () => {
      const address = srv.address();
      port = address && typeof address !== "string" ? address.port : undefined;

      srv.close(() => (port ? resolve(port) : resolve(null)));
    });
  });
}

async function isPortFree(port: number) {
  return new Promise<boolean>((resolve, reject) => {
    const server = net.createServer();

    server.once("error", function (error) {
      if ("code" in error && error.code === "EADDRINUSE") {
        console.log(`Port ${port} is already in use!`);
        resolve(false);
      }
      reject(error);
    });

    server.once("listening", function () {
      // close the server if listening doesn't fail
      server.once("close", () => resolve(true)).close();
    });

    server.listen(port);
  });
}
