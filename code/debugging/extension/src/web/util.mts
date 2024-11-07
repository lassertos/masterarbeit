import { Directory } from "@crosslab-ide/crosslab-debugging-adapter-service";

export function checkDirectory(directory: Directory) {
  for (const key in directory.content) {
    const entry = directory.content[key];
    if (entry.type === "file") {
      if (!(entry.content instanceof Uint8Array)) {
        throw new Error(`${key} is not a valid file!`);
      }
      console.log(`${key} is a valid file!`);
    }
    if (entry.type === "directory") {
      checkDirectory({ name: key, ...entry });
    }
  }
  console.log(`${directory.name} is a valid directory!`);
}

export function reviveDirectory(
  directory: Directory | Omit<Directory, "name">
): Directory | Omit<Directory, "name"> {
  for (const key in directory.content) {
    const entry = directory.content[key];
    if (entry.type === "file") {
      if (!(entry.content instanceof Uint8Array)) {
        directory.content[key].content = Uint8Array.from(
          Array.from(Object.values(entry.content))
        );
      }
    }
    if (entry.type === "directory") {
      directory.content[key] = reviveDirectory(entry);
    }
  }
  return directory;
}
