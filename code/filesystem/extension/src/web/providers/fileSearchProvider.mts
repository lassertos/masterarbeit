import {
  CancellationToken,
  FileSearchOptions,
  FileSearchProvider,
  FileSearchQuery,
  Uri,
} from "vscode";
import Fuse from "fuse.js";
import { CrossLabFileSystemProvider } from "./fileSystemProvider.mjs";

export class CrossLabFileSearchProvider implements FileSearchProvider {
  private fs: CrossLabFileSystemProvider;

  constructor(fs: CrossLabFileSystemProvider) {
    this.fs = fs;
  }

  async provideFileSearchResults(
    query: FileSearchQuery,
    options: FileSearchOptions,
    token: CancellationToken
  ): Promise<Uri[]> {
    const fuse = new Fuse(
      (await this.fs.getAllFilePaths())
        .filter((path) =>
          path.startsWith(
            this.fs.currentProjectUri
              ? `${this.fs.currentProjectUri.path}/`
              : `/workspace/`
          )
        )
        .map((path) =>
          this.fs.currentProjectUri
            ? path.replace(`${this.fs.currentProjectUri.path}/`, "/workspace/")
            : path
        ),
      {
        ignoreLocation: true,
      }
    );

    const results = fuse.search(
      "/workspace/" + query.pattern,
      options.maxResults ? { limit: options.maxResults } : undefined
    );

    return results.map((path) =>
      Uri.from({ scheme: "crosslabfs", path: path.item })
    );
  }
}
