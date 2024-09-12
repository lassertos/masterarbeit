LaTeX-Template des Fachgebiet Neuroinformatik und Kognitive Robotik zur
Anfertigung von Abschlussarbeiten und Seminararbeiten.

---------------------
Installationshinweise
---------------------

Zur Verwendung des Templates wird eine eingerichtete LaTeX-Umgebung und ein
entsprechender Editor, wie beispielsweise TeXstudio, benötigt.
Nachfolgend sind die wichtigsten Installationsschritte für jedes Betriebssystem
kurz zusammengefasst. Weitere Informationen finden Sie auf der Internetseite
des LaTeX-Projekts: https://www.latex-project.org/get/

Windows
-------
1. Installieren Sie die LaTeX-Distribution MiKTeX: https://miktex.org/download
2. Installieren Sie einen Editor, der speziell für die Bearbeitung von LaTeX-
   Dokumenten konzipiert ist, z.B.: TeXstudio: https://www.texstudio.org/
   Alternativen, wie TeXmaker oder TeXnicCenter, sind aber ebenso denkbar.

MacOS
-----
1. Installieren Sie die LaTeX-Distribution MacTeX: http://www.tug.org/mactex/
2. Installieren Sie einen Editor, der speziell für die Bearbeitung von LaTeX-
   Dokumenten konzipiert ist, z.B.: TeXstudio: https://www.texstudio.org/
   Alternativen, wie texpad oder TeXShop, sind aber ebenso denkbar.

Linux
-----
1. Installieren Sie die LaTeX-Distribution TeX Live: http://www.tug.org/texlive
   In vielen Linux-Distributionen ist diese bereits vorinstalliert oder kann
   direkt über die Paketverwaltung installiert werden:
   Ubuntu: https://wiki.ubuntuusers.de/TeX_Live/
   Debian: https://www.tug.org/texlive/debian.html
2. Installieren Sie einen Editor, der speziell für die Bearbeitung von LaTeX-
   Dokumenten konzipiert ist, z.B.: TeXstudio: https://www.texstudio.org/
   Alternativen, wie TeXmaker oder Kile, sind aber ebenso denkbar.


--------------
Erste Schritte
--------------

Nachdem Sie die LaTeX-Umgebung eingerichtet haben, können Sie mit der Abfassung
Ihrer Arbeit beginnen. Hauptdatei bzw. Einstiegspunkt in das Template bildet
die Datei NIKR_thesis.tex. Öffnen Sie diese mit Ihrem LaTeX-Editor.
Eine kurze Erläuterung zu den anderen Dateien des Templates ist im
nachfolgenden Abschnitt dargestellt.

Beachten Sie unbedingt die einzelnen Punkte im Hinweiskapitel (Kapitel 0)!


--------------------
Aufbau des Templates
--------------------

NIKR_template/
├── content/
│   ├── anhang1.tex            # enthält Kapitel: Anhang A
│   ├── einleitung.tex         # enthält Kapitel: Einleitung
│   ├── experimente.tex        # enthält Kapitel: Experimentelle Untersuchungen
│   ├── grundlagen.tex         # enthält Kapitel: Theoretische Grundlagen
│   ├── hauptteil.tex          # enthält Kapitel: Hauptteil
│   ├── hinweise.tex           # enthält Zusatzkapitel mit Hinweisen
│   ├── sota.tex               # enthält Kapitel: State of the Art
│   └── zusammenfassung.tex    # enthält Kapitel: Zusammenfassung und Ausblick
├── image/
│   ├── costly.pdf             # Beispielgrafik
│   └── logo.pdf               # Logo der TU Ilmenau für Titelseite
├── include/
│   ├── NIKR_acronym.tex       # enthält Definitionen für Abkürzungen
│   ├── NIKR_header.tex        # richtet LaTeX-Dokument ein
│   ├── NIKR_settings.tex      # enthält alle für Sie relevanten Einstellungen
│   └── NIKR_title.tex         # definiert das Aussehen der Titelseiten
│
├── NIKR_bibliography.bib      # enthält alle Literaturangaben
├── NIKR_thesis.tex            # Hauptdatei des Templates (= Einstiegspunkt)
└── readme.txt                 # diese Datei
