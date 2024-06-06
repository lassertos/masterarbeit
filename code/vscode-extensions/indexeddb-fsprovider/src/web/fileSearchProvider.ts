import {
  CancellationToken,
  FileSearchOptions,
  FileSearchProvider,
  FileSearchQuery,
  ProviderResult,
  Uri,
} from "vscode";
import Fuse from "fuse.js";
import { GOLDiFileSystemProvider } from "./fileSystemProvider";

export class GOLDiFileSearchProvider implements FileSearchProvider {
  private fs: GOLDiFileSystemProvider;

  constructor(fs: GOLDiFileSystemProvider) {
    this.fs = fs;
  }

  provideFileSearchResults(
    query: FileSearchQuery,
    options: FileSearchOptions,
    token: CancellationToken
  ): ProviderResult<Uri[]> {
    const fuse = new Fuse(this.fs.getAllFilePaths(), {
      ignoreLocation: true,
    });

    const results = fuse.search(
      query.pattern,
      options.maxResults ? { limit: options.maxResults } : undefined
    );

    return results.map((path) =>
      Uri.from({ scheme: "zenfs", path: path.item })
    );
  }
}
