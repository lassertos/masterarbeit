import { ServiceConfiguration } from "./deviceMessages.js";
import { PeerConnection } from "./peer/connection.js";

export type ServiceDirection = "consumer" | "producer" | "prosumer";
export const Consumer: ServiceDirection = "consumer";
export const Producer: ServiceDirection = "producer";
export const Prosumer: ServiceDirection = "prosumer";
export { ServiceConfiguration };

export interface Service<T extends string = string> {
  getMeta: () => {
    serviceId: string;
    serviceType: T;
    serviceDirection: ServiceDirection;
    supportedConnectionTypes: string[];
  };
  serviceType: T;
  serviceId: string;
  serviceDirection: ServiceDirection;
  setupConnection(
    connection: PeerConnection,
    serviceConfig: ServiceConfiguration
  ): void;
}
