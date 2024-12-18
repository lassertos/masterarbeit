import {
  DebugAdapterProtocol,
  isDebugAdapterProtocolType,
} from "@crosslab-ide/crosslab-debugging-adapter-service";
import { TypedEmitter } from "tiny-typed-emitter";

interface DebugAdapterProtocolHandlerEvents {
  "incoming-message": (message: DebugAdapterProtocol.ProtocolMessage) => void;
  "outgoing-message": (
    sessionId: string,
    consumerId: string,
    message: DebugAdapterProtocol.ProtocolMessage
  ) => void;
  joinable: () => void;
  restart: (message: DebugAdapterProtocol.ProtocolMessage) => void;
}

type SessionInfo = {
  id: string;
  consumerId: string;
  sequenceNumber: number;
  requests: Map<number, DebugAdapterProtocol.Request>;
  breakpoints: DebugAdapterProtocol.Breakpoint[];
  configurationDone: boolean;
};

export class DebugAdapterProtocolHandler extends TypedEmitter<DebugAdapterProtocolHandlerEvents> {
  private _sessions: Map<string, SessionInfo> = new Map();
  private _sessionId: string;
  private _consumerId: string;
  private _requestSequenceNumberMap: Map<
    number,
    {
      sessionId: string;
      sequenceNumber: number;
    }
  > = new Map();
  private _bufferedEvents: DebugAdapterProtocol.Event[] = [];
  private _initializationResponse?: DebugAdapterProtocol.InitializeResponse;

  constructor(sessionId: string, consumerId: string) {
    super();
    this._sessionId = sessionId;
    this._consumerId = consumerId;
    this.addSubSession(sessionId, consumerId);
  }

  addSubSession(sessionId: string, consumerId: string) {
    const session = {
      id: sessionId,
      consumerId,
      sequenceNumber: 1,
      requests: new Map(),
      breakpoints: [],
      configurationDone: false,
    };
    this._sessions.set(sessionId, session);
    return session;
  }

  handleIncomingMessage(
    sessionId: string,
    message: DebugAdapterProtocol.ProtocolMessage
  ) {
    switch (message.type) {
      case "request":
        if (!isDebugAdapterProtocolType("Request", message)) {
          throw new Error(`Message is not a valid request!`);
        }
        return this._handleRequest(sessionId, message);
      default:
        throw new Error(
          `Cannot handle incoming message of type "${message.type}"!`
        );
    }
  }

  handleOutgoingMessage(message: DebugAdapterProtocol.ProtocolMessage) {
    switch (message.type) {
      case "event":
        if (!isDebugAdapterProtocolType("Event", message)) {
          throw new Error(`Message is not a valid event!`);
        }
        return this._handleEvent(message);
      case "response":
        if (!isDebugAdapterProtocolType("Response", message)) {
          throw new Error(`Message is not a valid response!`);
        }
        return this._handleResponse(message);
      default:
        throw new Error(
          `Cannot handle outgoing message of type "${message.type}"!`
        );
    }
  }

  // #region Event Handling

  private _handleEvent(message: DebugAdapterProtocol.Event) {
    this._bufferedEvents.push(message);

    if (isDebugAdapterProtocolType("BreakpointEvent", message)) {
      return this._handleBreakpointEvent(message);
    }

    for (const session of this._sessions.values()) {
      this.emit("outgoing-message", session.id, session.consumerId, {
        ...message,
        seq: session.sequenceNumber++,
      });
    }
  }

  // TODO: better equality check
  private _handleBreakpointEvent(
    message: DebugAdapterProtocol.BreakpointEvent
  ) {
    for (const session of this._sessions.values()) {
      let reason = message.body.reason;
      const breakpoint = message.body.breakpoint;
      const breakpointExists = session.breakpoints.find(
        (b) => b.id === breakpoint.id
      );

      if (reason === "changed" && !breakpointExists) {
        reason = "new";
      }

      if (
        breakpoint.source?.path &&
        !breakpoint.source.path.startsWith("crosslabfs:/workspace")
      ) {
        breakpoint.source.path = `crosslab-remote:${breakpoint.source.path}`;
      }

      const breakpointEvent: DebugAdapterProtocol.BreakpointEvent = {
        ...message,
        body: { ...message.body, reason },
      };

      this.emit(
        "outgoing-message",
        session.id,
        session.consumerId,
        breakpointEvent
      );
    }
  }

