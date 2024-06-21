import { JSONSchemaType } from "ajv";
import { AbstractLanguageServerInstance } from "../abstractLanguageServerInstance";
import { AbstractLanguageServerProvider } from "../abstractLanguageServerProvider";
import {
  AvrLanguageServerInstance,
  AvrLanguageServerInstanceOptions,
  AvrLanguageServerInstanceOptionsSchema,
} from "./languageServerInstance";
import { ConnectionOptions } from "../../connectionOptions";

export class AvrLanguageServerProvider extends AbstractLanguageServerProvider<AvrLanguageServerInstanceOptions> {
  _id: string = "avr";
  _availableInstanceOptions: JSONSchemaType<AvrLanguageServerInstanceOptions> =
    AvrLanguageServerInstanceOptionsSchema;

  public createInstance(options: {
    connection: ConnectionOptions;
    instance: AvrLanguageServerInstanceOptions;
  }): AbstractLanguageServerInstance<AvrLanguageServerInstanceOptions> {
    return new AvrLanguageServerInstance(options);
  }
}
