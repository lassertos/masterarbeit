# Language Server Protokoll Unterstützung: Server

Auf der Seite des Servers werden die folgenden Komponenten definiert:

- Language Server Manager
- Language Server Provider
- Language Server Instance

Jede dieser Komponenten besitzt ihre eigenen Aufgaben. Diese werden in den folgenden Abschnitten beschrieben.

## Language Server Manager

Ein Language Server Manager ist dafür zuständig, auf die Anfrage eines Clients eine entsprechende Language Server Instance zu erzeugen. Dazu verwendet der Language Server Manager einen entsprechenden Language Server Provider. Diese Komponente ist optional.

## Language Server Provider

Ein Language Server Provider ist dafür zuständig, spezifische Language Server Instances zu erzeugen.

## Language Server Instance

Eine Language Server Instance ist dafür zuständig, die Kommunikation zwischen einem Client und einem Language Server zu ermöglichen. Dazu sind ggf. weitere Schritte notwendig, als nur das simple Weiterleiten der Nachrichten (z.B. Dateisystem-Synchronisierung).

## CrossLab Kompatibilität

Ein Language Server Provider mit CrossLab Kompatibilität
