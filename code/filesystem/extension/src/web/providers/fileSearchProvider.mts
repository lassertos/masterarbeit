import {
  CancellationToken,
  FileSearchOptions,
  FileSearchProvider,
  FileSearchQuery,
  ProviderResult,
  Uri,
} from "vscode";
import Fuse from "fuse.js";
import { CrossLabFileSystemProvider } from "./fileSystemProvider.mjs";

export class CrossLabFileSearchProvider implements FileSearchProvider {
  private fs: CrossLabFileSystemProvider;

  constructor(fs: CrossLabFileSystemProvider) {
    this.fs = fs;
  }

  provideFileSearchResults(
    query: FileSearchQuery,
    options: FileSearchOptions,
    token: CancellationToken
  ): ProviderResult<Uri[]> {
    const fuse = new Fuse(
      this.fs
        .getAllFilePaths()
        .filter((path) =>
          path.startsWith(
            this.fs.currentProject
              ? `/projects/${this.fs.currentProject}/`
              : `/workspace/`
          )
        )
        .map((path) =>
          this.fs.currentProject
            ? path.replace(
                `/projects/${this.fs.currentProject}/`,
                "/workspace/"
              )
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
