# VSCode CrossLab Filesystem Extension

The crosslab filesystem extension for vscode should offer the following functionality:

- It should implement the FileSystemProvider Interface for uris with the scheme "crosslabfs"
- It should support different means of saving data (indexeddb, localstorage, in-memory, ...)
- It should implement the FileSearchProvider interface for uris with the scheme "crosslabfs"
- It should implement the TextSearchProvider interface for uris with the scheme "crosslabfs"

Since vscode reloads on directory changes we need to trick vscode into believing we didn't change the folder. We achieve this by defining the folder "/workspace" as our default workspace folder. Every time we change our project we rewrite all requests in such a manner that they are rerouted to the corresponding project instead of the workspace folder.

The filesystem could implement a variety of subproviders which handle requests for specific paths. For example local projects could be saved under "/projects" in the indexeddb while collaborative shared projects could be saved under "/shared" in-memory. Here we need to see what happens if we e.g. have a indexeddb path containing an in-memory folder or file.