  // #endregion

  // #region Request Handling

  private _handleRequest(
    sessionId: string,
    message: DebugAdapterProtocol.Request
  ) {
    const session = this._sessions.get(sessionId);
    console.log(
      "SESSION REQUEST:",
      session?.id,
      session?.sequenceNumber,
      JSON.stringify(message)
    );

    if (!session) {
      console.error(`Could not find session with id "${sessionId}"!`);
      return;
    }

    session.requests.set(message.seq, message);

    // handle requests not forwarded to debug adapter

    if (
      sessionId !== this._sessionId &&
      isDebugAdapterProtocolType("InitializeRequest", message)
    ) {
      return this._handleInitializeRequestSubSession(session, message);
    }

    if (
      sessionId !== this._sessionId &&
      isDebugAdapterProtocolType("AttachRequest", message)
    ) {
      return this._handleAttachRequestSubSession(session, message);
    }

    if (
      sessionId !== this._sessionId &&
      isDebugAdapterProtocolType("DisconnectRequest", message)
    ) {
      return this._handleDisconnectRequestSubSession(session, message);
    }

    if (
      sessionId !== this._sessionId &&
      isDebugAdapterProtocolType("TerminateRequest", message)
    ) {
      return this._handleTerminateRequestSubSession(session, message);
    }

    if (
      sessionId !== this._sessionId &&
      isDebugAdapterProtocolType("ConfigurationDoneRequest", message)
    ) {
      return this._handleConfigurationDoneRequestSubSession(session, message);
    }

    // handle requests forwarded to debug adapter

    console.log(
      "Setting request sequence number mapping:",
      this._requestSequenceNumberMap.size + 1,
      sessionId,
      message.seq
    );

    this._requestSequenceNumberMap.set(
      this._requestSequenceNumberMap.size + 1,
      {
        sessionId,
        sequenceNumber: message.seq,
      }
    );

    const request: DebugAdapterProtocol.Request = {
      ...message,
      seq: this._requestSequenceNumberMap.size,
    };

    if (isDebugAdapterProtocolType("SetBreakpointsRequest", request)) {
      return this._handleSetBreakpointsRequest(session, request);
    }

    this.emit("incoming-message", request);
  }

  private _handleSetBreakpointsRequest(
    session: SessionInfo,
    message: DebugAdapterProtocol.SetBreakpointsRequest
  ) {
    const sessions = this._sessions.values();

    let breakpoints: DebugAdapterProtocol.SourceBreakpoint[] = [
      ...(message.arguments.breakpoints ?? []),
    ];

    if (!session.configurationDone) {
      breakpoints = [
        ...breakpoints,
        ...sessions
          .flatMap((session) => session.breakpoints)
          .filter(
            (breakpoint) =>
              breakpoint.source?.path === message.arguments.source.path
          )
          .filter((breakpoint) =>
            isDebugAdapterProtocolType("SourceBreakpoint", breakpoint)
          ),
      ].filter(
        (breakpoint, index, array) =>
          array.findIndex(
            (b) => b.column === breakpoint.column && b.line === breakpoint.line
          ) === index
      );
    }

    console.log("breakpoints:", breakpoints);

    const setBreakpointsRequest: DebugAdapterProtocol.SetBreakpointsRequest = {
      ...message,
      arguments: {
        ...message.arguments,
        breakpoints,
      },
    };

    this.emit("incoming-message", setBreakpointsRequest);
  }

  private _handleInitializeRequestSubSession(
    session: SessionInfo,
    message: DebugAdapterProtocol.InitializeRequest
  ) {
    if (!this._initializationResponse) {
      console.error(
        `Sub-session "${session.id}" of session "${this._sessionId}" tried to send initialize request while main session was not initialized!`
      );
      return;
    }

    const initializationResponse: DebugAdapterProtocol.InitializeResponse = {
      ...this._initializationResponse,
      request_seq: message.seq,
      seq: session.sequenceNumber++,
    };

    this.emit(
      "outgoing-message",
      session.id,
      session.consumerId,
      initializationResponse
    );

    for (const event of this._bufferedEvents) {
      this.emit("outgoing-message", session.id, session.consumerId, {
        ...event,
        seq: session.sequenceNumber++,
      });
    }
  }

