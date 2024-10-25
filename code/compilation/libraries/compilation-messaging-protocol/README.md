# Compilation Messaging Protocol

This library provides a way to create compilation protocols for the use with a `MessagingChannel`. The base protocol is defined for communication between a client and a server. The client sends a `compilation:request` message to the server which in turn responds with a `compilation:result` message. The basic form of these messages is as follows:

### `compilation:request`

```ts
type CompilationRequestMessage = {
  requestId: string;
  directory: Directory;
  format?: string;
};
```

### `compilation:result`

```ts
type CompilationResultMessage =
  | {
      requestId: string;
      success: true;
      message?: string;
      format?: string;
      result: File | Directory;
    }
  | {
      requestId: string;
      success: false;
      message?: string;
    };
```

However this library also allows to specify formats for the result.
