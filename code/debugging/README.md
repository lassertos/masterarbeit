# Debugging

- [Services](#services)
  - [Session Start](#session-start)
  - [Message Exchange](#message-exchange)
- [Server](#server)
  - [Start Debug Session](#start-debug-session)
- [Extension](#extension)

## Services

The debugging service is implemented in two parts: one consumer and one producer.

### Session Start

```mermaid
sequenceDiagram
    participant consumer
    participant producer

    consumer ->> producer : start new session
    producer ->> producer : emit "new-session" event
    producer ->> producer : await session start
    producer -->> consumer : session started
```

### Message Exchange

```mermaid
sequenceDiagram
    participant consumer
    participant producer

    consumer ->> producer : send debug adapter protocol message
    producer ->> producer : emit "message:dap" event
    producer -->> consumer : send debug adapter protocol message
    consumer ->> consumer : emit "message:dap" event
```

## Server

### Start Debug Session

```mermaid
sequenceDiagram
    participant Code Editor
    participant Debugger Instance
    participant Compiler Instance
    participant GDB
    participant Remote Target

    Code Editor ->> Debugger Instance : start new session
    Debugger Instance ->> Debugger Instance : recreate source directory structure
    Debugger Instance ->> Compiler Instance : send compilation request
    Compiler Instance ->> Compiler Instance : compile program
    Compiler Instance -->> Debugger Instance : send compilation response
    Debugger Instance ->> GDB : start gdb with corresponding source directory and target
    GDB ->> Remote Target : connect
```

## Extension
