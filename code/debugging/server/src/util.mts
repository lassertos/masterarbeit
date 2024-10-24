import net from "net";

export async function getFreePort(options?: {
  start?: number;
  end?: number;
}): Promise<number> {
  let start = options?.start ?? 0;
  const end = options?.end ?? 0;

  return new Promise((resolve) => {
    let port: number | undefined = undefined;

    while (!port && start <= end) {
      const srv = net.createServer();

      srv.listen(start, () => {
        const address = srv.address();
        port =
          address && typeof address !== "string" ? address.port : undefined;

        if (!port) {
          throw new Error("No free port found!");
        }

        srv.close(() => {
          if (port) {
            resolve(port);
          }
        });
      });

      start++;
    }
  });
}
