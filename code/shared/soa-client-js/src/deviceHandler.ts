import WebSocket from "isomorphic-ws";
import { TypedEmitter } from "tiny-typed-emitter";

import {
  ClosePeerConnectionMessage,
  ConfigurationMessage,
  ConnectionStateChangedMessage,
  CreatePeerConnectionMessage,
  ExperimentStatusChangedMessage,
  SignalingMessage,
  isClosePeerConnectionMessage,
  isCommandMessage,
  isConfigurationMessage,
  isCreatePeerConnectionMessage,
  isExperimentStatusChangedMessage,
  isSignalingMessage,
} from "./deviceMessages.js";
import { crosslabTransport, logger } from "./logging.js";
import { PeerConnection } from "./peer/connection.js";
import { LocalPeerConnection } from "./peer/local-connection.js";
import { WebRTCPeerConnection } from "./peer/webrtc-connection.js";
import { WebSocketPeerConnection } from "./peer/websocket-connection.js";
import { Service } from "./service.js";

export interface DeviceHandlerEvents {
  connectionsChanged(): void;
  configuration(configuration: { [k: string]: unknown }): void;
  experimentStatusChanged(status: {
    status: "created" | "booked" | "setup" | "running" | "finished";
    message?: string;
  }): void;
}

export class DeviceHandler extends TypedEmitter<DeviceHandlerEvents> {
  ws!: WebSocket;
  bufferedLocalConnection?: CreatePeerConnectionMessage & {
    connectionType: "local";
  };
  connections = new Map<string, PeerConnection>();
  services = new Map<string, Service>();
  supportedConnectionTypes: string[] = ["webrtc"];

  async connect(connectOptions: {
    endpoint: string;
    id: string;
    token: string;
  }) {
    this.ws = new WebSocket(connectOptions.endpoint);

    this.ws.onopen = () => {
      this.ws.send(
        JSON.stringify({
          messageType: "authenticate",
          deviceUrl: connectOptions.id,
          token: connectOptions.token,
        })
      );
      crosslabTransport._set_upstream((info) =>
        this.ws.send(JSON.stringify({ messageType: "logging", content: info }))
      );
    };

    const p = new Promise<void>((resolve, reject) => {
      this.ws.onmessage = (authenticationEvent) => {
        const authenticationMessage = JSON.parse(
          authenticationEvent.data as string
        );
        if (authenticationMessage.messageType === "authenticate") {
          if (authenticationMessage.authenticated) {
            resolve();
          } else reject("Authentication failed");
        } else {
          reject(
            `Expected message with messageType 'authenticate', received ${authenticationMessage.messageType}`
          );
        }
      };
    });

    this.ws.onclose = (event) => {
      logger.log("info", "ws closed", {
        reason: event.reason,
        code: event.code,
      });
    };

    this.ws.onerror = (event) => {
      logger.log("error", event.message, {
        type: event.type,
        error: event.error,
      });
    };

    await p;

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string);
      console.log("soa-client: received message", message);

      if (isCommandMessage(message)) {
        if (isCreatePeerConnectionMessage(message)) {
          return this.handleCreatePeerConnectionMessage(message);
        } else if (isClosePeerConnectionMessage(message)) {
          return this.handleClosePeerConnectionMessage(message);
        }
      } else if (isSignalingMessage(message)) {
        return this.handleSignalingMessage(message);
      } else if (isConfigurationMessage(message)) {
        return this.handleConfigurationMessage(message);
      } else if (isExperimentStatusChangedMessage(message)) {
        return this.handleExperimentStatusChangedMessage(message);
      }

      console.log("soa-client: received unknown message", message);
    };
  }

  addService(service: Service) {
    this.services.set(service.serviceId, service);
    console.log(
      "soa-client: added service",
      service,
      Array.from(this.services.values())
    );
  }

  private handleCreatePeerConnectionMessage(
    message: CreatePeerConnectionMessage
  ) {
    console.log("soa-client: handling create peerconnection message", message);
    if (this.connections.has(message.connectionUrl)) {
      throw Error(
        "Can not create a connection. Connection Id is already present"
      );
    }

    if (message.connectionType === "local" && !this.bufferedLocalConnection) {
      this.bufferedLocalConnection = message;
      return;
    }

    //prettier-ignore
    const connection =
      message.connectionType === 'webrtc' ? 
        new WebRTCPeerConnection({
          ...message.connectionOptions,
          tiebreaker: message.tiebreaker,
        })
      : message.connectionType === 'websocket' ? 
        new WebSocketPeerConnection({
          url: message.connectionOptions.webSocketUrl,
          tiebreaker: message.tiebreaker,
        })
      : new LocalPeerConnection({
          deviceA: {
            tiebreaker: this.bufferedLocalConnection!.tiebreaker,
            services: this.bufferedLocalConnection!.services,
          },
          deviceB: { tiebreaker: message.tiebreaker, services: message.services },
        });

    const serviceConfigs =
      message.connectionType === "local"
        ? [
            ...(this.bufferedLocalConnection?.services ?? []),
            ...message.services,
          ]
        : message.services;

    if (message.connectionType === "local") {
      this.bufferedLocalConnection = undefined;
    }

    this.connections.set(message.connectionUrl, connection);
    console.log(
      "soa-client: attempting to set up connections",
      this.services,
      serviceConfigs
    );
    for (const serviceConfig of serviceConfigs) {
      const service = this.services.get(serviceConfig.serviceId);
      if (service === undefined) {
        throw Error("No Service for the service config was found");
      }
      service.setupConnection(connection, serviceConfig);
    }
    connection.on("signalingMessage", (msg) => {
      logger.log("info", "sending:", msg);
      this.ws.send(
        JSON.stringify({
          ...msg,
          messageType: "signaling",
          connectionUrl: message.connectionUrl,
        })
      );
    });
    connection.on("connectionChanged", () => {
      const connectionStateChangedMessage: ConnectionStateChangedMessage = {
        messageType: "connection-state-changed",
        status: connection.state,
        connectionUrl: message.connectionUrl,
      };
      this.ws.send(JSON.stringify(connectionStateChangedMessage));
      this.emit("connectionsChanged");
    });
    connection.connect();
    this.emit("connectionsChanged");
  }

  private handleSignalingMessage(message: SignalingMessage) {
    const connection = this.connections.get(message.connectionUrl);
    if (connection === undefined) {
      throw Error("No Connection for the signaling message was found");
    }
    connection.handleSignalingMessage(message);
  }

  private handleClosePeerConnectionMessage(
    message: ClosePeerConnectionMessage
  ) {
    const connection = this.connections.get(message.connectionUrl);
    if (!connection) {
      return;
      //throw Error("Cannot close a connection. Connection Id is not present");
    }
    logger.log("info", "closing connection", message);
    connection.teardown();
    this.connections.delete(message.connectionUrl);
  }

  private handleConfigurationMessage(message: ConfigurationMessage) {
    this.emit("configuration", message.configuration);
  }

  private handleExperimentStatusChangedMessage(
    message: ExperimentStatusChangedMessage
  ) {
    this.emit("experimentStatusChanged", {
      status: message.status,
      message: message.message,
    });
  }

  getServiceMeta() {
    return Array.from(this.services.values()).map((service) => {
      const meta = service.getMeta();
      return {
        ...meta,
        supportedConnectionTypes: meta.supportedConnectionTypes.filter(
          (supportedConnectionType) =>
            this.supportedConnectionTypes.includes(supportedConnectionType)
        ),
      };
    });
  }
}