  private _handleAttachRequestSubSession(
    session: SessionInfo,
    message: DebugAdapterProtocol.AttachRequest
  ) {
    const attachResponse: DebugAdapterProtocol.AttachResponse = {
      type: "response",
      command: "attach",
      request_seq: message.seq,
      seq: session.sequenceNumber++,
      success: true,
    };

    this.emit(
      "outgoing-message",
      session.id,
      session.consumerId,
      attachResponse
    );
  }

  private _handleDisconnectRequestSubSession(
    session: SessionInfo,
    message: DebugAdapterProtocol.DisconnectRequest
  ) {
    const disconnectResponse: DebugAdapterProtocol.DisconnectResponse = {
      type: "response",
      command: "disconnect",
      request_seq: message.seq,
      seq: session.sequenceNumber++,
      success: true,
    };

    this.emit(
      "outgoing-message",
      session.id,
      session.consumerId,
      disconnectResponse
    );
  }

  private _handleTerminateRequestSubSession(
    session: SessionInfo,
    message: DebugAdapterProtocol.TerminateRequest
  ) {
    const terminateResponse: DebugAdapterProtocol.TerminateResponse = {
      type: "response",
      command: "terminate",
      request_seq: message.seq,
      seq: session.sequenceNumber++,
      success: true,
    };

    this.emit(
      "outgoing-message",
      session.id,
      session.consumerId,
      terminateResponse
    );
  }

  private _handleConfigurationDoneRequestSubSession(
    session: SessionInfo,
    message: DebugAdapterProtocol.ConfigurationDoneRequest
  ) {
    console.log("Configuration done:", session.id);

    const breakpoints = this._sessions
      .values()
      .flatMap((session) => session.breakpoints);

    for (const breakpoint of breakpoints) {
      if (session.breakpoints.find((b) => b.id === breakpoint.id)) {
        continue;
      }

      const breakpointEvent: DebugAdapterProtocol.BreakpointEvent = {
        type: "event",
        event: "breakpoint",
        body: {
          reason: "new",
          breakpoint: {
            ...breakpoint,
          },
        },
        seq: session.sequenceNumber++,
      };

      this.emit(
        "outgoing-message",
        session.id,
        session.consumerId,
        breakpointEvent
      );
    }

    session.configurationDone = true;

    const configurationDoneResponse: DebugAdapterProtocol.ConfigurationDoneResponse =
      {
        type: "response",
        command: "configurationDone",
        request_seq: message.seq,
        seq: session.sequenceNumber++,
        success: true,
      };

    this.emit(
      "outgoing-message",
      session.id,
      session.consumerId,
      configurationDoneResponse
    );
  }

  // #endregion

  // #region Response Handling

