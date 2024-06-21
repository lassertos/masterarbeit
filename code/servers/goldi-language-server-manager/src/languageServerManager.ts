import {
  AbstractLanguageServerProvider,
  LanguageServerProviderDescription,
} from "./languageServerProviders/abstractLanguageServerProvider";

export class LanguageServerManager {
  private _providers: Map<string, AbstractLanguageServerProvider> = new Map();

  getProviders(): LanguageServerProviderDescription[] {
    return Array.from(this._providers.values()).map((provider) =>
      provider.getDescription()
    );
  }

  getProvider(providerId: string): AbstractLanguageServerProvider | undefined {
    return this._providers.get(providerId);
  }

  createInstance() {}
}
