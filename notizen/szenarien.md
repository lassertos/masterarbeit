# Szenarien

## GOLDi Microcontroller Steuereinheit

In der aktuellen Version der Microcontroller Steuereinheiten ist dem Microcontroller ein Raspberry Pi vorgeschaltet. Dieser übernimmt die Kommunikation mit der CrossLab Infrastruktur bzw. mit den anderen Geräten innerhalb eines Experiments. Die Kompilierung des Quellcodes für den Microcontroller kann nun auf zwei verschiedene Arten geschehen:

- separater Kompilierserver
- Compiler auf dem Raspberry Pi mit Anbindung über entsprechenden Service

Erstere Lösung ermöglicht es in der Theorie mehr gleichzeitige Kompilieranfragen bedienen zu können als es ein Raspberry Pi erlaubt. Allerdings kann bei der zweiten Lösung die Kompilierung des Programms für einen spezifischen Microcontroller auf seinen entsprechenden Raspberry Pi ausgelagert werden. Aufgrund der Tatsache, dass gleichzeitige Kompilierungen mehrerer verschiedener Programme in diesem Kontext nicht auftreten sollten bzw. verhindert werden können, sollte die Rechenkapazität des Raspberry Pis für diese Aufgabe ausreichen.

## Mehrere Microcontroller Steuereinheiten

Wenn mehrere Microcontroller Steuereinheiten in einem Experiment vorhanden sind, so muss die Möglichkeit bestehen den Microcontroller auswählen zu können, für den das aktuelle Programm kompiliert werden soll.
