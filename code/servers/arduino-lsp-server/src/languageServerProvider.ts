export abstract class LanguageServerProvider<T = unknown> {
  private clients: Map<string, T> = new Map();

  abstract registerClient(): T;
}
