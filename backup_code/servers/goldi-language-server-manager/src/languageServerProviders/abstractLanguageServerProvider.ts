import { JSONSchemaType } from "ajv";
import { AbstractLanguageServerInstance } from "./abstractLanguageServerInstance";
import { ConnectionOptions } from "../connectionOptions";

export type LanguageServerProviderDescription<T = unknown> = {
  id: string;
  availableInstanceOptions: JSONSchemaType<T>;
};

export abstract class AbstractLanguageServerProvider<T = unknown> {
  abstract _id: string;
  abstract _availableInstanceOptions: JSONSchemaType<T>;

  public getDescription(): LanguageServerProviderDescription<T> {
    return {
      id: this._id,
      availableInstanceOptions: this._availableInstanceOptions,
    };
  }

  public abstract createInstance(options: {
    connection: ConnectionOptions;
    instance: T;
  }): AbstractLanguageServerInstance<T>;
}