  private _handleResponse(message: DebugAdapterProtocol.Response) {
    const requestMapping = this._requestSequenceNumberMap.get(
      message.request_seq
    );

    if (!requestMapping) {
      console.error(
        `Could not map response for request with sequence number ${message.request_seq}!`
      );
      return;
    }

    const session = this._sessions.get(requestMapping.sessionId);
    console.log(
      "SESSION RESPONSE:",
      session?.id,
      session?.sequenceNumber,
      JSON.stringify(message)
    );

    if (!session) {
      console.error(
        `Could not find sub-session with id "${requestMapping.sessionId}" of session with id "${this._sessionId}"`
      );
      return;
    }

    const response: DebugAdapterProtocol.Response = {
      ...message,
      request_seq: requestMapping.sequenceNumber,
      seq: session.sequenceNumber++,
    };

    if (isDebugAdapterProtocolType("InitializeResponse", response)) {
      return this._handleInitializeResponse(session, response);
    }

    if (isDebugAdapterProtocolType("ContinueResponse", response)) {
      return this._handleContinueResponse(session, response);
    }

    if (isDebugAdapterProtocolType("NextResponse", response)) {
      return this._handleNextResponse(session, response);
    }

    if (isDebugAdapterProtocolType("StepInResponse", response)) {
      return this._handleStepInResponse(session, response);
    }

    if (isDebugAdapterProtocolType("StepOutResponse", response)) {
      return this._handleStepOutResponse(session, response);
    }

    if (isDebugAdapterProtocolType("SetBreakpointsResponse", response)) {
      return this._handleSetBreakpointsResponse(session, response);
    }

    if (isDebugAdapterProtocolType("ConfigurationDoneResponse", response)) {
      return this._handleConfigurationDoneResponse(session, response);
    }

    if (isDebugAdapterProtocolType("DisconnectResponse", response)) {
      return this._handleDisconnectResponse(session, response);
    }

    if (isDebugAdapterProtocolType("TerminateResponse", response)) {
      return this._handleTerminateResponse(session, response);
    }

    if (isDebugAdapterProtocolType("StackTraceResponse", response)) {
      return this._handleStackTraceResponse(session, response);
    }

    this.emit(
      "outgoing-message",
      requestMapping.sessionId,
      session.consumerId,
      response
    );
  }

