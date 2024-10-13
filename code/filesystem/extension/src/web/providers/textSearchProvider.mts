import * as vscode from "vscode";
import { CrossLabFileSystemProvider } from "./fileSystemProvider.mjs";

type FileData = { uri: vscode.Uri; content: string };

const SEARCH_ELIDED_PREFIX = "⟪ ";
const SEARCH_ELIDED_SUFFIX = " characters skipped ⟫";
const SEARCH_ELIDED_MIN_LEN =
  (SEARCH_ELIDED_PREFIX.length + SEARCH_ELIDED_SUFFIX.length + 5) * 2;

export class CrossLabTextSearchProvider implements vscode.TextSearchProvider {
  private fs: CrossLabFileSystemProvider;

  constructor(fs: CrossLabFileSystemProvider) {
    this.fs = fs;
  }

  async provideTextSearchResults(
    query: vscode.TextSearchQuery,
    options: vscode.TextSearchOptions,
    progress: vscode.Progress<vscode.TextSearchResult>,
    token: vscode.CancellationToken
  ): Promise<vscode.TextSearchComplete> {
    const files = (await this.fs.getAllFiles())
      .filter((file) =>
        file.path.startsWith(
          this.fs.currentProject
            ? `/projects/${this.fs.currentProject}/`
            : `/workspace/`
        )
      )
      .map((file) => {
        return {
          ...file,
          path: this.fs.currentProject
            ? file.path.replace(
                `/projects/${this.fs.currentProject}/`,
                "/workspace/"
              )
            : file.path,
        };
      })
      .map((file) => {
        return {
          uri: vscode.Uri.from({ scheme: "crosslabfs", path: file.path }),
          content: new TextDecoder().decode(file.file.data),
        };
      });

    const results = [];
    for (const file of files) {
      if (
        token.isCancellationRequested ||
        results.length === options.maxResults
      ) {
        break;
      }
      const matches = this._getMatches(file, query, progress, {
        ...options,
        maxResults: options.maxResults - results.length,
      });

      results.push(...matches);
    }

    return { limitHit: results.length === options.maxResults };
  }

  private _getMatches(
    file: FileData,
    query: vscode.TextSearchQuery,
    progress: vscode.Progress<vscode.TextSearchResult>,
    options: vscode.TextSearchOptions
  ) {
    const matches = [];
    const lines = file.content.split("\n");
    let cIndex = 0;
    for (const [index, line] of lines.entries()) {
      let flags = "g";
      if (!query.isCaseSensitive) {
        flags += "i";
      }
      const lineMatches = query.isRegExp
        ? Array.from(line.matchAll(new RegExp(query.pattern, flags)))
        : this._getLineMatches(
            line,
            query.pattern,
            query.isCaseSensitive ?? false
          );
      for (const match of lineMatches) {
        if (matches.length === options.maxResults) {
          break;
        }
        matches.push({
          start: { line: index, character: match.index },
          end: { line: index, character: match.index + query.pattern.length },
        });

        // -------------------

        if (options.previewOptions && options.previewOptions.matchLines === 1) {
          // 1 line preview requested
          let text = line;

          let result = "";
          let shift = 0;
          let lastEnd = 0;
          const leadingChars = Math.floor(
            options.previewOptions.charsPerLine / 5
          );
          const previewStart = Math.max(match.index - leadingChars, 0);
          const previewEnd = match.index + options.previewOptions.charsPerLine;
          if (previewStart > lastEnd + leadingChars + SEARCH_ELIDED_MIN_LEN) {
            const elision =
              SEARCH_ELIDED_PREFIX +
              (previewStart - lastEnd) +
              SEARCH_ELIDED_SUFFIX;
            result += elision + text.slice(previewStart, previewEnd);
            shift += previewStart - (lastEnd + elision.length);
          } else {
            result += text.slice(lastEnd, previewEnd);
          }

          progress.report({
            lineNumber: index,
            preview: {
              matches: new vscode.Range(
                new vscode.Position(0, match.index - shift),
                new vscode.Position(0, match.index + match[0].length - shift)
              ),
              text: result,
            },
            ranges: new vscode.Range(
              new vscode.Position(index, match.index),
              new vscode.Position(index, match.index + match[0].length)
            ),
            text: file.content,
            uri: file.uri,
          });
        } else {
          progress.report({
            lineNumber: index,
            preview: {
              matches: new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(0, match[0].length + 10)
              ),
              text: file.content.slice(
                match.index + cIndex,
                match.index + match[0].length + cIndex
              ),
            },
            ranges: new vscode.Range(
              new vscode.Position(index, match.index),
              new vscode.Position(index, match.index + match[0].length)
            ),
            text: file.content,
            uri: file.uri,
          });
        }

        // -------------------
      }
      cIndex += line.length + 1;
    }
    return matches;
  }

  private _getLineMatches(
    line: string,
    searchString: string,
    isCaseSensitive: boolean
  ) {
    if (searchString.length === 0) {
      return [];
    }
    let startIndex = 0;
    let index;
    let indices = [];
    if (!isCaseSensitive) {
      line = line.toLowerCase();
      searchString = searchString.toLowerCase();
    }
    while ((index = line.indexOf(searchString, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + searchString.length;
    }
    return indices.map((index) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      return { 0: line.slice(index, index + searchString.length), index };
    });
  }
}
