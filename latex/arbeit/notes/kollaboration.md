# Kollaboration

Jede sichtbare `TextEditor`-Instanz, deren `document`-Property nicht `"[Circular]"` ist, benötigt ein Binding. Dieses Binding synchronisiert den Zustand des Dokuments mit allen anderen Teilnehmern einer Session. Es sollte immer die aktuelle Auswahl des aktiven Editors übertragen werden, falls mehrere `TextEditor`-Instanzen der gleichen Datei geöffnet sind.

Pro Datei sollte eine `YText`-Instanz existieren. Diese sollte den Pfad der Datei als Namen erhalten. Diese Datei sollte auch mit Änderungen des zugrundeliegenden Dateisystems synchronisiert werden (z.B. Verschieben/Erstellen/Löschen einer Datei).

## Einfaches Beispiel

Nehmen wir an wir haben zwei Nutzer, die gemeinsam ein Dokument bearbeiten wollen. Dafür müssen die beiden Nutzer im Rahmen von CrossLab ein gemeinsam an einem Experiment teilnehmen. Dies kann wiefolgt funktionieren:

- Ein Nutzer startet ein Experiment über die IDE und lädt dabei den anderen Nutzer ein
- Ein Nutzer lädt den anderen Nutzer zu einem bereits bestehenden Experiment ein
- Ein Nutzer tritt einem bereits bestehenden Experiment des anderen Nutzers bei

Damit die Dateien kollaborativ bearbeitet werden können muss zunächst ein entsprechendes `YDocument` angelegt werden. Dieses kann dann mithilfe von `y-indexeddb` persistent im Browser der Nutzer gespeichert werden. Hierbei ist zu überlegen, ob die geteilten Projekte im gleichen Dateisystem gespeichert werden sollen, wie die lokalen Projekte, oder ob ein separates Dateisystem eingerichtet werden soll. Bei einem separaten Dateisystem muss allerdings beachtet werden, dass es dann ggf. zwei Versionen eines Projektes geben könnte, ein lokales und ein geteiltes. Sollte es dann erlaubt sein, dass die beiden Versionen unterschiedlich voneinander sind oder sollten beide stehts synchronisiert werden? Man könnte natürlich auch die Synchronisationsrelevanten Daten als Zusatzinformation im bestehenden Dateisystem ablegen. Hierbei müsste allerdings eine stetige Synchronisierung stattfinden. Weiterhin müssen auch Kompilierung, Upload und Debugging zwischen den Nutzern geteilt werden.

## Offene Probleme

- Multiline Editing
- Merging of offline edits