  private _handleInitializeResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.InitializeResponse
  ) {
    this._initializationResponse = message;
    this.emit("outgoing-message", session.id, session.consumerId, {
      ...message,
      seq: session.sequenceNumber++,
    });
    this.emit("joinable");
  }

  private _handleContinueResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.ContinueResponse
  ) {
    const request = session.requests.get(message.request_seq);

    if (!request) {
      console.error(
        `Could not find request "${message.request_seq}" for session "${session.id}"`
      );
      return;
    }

    if (!isDebugAdapterProtocolType("ContinueRequest", request)) {
      console.error(
        `Request "${message.request_seq}" of session "${session.id}" is not a "continue" request!`
      );
      return;
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);

    for (const s of this._sessions.values()) {
      if (s.id === session.id) {
        continue;
      }

      const event: DebugAdapterProtocol.ContinuedEvent = {
        type: "event",
        event: "continued",
        body: {
          threadId: request.arguments.threadId,
          allThreadsContinued: message.body.allThreadsContinued,
        },
        seq: s.sequenceNumber++,
      };

      this.emit("outgoing-message", s.id, s.consumerId, event);
    }
  }

  private _handleNextResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.NextResponse
  ) {
    const request = session.requests.get(message.request_seq);

    if (!request) {
      console.error(
        `Could not find request "${message.request_seq}" for session "${session.id}"`
      );
      return;
    }

    if (!isDebugAdapterProtocolType("NextRequest", request)) {
      console.error(
        `Request "${message.request_seq}" of session "${session.id}" is not a "next" request!`
      );
      return;
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);

    for (const s of this._sessions.values()) {
      if (s.id === session.id) {
        continue;
      }

      const event: DebugAdapterProtocol.ContinuedEvent = {
        type: "event",
        event: "continued",
        body: {
          threadId: request.arguments.threadId,
        },
        seq: s.sequenceNumber++,
      };

      this.emit("outgoing-message", s.id, s.consumerId, event);
    }
  }

  private _handleStepInResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.StepInResponse
  ) {
    const request = session.requests.get(message.request_seq);

    if (!request) {
      console.error(
        `Could not find request "${message.request_seq}" for session "${session.id}"`
      );
      return;
    }

    if (!isDebugAdapterProtocolType("StepInRequest", request)) {
      console.error(
        `Request "${message.request_seq}" of session "${session.id}" is not a "stepIn" request!`
      );
      return;
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);

    for (const s of this._sessions.values()) {
      if (s.id === session.id) {
        continue;
      }

      const event: DebugAdapterProtocol.ContinuedEvent = {
        type: "event",
        event: "continued",
        body: {
          threadId: request.arguments.threadId,
        },
        seq: s.sequenceNumber++,
      };

      this.emit("outgoing-message", s.id, s.consumerId, event);
    }
  }

  private _handleStepOutResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.StepOutResponse
  ) {
    const request = session.requests.get(message.request_seq);

    if (!request) {
      console.error(
        `Could not find request "${message.request_seq}" for session "${session.id}"`
      );
      return;
    }

    if (!isDebugAdapterProtocolType("StepOutRequest", request)) {
      console.error(
        `Request "${message.request_seq}" of session "${session.id}" is not a "stepOut" request!`
      );
      return;
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);

    for (const s of this._sessions.values()) {
      if (s.id === session.id) {
        continue;
      }

      const event: DebugAdapterProtocol.ContinuedEvent = {
        type: "event",
        event: "continued",
        body: {
          threadId: request.arguments.threadId,
        },
        seq: s.sequenceNumber++,
      };

      this.emit("outgoing-message", s.id, s.consumerId, event);
    }
  }

  private _handleSetBreakpointsResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.SetBreakpointsResponse
  ) {
    const request = session.requests.get(message.request_seq);

    if (!request) {
      console.error(
        `Could not find request "${message.request_seq}" for session "${session.id}"`
      );
      return;
    }

    if (!isDebugAdapterProtocolType("SetBreakpointsRequest", request)) {
      console.error(
        `Request "${message.request_seq}" of session "${session.id}" is not a "setBreakpoints" request!`
      );
      return;
    }

    for (const breakpoint of message.body.breakpoints) {
      if (
        !breakpoint.source?.path ||
        breakpoint.source.path.startsWith("crosslabfs:/workspace")
      ) {
        continue;
      }

      breakpoint.source.path = `crosslab-remote:${breakpoint.source.path}`;
    }

    for (const s of this._sessions.values()) {
      s.breakpoints = [
        ...s.breakpoints.filter(
          (breakpoint) =>
            !isDebugAdapterProtocolType("SourceBreakpoint", breakpoint) ||
            breakpoint.source?.path !== request.arguments.source.path
        ),
        ...message.body.breakpoints,
      ];
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);
  }

  private _handleConfigurationDoneResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.ConfigurationDoneResponse
  ) {
    console.log("Configuration done:", session);

    session.configurationDone = true;

    this.emit("outgoing-message", session.id, session.consumerId, message);
  }

  private _handleDisconnectResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.DisconnectResponse
  ) {
    const request = session.requests.get(message.request_seq);

    if (!request) {
      console.error(
        `Could not find request "${message.request_seq}" for session "${session.id}"`
      );
      return;
    }

    if (!isDebugAdapterProtocolType("DisconnectRequest", request)) {
      console.error(
        `Request "${message.request_seq}" of session "${session.id}" is not a "disconnect" request!`
      );
      return;
    }

    for (const s of this._sessions.values()) {
      if (s.id === session.id) {
        continue;
      }

      const terminatedEvent: DebugAdapterProtocol.TerminatedEvent = {
        type: "event",
        event: "terminated",
        seq: s.sequenceNumber++,
      };

      this.emit("outgoing-message", s.id, s.consumerId, terminatedEvent);
    }

    if (request.arguments?.restart) {
      this._requestSequenceNumberMap.clear();
      this._sessions.clear();
      this._bufferedEvents = [];
      this._initializationResponse = undefined;
      this.addSubSession(this._sessionId, this._consumerId);
      return this.emit("restart", message);
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);
  }

  private _handleTerminateResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.TerminateResponse
  ) {
    for (const s of this._sessions.values()) {
      if (s.id === session.id) {
        continue;
      }

      const terminatedEvent: DebugAdapterProtocol.TerminatedEvent = {
        type: "event",
        event: "terminated",
        seq: s.sequenceNumber++,
      };

      this.emit("outgoing-message", s.id, s.consumerId, terminatedEvent);
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);
  }

  private _handleStackTraceResponse(
    session: SessionInfo,
    message: DebugAdapterProtocol.StackTraceResponse
  ) {
    for (const stackFrame of message.body.stackFrames) {
      if (
        !stackFrame.source?.path ||
        stackFrame.source.path.startsWith("crosslabfs:/workspace")
      ) {
        continue;
      }

      stackFrame.source.path = `crosslab-remote:${stackFrame.source.path}`;
    }

    this.emit("outgoing-message", session.id, session.consumerId, message);
  }

  // #endregion
}
