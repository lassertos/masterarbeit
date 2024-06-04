# Kollaboration

Jede sichtbare `TextEditor`-Instanz, deren `document`-Property nicht `"[Circular]"` ist, benötigt ein Binding. Dieses Binding synchronisiert den Zustand des Dokuments mit allen anderen Teilnehmern einer Session. Es sollte immer die aktuelle Auswahl des aktiven Editors übertragen werden, falls mehrere `TextEditor`-Instanzen der gleichen Datei geöffnet sind.

## Offene Probleme

- Multiline Editing