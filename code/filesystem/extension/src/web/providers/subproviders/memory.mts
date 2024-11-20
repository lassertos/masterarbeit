/* Adapted from MemFS sample extension (https://github.com/microsoft/vscode-extension-samples/tree/main/fsprovider-sample) */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as vscode from "vscode";
import { CrossLabFileSystemSubProvider } from "./index.mjs";

export class File implements vscode.FileStat {
  type: vscode.FileType;
  ctime: number;
  mtime: number;
  size: number;

  name: string;
  data?: Uint8Array;

  constructor(name: string) {
    this.type = vscode.FileType.File;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = 0;
    this.name = name;
  }
}

export class Directory implements vscode.FileStat {
  type: vscode.FileType;
  ctime: number;
  mtime: number;
  size: number;

  name: string;
  entries: Map<string, File | Directory>;

  constructor(name: string) {
    this.type = vscode.FileType.Directory;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = 0;
    this.name = name;
    this.entries = new Map();
  }
}

export type Entry = File | Directory;

export class MemoryFileSystemProvider implements CrossLabFileSystemSubProvider {
  private _root = new Directory("");

  exists(uri: vscode.Uri): boolean {
    return !!this._lookup(uri, true);
  }

  // --- manage file metadata

  stat(uri: vscode.Uri): vscode.FileStat {
    return this._lookup(uri, false);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    const entry = this._lookupAsDirectory(uri, false);
    const result: [string, vscode.FileType][] = [];
    for (const [name, child] of entry.entries) {
      result.push([name, child.type]);
    }
    return result;
  }

  // --- manage file contents

  readFile(uri: vscode.Uri): Uint8Array {
    const data = this._lookupAsFile(uri, false).data;
    if (data) {
      return data;
    }
    throw vscode.FileSystemError.FileNotFound();
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options?: { create: boolean; overwrite: boolean }
  ): void {
    const basename = path.posix.basename(uri.path);
    const parent = this._lookupParentDirectory(uri);
    let entry = parent.entries.get(basename);
    if (entry instanceof Directory) {
      throw vscode.FileSystemError.FileIsADirectory(uri);
    }
    if (!entry && !options?.create) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    if (entry && options?.create && !options?.overwrite) {
      throw vscode.FileSystemError.FileExists(uri);
    }
    if (!entry) {
      entry = new File(basename);
      parent.entries.set(basename, entry);
    }
    entry.mtime = Date.now();
    entry.size = content.byteLength;
    entry.data = content;
  }

  // --- manage files/folders

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { overwrite: boolean }
  ): void {
    if (!options?.overwrite && this._lookup(newUri, true)) {
      throw vscode.FileSystemError.FileExists(newUri);
    }

    const entry = this._lookup(oldUri, false);
    const oldParent = this._lookupParentDirectory(oldUri);

    const newParent = this._lookupParentDirectory(newUri);
    const newName = path.posix.basename(newUri.path);

    oldParent.entries.delete(entry.name);
    entry.name = newName;
    newParent.entries.set(newName, entry);
  }

  delete(uri: vscode.Uri): void {
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    const basename = path.posix.basename(uri.path);
    const parent = this._lookupAsDirectory(dirname, false);
    if (!parent.entries.has(basename)) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    parent.entries.delete(basename);
    parent.mtime = Date.now();
    parent.size -= 1;
  }

  createDirectory(uri: vscode.Uri): void {
    const basename = path.posix.basename(uri.path);
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    const parent = this._lookupAsDirectory(dirname, false);

    const entry = new Directory(basename);
    parent.entries.set(entry.name, entry);
    parent.mtime = Date.now();
    parent.size += 1;
  }

  copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): void | Thenable<void> {
    if (!options?.overwrite && this._lookup(destination, true)) {
      throw vscode.FileSystemError.FileExists(destination);
    }

    const oldEntry = this._lookup(source, false);

    const newParent = this._lookupParentDirectory(destination);
    const newName = path.posix.basename(destination.path);

    const newEntry =
      oldEntry instanceof File ? new File(newName) : new Directory(newName);

    if (newEntry instanceof File && oldEntry instanceof File) {
      newEntry.data = oldEntry.data ? new Uint8Array(oldEntry.data) : undefined;
    } else if (newEntry instanceof Directory && oldEntry instanceof Directory) {
      for (const [name, entry] of oldEntry.entries) {
        this.copy(
          source.with({ path: path.join(source.path, name) }),
          destination.with({ path: path.join(destination.path, name) }),
          options
        );
      }
    }

    newParent.entries.set(newName, newEntry);
  }

  // --- lookup

  private _lookup(uri: vscode.Uri, silent: false): Entry;
  private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined;
  private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined {
    const parts = uri.path.split("/");
    let entry: Entry = this._root;
    for (const part of parts) {
      if (!part) {
        continue;
      }
      let child: Entry | undefined;
      if (entry instanceof Directory) {
        child = entry.entries.get(part);
      }
      if (!child) {
        if (!silent) {
          throw vscode.FileSystemError.FileNotFound(uri);
        } else {
          return undefined;
        }
      }
      entry = child;
    }
    console.log(uri, entry);
    return entry;
  }

  private _lookupAsDirectory(uri: vscode.Uri, silent: boolean): Directory {
    const entry = this._lookup(uri, silent);
    if (entry instanceof Directory) {
      return entry;
    }
    throw vscode.FileSystemError.FileNotADirectory(uri);
  }

  private _lookupAsFile(uri: vscode.Uri, silent: boolean): File {
    const entry = this._lookup(uri, silent);
    console.log(uri, entry);
    if (entry instanceof File) {
      return entry;
    }
    throw vscode.FileSystemError.FileIsADirectory(uri);
  }

  private _lookupParentDirectory(uri: vscode.Uri): Directory {
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    return this._lookupAsDirectory(dirname, false);
  }
}
