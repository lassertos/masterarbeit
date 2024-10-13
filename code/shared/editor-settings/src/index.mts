export async function openSettingsDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open("crosslab-settings");
  return await new Promise<IDBDatabase>((resolve, reject) => {
    request.onupgradeneeded = () => {
      request.result.createObjectStore("settings");
    };
    request.onsuccess = async () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function writeSetting(
  db: IDBDatabase,
  setting: string,
  value: string
): Promise<void> {
  const request = db
    .transaction(["settings"], "readwrite")
    .objectStore("settings")
    .put(value, setting);

  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function readSetting(db: IDBDatabase, setting: string) {
  const request = db
    .transaction(["settings"], "readonly")
    .objectStore("settings")
    .get(setting);

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}
