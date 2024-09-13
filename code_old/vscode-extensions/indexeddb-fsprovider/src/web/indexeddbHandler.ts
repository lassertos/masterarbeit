import { FileStat, FileType } from "vscode";

export class IndexedDBHandler {
  private _db: Promise<IDBDatabase>;
  private _entries: Map<string, FileType> = new Map();

  constructor() {
    const request = indexedDB.open("goldi2-filesystem");
    this._db = new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        request.result.createObjectStore("files");
      };
      request.onsuccess = async () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async initialize() {
    const entries: [string, FileType][] = await Promise.all(
      (
        await this.getAllKeys()
      ).map(async (key) => [key, (await this.read(key)).type])
    );
    this._entries = new Map(entries);
    if (!this.exists("/")) {
      await this.write("/", {
        ctime: Date.now(),
        mtime: Date.now(),
        size: 0,
        type: FileType.Directory,
      });
    }
  }

  async clear() {
    const db = await this._db;

    const request = db
      .transaction(["files"], "readwrite")
      .objectStore("files")
      .clear();

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        this._entries.clear();
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private formatPath(path: string) {
    if (path === "") {
      return "/";
    }
    if (path === "/") {
      return path;
    }
    if (path.endsWith("/")) {
      return path.slice(0, -1);
    }
    return path;
  }

  private async getAllKeys(): Promise<string[]> {
    const db = await this._db;

    const request = db
      .transaction(["files"], "readonly")
      .objectStore("files")
      .getAllKeys();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result.map((key) => key.toString()));
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllFiles() {
    const db = await this._db;
    const transaction = db.transaction(["files"], "readwrite");
    const objectStore = transaction.objectStore("files");
    const filePaths = this.getAllFilePaths();
    const filePromises = filePaths.map(
      (filePath) =>
        new Promise<{ path: string; file: FileStat & { data?: Uint8Array } }>(
          (resolve) => {
            const request = objectStore.get(filePath);

            request.onsuccess = () => {
              resolve({
                path: filePath,
                file: request.result,
              });
            };
          }
        )
    );

    return Promise.all(filePromises);
  }

  getAllFilePaths() {
    const entries = Array.from(this._entries.entries());
    const files = entries
      .filter((entry) => entry[1] === FileType.File)
      .map((entry) => entry[0]);
    return files;
  }

  getAllDirectoryPaths() {
    const entries = Array.from(this._entries.entries());
    const directories = entries
      .filter((entry) => entry[1] === FileType.Directory)
      .map((entry) => entry[0]);
    return directories;
  }

  getDirectoryEntries(
    path: string,
    pathOrName: "name" | "path" = "name"
  ): [string, FileType][] {
    const formattedPath = this.formatPath(path);
    const directoryPath = (formattedPath + "/").replace(/\/\//g, "/");

    const entries = Array.from(this._entries.entries()).filter(
      ([key]) =>
        key.startsWith(directoryPath) &&
        key.slice(directoryPath.length).indexOf("/") === -1 &&
        key !== path
    );

    if (pathOrName === "path") {
      return entries;
    }

    return entries.map((entry) => [
      entry[0].slice(directoryPath.length),
      entry[1],
    ]);
  }

  exists(path: string): boolean {
    const formattedPath = this.formatPath(path);
    return this._entries.has(formattedPath);
  }

  async read(path: string): Promise<FileStat & { data?: Uint8Array }> {
    const db = await this._db;
    const formattedPath = this.formatPath(path);

    const request = db
      .transaction(["files"], "readonly")
      .objectStore("files")
      .get(formattedPath);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async write(path: string, data: FileStat & { data?: Uint8Array }) {
    const db = await this._db;
    const formattedPath = this.formatPath(path);

    const request = db
      .transaction(["files"], "readwrite")
      .objectStore("files")
      .put(data, formattedPath);

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        this._entries.set(formattedPath, data.type);
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async writeData(path: string, data: Uint8Array) {
    const formattedPath = this.formatPath(path);

    const fileStat = this.exists(formattedPath)
      ? {
          ...(await this.read(formattedPath)),
          mtime: Date.now(),
          data,
        }
      : {
          ctime: Date.now(),
          mtime: Date.now(),
          size: 0,
          type: FileType.File,
        };

    await this.write(formattedPath, { ...fileStat, data });
  }

  async delete(path: string, recursive = true) {
    const db = await this._db;
    const fileStat = await this.read(path);

    if (fileStat.type === FileType.Directory && !recursive) {
      throw Error("cannot delete directory without recursive option set");
    }

    const toDelete = this._collectDelete(path);

    const transaction = db.transaction(["files"], "readwrite");
    const objectStore = transaction.objectStore("files");

    for (const path of toDelete) {
      objectStore.delete(path);
      this._entries.delete(path);
    }

    return new Promise<void>((resolve) => {
      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  private _collectDelete(path: string): string[] {
    const formattedPath = this.formatPath(path);
    const fileType = this._entries.get(formattedPath);
    const result = [formattedPath];

    if (fileType === FileType.Directory) {
      const toDelete = this.getDirectoryEntries(formattedPath, "path");
      for (const [path] of toDelete) {
        result.push(...this._collectDelete(path));
      }
    }

    return result;
  }

  async copy(source: string, destination: string) {
    const db = await this._db;
    const toCopy = await this._collectCopy(source, destination);

    const transaction = db.transaction(["files"], "readwrite");
    const objectStore = transaction.objectStore("files");

    for (const [destination, data] of toCopy) {
      objectStore.put(data, destination);
      this._entries.set(destination, data.type);
    }

    return new Promise<void>((resolve) => {
      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  private async _collectCopy(
    source: string,
    destination: string
  ): Promise<[string, FileStat & { data?: Uint8Array }][]> {
    const formattedSource = this.formatPath(source);
    const formattedDestination = this.formatPath(destination);
    const fileStat = await this.read(formattedSource);
    const result: [string, FileStat & { data?: Uint8Array }][] = [
      [formattedDestination, fileStat],
    ];

    if (fileStat.type === FileType.Directory) {
      const toCopy = this.getDirectoryEntries(formattedSource, "path").map(
        ([path]) => [path, path.replace(formattedSource, formattedDestination)]
      );
      for (const [source, destination] of toCopy) {
        result.push(...(await this._collectCopy(source, destination)));
      }
    }

    return result;
  }
}
