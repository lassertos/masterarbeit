# Systematic Search

## Design and evaluation of a web-based distributed pair programming tool for novice programmers

**Link:** https://doi.org/10.1145/3649217.3653571

**Notes:**

- introduces a new tool for distributed pair programming
- may contain interesting sources for arguing for collaborative features
- problems with existing systems:
  - lack of features to change roles between students
  - poor support of activities management by teachers
  - low data collection preventing advanced features offered by learning analytics
- an evaluation of the developed tool is given
- pair-programming like collaboration (one driver and one navigator)
- the developed ide includes Pyodide for browser side execution
- the developed ide includes a backend for saving student activity logs and for the synchronization of the files

**category:** browser, client-server, collaboration, pair-programming

**interesting:** 4/5

**Cites / Views:** 0 / 29

## Containerizing CS50: Standardizing students’ programming environments

**Link:** https://doi.org/10.1145/3649217.3653567

**Notes:**

- another paper about the CS50 approach used at harvard
- explains prior approaches and afterwards the current solution based on containers
- uses Github Codespaces
- need to think about why this is not a suitable solution for our goals
- maybe just argue that we do not want to be dependent on external services?
- maybe one could argue that a user should only need one login?

**category:** cs50, cloud

**interesting:** 4/5

**Cites / Views:** 0 / 42

## PyodideU: Unlocking python entirely in a browser for CS1

**Link:** https://doi.org/10.1145/3626252.3630913

**Notes:**

- describes the implementation of a completely browser based python ide
- was tested by a huge group of students and teachers
- gives multiple comparisons to existing solutions
- gives multiple advantages and disadvantages of the developed and existing solutions

**category:** browser

**interesting:** 5/5

**Cites / Views:** 2 / 187

### Short Summary

This paper describes PyodideU and an IDE built on top of it. PyodideU uses Pyodide, a WebAssembly based python distribution for browsers, aswell as a custom CPython package built off of the Unthrow package by Joe Marshall. This allows for synchronous pausing of programs. Furthermore a graphics library was developed which along with a corresponding debugger allows the user to execute the program line-by-line and also replay parts while the graphics are updated accordingly. The python programs are run in the main thread of the browser. Furthermore a filesystem is provided. The whole system is found helpful by teachers and students alike.

## Addressing misconceptions in introductory programming: Automated feedback in integrated development environments

**Link:** https://doi.org/10.1145/3629296.3629297

**Notes:**

- introduces a coding assistant named MINDFIX
- coding assistant is implemented as an eclipse extension
- the assistant tries to help users with misconceptions about the programming language java
- the assistant seems to be perceived as helpful

**category:** automated feedback

**interesting:** 3/5

**Cites / Views:** 0 / 59

### Short Summary

This paper introduces MINDFIX (misconception-based feedback through IDE extensions). The system is built along with a pedagogical agent named "Gidget" to inform users about misconceptions found in their program code. The system is implemented as a plugin for the eclipse IDE.

## Development of Project Management Module for Reflex Cloud IDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10515647

**Notes:**

- continuation of the RIDE papers
- comparison of project management capabilities of different ides
- description of custom implementation
- description of the newly developed architecture

**category:** project management, RIDE

**interesting:** 4/5

**Cites / Views:** 0 / 17

## Exploring the Boundaries: Online Compiler Limitations and Capabilities

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10522387

**Notes:**

- provides a literature review on online compilers
- proposes an architecture for online compilers
- could be used for designing compilation backend
- online compilers seem to be seen more as a workspace instead of a simple compiler integration
- a comparison between a few online compilers is provided

**category:** online compilers

**interesting:** 4/5

**Cites / Views:** 0 / 8

## CodeXchange: Leaping into the Future of AI-Powered Code Editing

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10585043

**Notes:**

- main points:
  - code translation
  - auto comment generation
  - optimizing code
  - real-time collaborative programming
- lists chatgpt as a code editor
- not sure how helpful

**category:** AI, collaboration

**interesting:** 2/5

**Cites / Views:** 0 / 4

## CREATOR: An Educational Integrated Development Environment for RISC-V Programming

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10540579

**Notes:**

- describes CREATOR a specialized web-ide for assembler programming (RISC-V)
- allows the addition of new architectures
- allows the writing, debugging and execution of assembler code along with many quality of life features
- allows the programming of real hardware connected to the users pc using a webserver application

**category:** browser, embedded

**interesting:** 3.5/5

**Cites / Views:** 0 / 98

## Requirements for an Online Integrated Development Environment for Automated Programming Assessment Systems

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85193906566&doi=10.5220%2f0012556400003693&partnerID=40&md5=84d84745c4cf0fbaed52ae7e6461ffc3

**Link:** https://www.eduardfrankford.com/pdfs/CSEDU2024.pdf

**Notes:**

- compares multiple ides in regard to the features collected by surveying students
- includes a systematic approach to finding ides
- interesting related work
- ranks requirements by surveying students

**category:** requirements, comparison

**interesting:** 4/5

**Cites / Views:** 0 / ?

## LEARNING WEB DEVELOPMENT USING GITHUB COPILOT IN AND OUTSIDE ACADEMIA: A BLESSING OR a CURSE?

**Link:** https://hrcak.srce.hr/file/460172

**Notes:**

- interesting topic in general
- not really helpful for thesis

**category:** AI in education

**interesting:** 1/5

**Cites / Views:** ? / 12

## Towards Collaborative Coding in RIDE Web IDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10347731

**Notes:**

- collaboration through docker and server based system
- source code is not provided in paper references
- How exactly real-time collaboration is achieved does not seem to be mentioned in the paper

**category:** container, collaboration

**interesting:** 4/5 (more interesting with its associated papers)

**Cites / Views:** 1 / 27

### Short Summary

This paper describes a "framework" for adding collaborative capabilities to single-user applications. RIDE is used as an example application of the described framework. Furthermore workspace management features are added to RIDE.

## Design of STEM Teaching Network Publishing Framework Based on Web Interactive Programming Environment

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10393759

**Notes:**

- jupyter labs / notebooks based solution
- not really useful for our goals

**category:** jupyter

**interesting:** 2/5

**Cites / Views:** 0 / 25

### Short summary

NULL

## Evaluation and technological solutions for a dynamic, unified cloud programming development environment : Ease of use and applicable system for uniformized practices and assessments

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10044519

**Notes:**

- container based solution with vscode server
- needed 1.3gb of memory to not encounter a out-of-memory exception with the vscode docker container
- testing required before deploying solution to make sure all resources are available (memory, cpu, filesystem)
- very implementation heavy
- no source code is provided in references

**category:** container

**interesting:** 3/5

**Cites / Views:** 2 / 69

### Short Summary

This paper describes the implementation of a container-based system for deploying workspaces. The used IDE is vscode using vscode-server docker containers. It was used for angular development. Short overviews of Cloud9, AWS Cloud9 IDE, Codeanywhere, Code Envy and Koding are given.

## Browser-based Java Development Environment for Programming Education

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10409780

**Notes:**

- a notebook approach for java education is explored (jupyter + containers)
- some interesting didactical topics
- evaluation of the developed system is given
- no source code is provided in references

**category:** jupyter, container

**interesting:** 4/5

**Cites / Views:** 0 / 32

### Short Summary

This paper describes a browser-based development environment based on Jupyter Notebooks and the IJava kernel. Some interesting didactical topics are discussed. Furthermore an evaluation of the developed IDE is provided.

## Exploring the Effectiveness of Web-Based Programming Environments for MOOCs: A Comparative Study of CodeOcean and OpenJupyter

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10306228

**Notes:**

- a comparison between codeocean and openjupyter
- explores the architecture and scalability of both systems
- explores the needs of the corresponding user groups
- both platforms seem to lack collaborative work features (see VII)
- ai as an idea for personalized and automated feedback
- proposes an exchange platform for auto-gradable programming exercises

**category:** container

**interesting:** 5/5

**Cites / Views:** 0 / 62

### Short Summary

This paper offers a comparison between CodeOcean and OpenJupyter in terms of their suitability for MOOCs. Their respective target groups, interactive user experience, auto-grading, system architecture and scalability are compared. Further research topics are discussed in section VII.

## An eFPGA Generation Suite with Customizable Architecture and IDE

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85150477562&doi=10.1587%2ftransfun.2022VLP0008&partnerID=40&md5=27660e218bc199cbbc54ca3be4189562

**Notes:**

- IDE implemented using NODE-RED dashboard and vscode (code-server)
- Our IDE provides main circuit-development support for the FPGA-IP utilization flow shown in Fig. 1(3) such as Verilog code edit, simulation, waveform review, circuit compile, reports check, and bitstream generation to users entirely through the Web interface
- The simulation result can be verified the circuit behavior on GTKWave of wave viewer via VNC remote desktop. The wave viewer also can be invoked from Web IDE.
- could be a nice example of a more specialized IDE implementation

**category:** container?, specialized ide

**interesting:** 3/5

**Cites / Views:** 1 / ?

### Short Summary

TODO!

## Catchword: Language Server Protocol An Introduction to the Protocol, its Use, and Adoption for Web Modeling Tools

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85172705800&doi=10.18417%2femisa.18.9&partnerID=40&md5=2fc2c46b4f4b4db21547603f0a4e0687

**Notes:**

- possible source for the language server protocol
- also includes short paragraph for the debug adapter protocol

**category:** language server protocol

**interesting:** 4/5

**Cites / Views:** 2 / ?

### Short Summary

TODO!

## THE ACCEPTANCE OF AN EDUCATIONAL INTEGRATED DEVELOPMENT ENVIRONMENT TO LEARN PROGRAMMING FUNDAMENTALS

**Link:** https://www.researchgate.net/publication/368909126_THE_ACCEPTANCE_OF_AN_EDUCATIONAL_INTEGRATED_DEVELOPMENT_ENVIRONMENT_TO_LEARN_PROGRAMMING_FUNDAMENTALS

**Notes:**

- client server approach for browser based c ide

**category:** client-server

**interesting:** TODO!

**Cites / Views:** 0 / 128

### Short Summary

TODO!

## Re-imagining computer laboratories for teaching introductory programming concepts using web-based integrated development environments: Opportunities and challenges

**Link:** https://doi.org/10.1145/3568364.3568375

**Notes:**

- this paper compares different web ides
- the compared web ides are: replit, codechef, jdoodle, rextester and ideone
- overview: supported programming languages, cost, features to support collaboration, features to support assessment
- criteria: scalability, integration with lms, mobile access and functionality, archiving/saving/exporting data, learning analytics offline access
- some interesting aspects are mentioned
- some formal errors but still interesting results
- students are asked questions about their experiences with the web ides and the results are described

**category:** comparison

**interesting:** 4/5

**Cites / Views:** 0 / 38

## Standardizing students’ programming environments with docker containers: Using visual studio code in the cloud with GitHub codespaces

**Link:** https://doi.org/10.1145/3502717.3532164

**Notes:**

- small paper
- cs50 harvard
- github codespaces based solution

**category:** cloud, container

**interesting:** 4/5

**Cites / Views:** 2 / 154

## Jupyter in the classroom: An experience report

**Link:** https://doi.org/10.1145/3478431.3499379

**Notes:**

- this paper talks about using jupyter notebooks in different courses (c++, java and python)
- interesting concept of programming narratives is mentioned
- preliminary results of an experiment with a small sample size are given -> not really meaningful
- qualitative responses from students are given
- four-step method of instructions: preparation, presentation, application and evaluation

**category:** jupyter, local, online

**interesting:** 4/5

**Cites / Views:** 9 / 246

## MOCSIDE: An open-source and scalable online IDE and auto-grader for computer science education

**Link:** https://doi.org/10.1145/3478432.3499125

**Notes:**

- single page
- https://mocside.com/ - there are still so many placeholders
- browser frontend and docker based solution with an autograder

**category:** poster, container

**interesting:** 2/5 (full paper should be more interesting)

**Cites / Views:** 0 / 90

## MOCSIDE: an open-source and scalable online IDE and auto-grader for introductory programming courses

**Link:** https://dl.acm.org/doi/abs/10.5555/3512733.3512734

**Notes:**

- https://mocside.com/ - there are still so many placeholders
- browser frontend and docker based solution with an autograder
- code open-sourced at https://github.com/jcazalas/mocsidev1 - not available anymore

**category:** container

**interesting:** 3.5/5

**Cites / Views:** 1 / 101

## Towards Multi-User Mode in RIDE Web-IDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9855114

**Notes:**

- container based approach with server in the middle for connection and creation
- software architecture and implementation is described
- online workspace management platforms eclipse che and cloud9 are compared
- custom implementation using docker is chosen

**category:** container

**interesting:** 3.5/5

**Cites / Views:** 1 / 65

## A Bad IDEa: Weaponizing uncontrolled online-IDEs in availability attacks

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9799405

**Notes:**

- this paper focuses on possible attacks using uncontrolled online ides
- shows a possible attack scenario and evaluates it
- lists a few possible countermeasures
- interesting for challenges of online ides

**category:** attacks, challenges

**interesting:** 4/5

**Cites / Views:** 0 / 180

## A study of microcontroller simulator tools for autonomous and online learning

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9820021

**Notes:**

- comparison of different tools for simulation of microcontrollers
- the compared tools are: proteus suite, mcu8051 ide, tinkercad ide, µvision ide, simulide ide, tina design suite, mplab x
- the comparison criteria are: distribution model, type of platform, supported processors, simulated peripherals, graphical representation aswell as debugging and observability

**category:** microcontroller simulation

**interesting:** 3/5

**Cites / Views:** 0 / 160

## PyGuru: A Programming Environment to Facilitate Measurement of Cognitive Engagement

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85151057671&partnerID=40&md5=55681dd316c4316e0dc7abf3ea120c7e

**Notes:**

- log data of the pyguru platform is analysed (e.g. time spent reading, highlighting, etc.)
- pyguru has four components: book reader, video player, code editor and discussion forum
- results seem very expected (e.g. more time spent reading than annotating)
- website is not available anymore

**category:** browser, logging

**interesting:** 2/5

**Cites / Views:** 2 / ?

## RIDE: Theia-Based Web IDE for the Reflex Language

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9507678

**Notes:**

- this paper describes the development of RIDE using Theia (first iteration was developed using Xtext and Eclipse IDE)

**category:** local, client-server, container (domain specific modules)

**interesting:** 3.5/5

**Cites / Views:** 3 / 151

## CodeHelper: A Web-Based Lightweight IDE for E-Mentoring in Online Programming Courses

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9486772

**Notes:**

- the paper describes the development of a c++ collaborative editor for pair programming
- the whole editor seems to be web-based with a server for handling saving, compilation, etc.
- has a program assessment feature
- one-on-one code sharing between student and teacher

**category:** client-server, collaboration

**interesting:** 3.5/5

**Cites / Views:** 1 / 220

## Developing Reflex IDE Kernel with Xtext Framework

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9507663

**Notes:**

- shows the development of RIDE using Xtext
- precursor to Theia implementation
- using eclipse ide
- seems to focus more on the integration of the reflex language into eclipse

**category:** local

**interesting:** 2/5

**Cites / Views:** 3 / 92

## A pilot experience with software programming environments as a service for teaching activities

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85098764320&doi=10.3390%2fapp11010341&partnerID=40&md5=f0002aa32f4b03357dc3cc7dc5553296

**Notes:**

- a set of tools to facilitate to the teacher the management of practice lessons in computer science subjects
- pilot use case uses windows vms with devc++ ide and graphical client for github

**category:** container-like

**interesting:** 3/5

**Cites / Views:** 5 / ?

## Student adoption and perceptions of a web integrated development environment: An experience report

**Link:** https://doi.org/10.1145/3328778.3366949

**Notes:**

- describes a webide called kodethon and its evaluation from students
- the ide supports multiple programming languages, compiling and execution
- the ide furthermore supports real-time collaboration between students
- the files of the students are saved in the cloud
- an evaluation of the developed system is given
- broader lessons are given
- no source code found in references

**category:** container

**interesting:** 5/5

**Cites / Views:** 5 / 650

## Using WebIDE as a distance learning tool for high school programming

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9245263

**Notes:**

- webide implementation based on cloud9 with custom plugins
- focus on high schools
- the user interface for teachers is also described
- test driven learning
- architecture and implementation of the system are described
- evaluation of the developed system

**category:** cloud, container

**interesting:** 3.5/5

**Cites / Views:** 1 / 107

## Analyzing learners’ engagement and behavior in MOOCs on programming with the codeboard IDE

**Link:** https://link.springer.com/article/10.1007/s11423-020-09773-6

**Notes:**

- evaluation using the codeboard ide (anonymous vs registered learners)
- registered learners code is saved and reloaded while anonymous users code is discarded
- rq1: differences in terms of their level of engagement?
- rq2: differences in terms of their coding behavior?
- an overview of the architecture of codeboard is given
- not all interesting data could be collected (e.g. keystrokes)
- the results of the evaluation are discussed
- further research topics are given in the conclusion

**category:** client-server

**interesting:** 4/5

**Cites / Views:** 12 / 1221

## Good-bye localhost: A cloud-based web IDE for teaching java EE web development to non-computer science majors

**Link:** https://doi.org/10.1109/ICSE-Companion.2019.00108

**Notes:**

- Eclipse Che was selected, using the JBoss WildFly application server for Java EE support
- simple evaluation provided
- an overview of the developed architecture is given
- only supports java ee although it could maybe be adapted to other languages
- target group were non-computer science major students with limited technical knowledge
- IT management / administration overhead listed as a drawback

**category:** cloud

**interesting:** 3/5

**Cites / Views:** 1 / 656

## Gamifying the Code Genie Programming Tool

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8833771

**Notes:**

- Code Genie is a free web IDE that was developed to integrate art and animation in learning Text-based programming language
- This paper demonstrates the latest Code Genie update which includes adding several features such as gamification elements, tutorial lessons, user's registration accounts, "Get Link" button that can be used to get a code link to be shared in any platform, sorting the shared code inside the Code Genie development environment, adding the button symbol, and saving the latest written code
- gamification idea seems interesting as a general concept
- aimed at highschool students
- the used programming language is javascript

**category:** browser

**interesting:** 2.5/5

**Cites / Views:** 1 / 106

## JavaScript Development Environment for Programming Education Using Smartphones

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8951653

**Notes:**

- description of a development environment for smartphones called JavaScript Development Environmnent (JDE)
- small evaluation of JDE is given
- mostly focused on implementation

**category:** browser

**interesting:** 2/5

**Cites / Views:** 6 / 147

## pyiron: An integrated development environment for computational materials science

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85062973139&doi=10.1016%2fj.commatsci.2018.07.043&partnerID=40&md5=c9144d1aef0ee82e393fc2eb45f3e12d

**Notes:**

- python based framework for simulation protocols
- integrates well with jupyter notebooks
- can be split into browser-based user-interface and server-based backend for simulation
- does not seem very interesting for our purposes

**category:** client-server

**interesting:** 1/5

**Cites / Views:** 66 / 79

## Teachers’ Perspectives on Learning and Programming Environments for Secondary Education

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85069475296&doi=10.1007%2f978-3-030-23513-0_5&partnerID=40&md5=359acaa7d57367d57584544c0e1666d4

**Notes:**

- papers on students point of view are given in the introduction
- teachers point of view on choosing a fitting development environment for teaching is explored
- multiple ides are evaluated (bluej, scratch, greenfoot, eclipse, mit app inventor, processing ide, alice)
- rq1: what influence does the educational oop environment have on students' learning success compared to other factors, according to teachers?
- rq2: what features should an educational oop environment have, according to teachers?
- rq3: which educational oop environments are used and preferred for classrooms by teachers?
- rq4: which benefits and disadvantages exist for selected educational oop environments, according to teachers?

**category:** comparison

**interesting:** 2/5

**Cites / Views:** 1 / 19

note: some sources in chapter 2 may be interesting

## OnlineSPARC: A programming environment for answer set programming

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85056604338&doi=10.1017%2fS1471068418000509&partnerID=40&md5=26819a5eb570c60a23b54d3742b86c1f

**Notes:**

- description of an online programming environment for SPARC
- web-based user-interface with backend for computation
- performance evaluation given
- website no longer accessible
- mostly chapter 3 seems to be of interest (contains architecture, implementation and performance evaluation)

**category:** client-server

**interesting:** 2.5/5

**Cites / Views:** 5 / 20

## How “Friendly” Integrated Development Environments Are?

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85069822473&doi=10.1007%2f978-3-030-21902-4_7&partnerID=40&md5=7f7bb1d4acada06f0aa26860b788cd91

**Notes:**

- Survey focusing on programmer experience for the following ides: DevC++, Eclipse and NetBeans
- none of the ides achieves a high usability score (highest: D)
- very specific to the ides under consideration

**category:** comparison, usability

**interesting:** 2/5

**Cites / Views:** 2 / 37

## WebLinux: A scalable in-browser and client-side linux and IDE

**Link:** https://doi.org/10.1145/3231644.3231703

**Notes:**

- description of a tool for teaching Linux
- completely browser-based
- a fork of jor1k
- can be run offline once loaded
- can run gcc in browser

**category:** browser

**interesting:** 3/5

**Cites / Views:** 3 / 241

## Matlab Programming Environment Based on Web

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8740716

**Notes:**

- description of an online programming environment for matlab
- client server architecture with web-based user interface and server for compilation
- many grammatical and spelling errors
- simple client server architecture

**category:** client-server

**interesting:** 1/5

**Cites / Views:** 7 / 878

## The Code Genie Programming Environment

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8500194

**Notes:**

- description of the code genie programming environment
- web-based programming environment using javascript
- aimed at K-12 students, because of that it has a simpler user interface with focus on drawing shapes
- evaluation of the system is given

**category:** browser

**Cites / Views:** 5 / 91

## Evaluations of JaguarCode: A web-based object-oriented programming environment with static and dynamic visualization

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85051937366&doi=10.1016%2fj.jss.2018.07.037&partnerID=40&md5=4742d6b5ca9b7abfe5ec5748ce851abd

**Notes:**

- descriptions of jaguarcode, a web-based programming environment for java
- includes static and dynamic visualization of java programs at line level, as well as a full overview of a project under development
- consists of a web-based user interface and a server for compilation, debugging and visualization

**category:** client-server

**Cites / Views:** 12 / 23

## A web-based programming environment for introductory programming courses in higher education

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85056321785&partnerID=40&md5=b3d20421d785f1399004cc7e4e05b8de

**Notes:**

- lists demands for programming environments
- describes a proposed programming environment, with a web-based user interface and a server for computation

**category:** client-server

**Cites / Views:** 2 / 7

## LoIDE: A web-based IDE for logic programming preliminary report

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85041093852&doi=10.1007%2f978-3-319-73305-0_10&partnerID=40&md5=c8b93fe08dc7b05ab9e0f8ee9f571ade
**Link:** https://arxiv.org/pdf/1709.05341

**Notes:**

- web-based IDE for logic programming
- web-based user interface with server for computation

**category:** client-server

**Cites / Views:** 3 / 9

## WIDE: Centralized and collaborative approach to teaching web development

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85052017251&doi=10.3966%2f160792642018081904004&partnerID=40&md5=ced7a8fd083db40ff88a1fc6490260e8

**Notes:**

- a web-based ide for teaching programming with php
- client server approach with web-based user interface and server for computation

**category:** client-server

**Cites / Views:** 4 / 23

## A web-based IDE for teaching with any language (abstract only)

**Link:** https://doi.org/10.1145/3017680.3017839

**Notes:**

- abstract only
- describes the cloud9 based solution for cs50.io

**category:** cloud

**Cites / Views:** 0 / 0

## Analyzing the learning process (in Programming) by using data collected from an online IDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8067822

**Notes:**

- codeboard ide is used to collect data on e.g. project accesses and compilations/runs/submissions
- data is then analyzed with the result, that the change in the environment used has a significant relation with respect to the achieved marks (+7% DevC++ to codeboard)

**category:** client-server

**Cites / Views:** 1 / 210

## Initial Evaluation of JaguarCode: A Web-Based Object-Oriented Programming Environment with Static and Dynamic Visualization

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8166696

**Notes:**

- Another evaluation of jaguarcode

**category:** client-server

**Cites / Views:** 3 / 201

## Jimbo: A collaborative IDE with live preview

**Link:** https://doi.org/10.1145/2897586.2897613

**Notes:**

- web ide
- operational transformation
- audio and text chat, inline discussions, live preview, push notifications for code changes
- client server architecture
- focus on the development of web applications

**category:** client-server

**Cites / Views:** 8 / 156

## Implementation of a web-based programming tool for distributed, connected Arduino systems

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=7732276&tag=1

**Notes:**

- CodeMirror based editor with program upload support
- each arduino is connected to a raspberry pi
- raspberry pi is hosting web page and is responsible for programming arduino (using arduino cli)

**category:** client-server

**Cites / Views:** 2 / 259

## Enhancing team collaboration through integrating social interactions in a Web-based development environment

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84978327317&doi=10.1002%2fcae.21729&partnerID=40&md5=53882aa9f10e59865a3ae086e889534a
**Link:** https://onlinelibrary.wiley.com/doi/epdf/10.1002/cae.21729

**Notes:**

- describes design and evaluation of a web-based collaborative learning environment called EduCo
- ideol is used as the ide component (collaborative editor with debugging capabilities)
- multiple social media like features are added
- evaluation of the whole system is given

**category:** client-server

**Cites / Views:** 19 / 59

## The TuringLab programming environment an online python programming environment for challenge based learning

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84979582025&doi=10.5220%2f0005802701030113&partnerID=40&md5=e890613e7e3f67c82b90d813d97c72ad
**Link:** https://www.scitepress.org/papers/2016/58027/58027.pdf

**Notes:**

- CodeMirror editor is used along with Skulpt for executing python in the browser (compiles python to js)
- graphical output using python turtle
- webserver and worker server (worker server is used for debugging)
- an evaluation of the system is given

**category:** client-server

**Cites / Views:** 0 / 26

## Putting cloud 9 IDE on the wheels for programming Cyber-Physical / Internet of Things Platforms: Providing educational prototypes

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-85013116258&doi=10.5220%2f0005985204280435&partnerID=40&md5=f82c024105ca52804a4eca7eccda0ad0
**Link:** https://www.researchgate.net/profile/Radovan-Stojanovic/publication/307879350_Putting_Cloud_9_IDE_on_the_Wheels_for_Programming_Cyber-Physical_Internet_of_Things_Platforms_-_Providing_Educational_Prototypes/links/57d2d5d808ae5f03b48ccf7a/Putting-Cloud-9-IDE-on-the-Wheels-for-Programming-Cyber-Physical-Internet-of-Things-Platforms-Providing-Educational-Prototypes.pdf

**Notes:**

- cloud9 ide is used for programming
- mini pc is used as network interface

**category:** cloud

**Cites / Views:** 2 / 28

## An overview of platforms for cloud based development

**Link:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4715041/pdf/40064_2016_Article_1688.pdf

**Notes:**

- comparison of different platforms for cloud based development
- ide features: editor, debugging, runtime auditing, project upload, database
- new features may have been added since 2016

**Cites / Views:** 38 / 876

## Beyond open source: The TouchDevelop cloud-based integrated development environment

**Link:** https://ieeexplore.ieee.org/document/7283033

**Notes:**

- ide is built to be used on smartphones with a touch-based user interface
- ide only supports a custom programming language
- debugging, crash logging and coverage collection are supported
- an evaluation of the system is given

**category:** ?

**Cites / Views:** 6 / 166

## Detailed recordings of student programming sessions

**Link:** https://doi.org/10.1145/2729094.2754859

**Notes:**

- describes a browser based programming and learning environment called CSQUIZ
- programming sessions are recorded as a collection of timestamped events
- recorded sessions were analyzed
- not sure how helpful
- only 1 page

**category:** ?

**Cites / Views:** 0 / 111

## Formal reasoning using an iterative approach with an integrated web IDE

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84954426284&doi=10.4204%2fEPTCS.187.5&partnerID=40&md5=a347f34f24d7b716b0efe792a8b55e4c
**Link:** https://arxiv.org/pdf/1508.03896

**Notes:**

- does not go into specifics about the ide
- client server architecture

**category:** client-server

**Cites / Views:** 5 / 6

## Experience report: Evolution of a web-integrated software development and verification environment

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84927698573&doi=10.1002%2fspe.2259&partnerID=40&md5=d0211c9819bf9ffea760ed38c8c1a7b7
**Link:** https://onlinelibrary.wiley.com/doi/epdf/10.1002/spe.2259

**Notes:**

- described the development of a web-based ide from 2009-2012 (in corresponding iterations)
- client server architecture

**category:** client-server

**Cites / Views:** 2 / 18

## CodeR: Real-time Code Editor Application for Collaborative Programming

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84948430392&doi=10.1016%2fj.procs.2015.07.531&partnerID=40&md5=c1b4cfd7d02894fd1d88372f51882746
**Link:** https://www.sciencedirect.com/science/article/pii/S1877050915020608

**Notes:**

- client server architecture
- describes CodeR collaborative development environment
- integrates with facebook api for social media integration
- allows collaborative editing of files with operational transformation
- seems to use collabode collaborative code editor which uses eclipse as a backend for syntax highlighting, refactoring, compilation, execution etc.

**category:** client-server

**Cites / Views:** 18 / 40

## Web2Compile-CoT: A web IDE for the cloud of things

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84945557224&doi=10.1007%2f978-3-319-23237-9_3&partnerID=40&md5=2dbef88f126fcd010d109199bfb5305b
**Link:** https://link.springer.com/chapter/10.1007/978-3-319-23237-9_3

**Notes:**

- access over springer link provided by tu ilmenau
- client server architecture
- simple evaluation of the system is given
- compilation and upload of program is supported

**category:** client-server

**Cites / Views:** 3 / 14

## LearnCS! A new, browser-based c programming environment for CS1

**Link:** https://dl.acm.org/doi/10.5555/2602724.2602752

**Notes:**

- aimed at first year computer science students
- contains an embedded c interpreter that runs in the browser
- has memory visualization and built in debugger
- server component contains a database for research purposes
- LearnCS! can be instrumented to save button clicks, setting of breakpoints and steps through the program, source code snapshots, and even individual keystrokes and mouse movement, if necessary
- results of using the system and the corresponding findings are given

**category:** browser

**Cites / Views:** 5 / 212

## New opportunities for extracting insights from cloud based IDEs

**Link:** https://doi.org/10.1145/2591062.2591105

**Notes:**

- paper focuses on ways to collect data from cloud based ides
- a user study and its findings are presented

**Cites / Views:** 11 / 179

## Lessons from a web-based IDE and runtime

**Link:** https://doi.org/10.1145/2543728.2543746

**Notes:**

- the ide in question is TouchDevelop
- seems to be more of an advertisement for TouchDevelop

**category:** ?

**Cites / Views:** 1 / 182

## EduCo: An integrated social environment for teaching and learning software engineering courses

**Link:** https://doi.org/10.1145/2684200.2684280

**Notes:**

- a more detailed look at the EduCo development environment

**category:** client-server

**Cites / Views:** 1 / 113

## A cloud-based integrated development environment for embedded systems

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6935577

**Notes:**

- requirements for the ide are presented
- client server architecture
- cloud9 server environment is used
- allows programming and debugging embedded hardware
- does not really go into detail on implementation at first glance

**category:** client-server

**Cites / Views:** 8 / 447

## Learning and practicing object-oriented programming using a collaborative web-based IDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=7044141

**Notes:**

- paper describes the collaborative web-based development environment ideol and its architecture
- an experiment is setup and evalutated to answer the following research questions:
  - RQ1: Given the exercise that requires them to submit work frequently, how often do students collaborate and do programming work via IDEOL?
  - RQ2: How much are students satisfied with the design of the project, the IDEOL system, and collaboration?

**category:** client-server

**Cites / Views:** 6 / 301

## Recording and analyzing in-browser programming sessions

**Link:** https://doi.org/10.1145/2526968.2526970

**Notes:**

- focus on collecting and analysing data from a web-based programming environment
- Python code execution in the environment is done on the client-side, in-browser and is accomplished using the jsrepl library and the C implementation of Python, CPython, compiled into JavaScript via LLVM using the emscripten library. HTML5 web storage feature is used to save and restore the contents of the editor and console including command history of a programming session. HTML5 fullscreen API is used for enabling the environment to occupy the whole screen space not unlike a native application

**category:** browser

**Cites / Views:** 18 / 401

## WIDE an interactive Web integrated development environment to practice C programming in distance education

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6701964

**Notes:**

- client server architecture
- allows interaction via chat and forum
- allows compilation using gcc on server
- allows execution of programs on server

**category:** client-server

**Cites / Views:** 3 / 272

## An interactive Web-based IDE towards teaching and learning in programming courses

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6654478

**Notes:**

- describes the development of ideol in more detail
- client server architecture
- real time and interactive editor, changes are instantly visible to all team members
- real time discussion board with tagging mechanism
- summarization of changes in a project
- a debugger for c/c++ console programs (gdb)
- build automation using gnu c/c++ compilers version 4.4.7
- interactive execution tool for console applications
- another evaluation of ideol is given answering the following research questions:
  - does ideol help students to manage their groups better?
  - does ideol enhance the interaction among members in a group?

**category:** client-server

**Cites / Views:** 10 / 614

## Distributed Integrated Development Environment for Mobile Platforms

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6553932

**Notes:**

- client server architecture, one central server and multiple compilation servers
- text editor with syntax highlighting
- simple performance evaluation is given (20 concurrent compilation requests)
- user interface for android devices

**category:** client-server

**Cites / Views:** 2 / 198

## Software development environments on the web: A research agenda

**Link:** https://doi.org/10.1145/2384592.2384603

**Notes:**

- gives a general overview over ides and their web-based counterparts
- describes the weblab application, a web-based development environment for scala (in education)
- uses ace editor
- client server architecture
- could be an article worth reading completely

**category:** client-server

**Cites / Views:** 19 / 660

## Elements for a cloud-based development environment: Online collaboration, revision control, and continuous integration

**Link:** https://doi.org/10.1145/2361999.2362003

**Notes:**

- description of the proof-of-concept system cored, a collaborative development environment for java
- real time code editing and social media inspired communication
- uses the ace editor
- client server architecture
- facebook integration
- uses neil fraser's differential synchronization algorithm for collaboration

**category:** client-server

**Cites / Views:** 2 / 483

## CoRED: Browser-based collaborative real-time editor for java web applications

**Link:** https://doi.org/10.1145/2145204.2145399

**Notes:**

- another paper describing the implementation and architecture of cored

**category:** client-server

**Cites / Views:** 28 / 898

## MiDebug: Microcontroller integrated development and debugging environment

**Link:** https://doi.org/10.1145/2185677.2185714

**Notes:**

- web-based development environment for programming microcontrollers
- also allows debugging of microcontrollers
- client server architecture
- uses codemirror
- midebug can access usb hardware directly using jtag and openocd

**category:** client-server

**Cites / Views:** 0 / 242

## Evaluation of a Web-Based Programming Environment

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6354897

**Notes:**

- describes a web based collaborative development environment called WSDE
- client server architecture
- four ways of collaborating described (CDCE,CDSE,SDCE,SDSE)
- implemented as a java servlet
- a simple performance evaluation of the system is given
- does not really seem collaborative in the sense of real-time concurrent file editing

**category:** client-server

**Cites / Views:** 6 / 185

## Program Behavior Analysis and Control for Online IDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6341572

**Notes:**

- this paper focuses on three problems of online ides:
  - wrong file operations: users may delete system files if allowed
  - banned method calling: users may execute malicious code if allowed
  - excessive resource consumption: one user may cause other users to have a worse experience by consuming an excessive amount of resources
- the first two problems seem irrelevant for the intended use-case of the ide but could be interesting in a container based development environment
- implemented ceclipse (client server architecture) which includes a program analysis part for the three problems mentioned above

**category:** client-server

**Cites / Views:** 4 / 242

## Web-Based Robot Programming Environment and Control Architecture

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6363314

**Notes:**

- describes a system where the development environment is hosted on a smartphone
- used to interface with different robots (e.g. Lego Mindstorms)

**category:** client-server

**Cites / Views:** 1 / 239

## Components of a Wiki-based software development environment

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6414952

**Notes:**

- client srever architecture
- only architecture is described
- it is shown how already existing components fit into the architecture

**category:** client-server

**Cites / Views:** 1 / 96

## WeScheme: The browser is your programming environment

**Link:** https://doi.org/10.1145/1999747.1999795

**Notes:**

- lists a few benefits of web-based programming environments
- presents wescheme, a web-based programming environment for the scheme and racket programming languages
- offers syntax-highlighting (CodeMirror), an interactive tool to run programs on-the-fly and a hub for sharing programs
- client server architecture
- an evaluation of the system is given

**category:** client-server

**Cites / Views:** 34 / 258

## Java WIDE - java wiki integrated development environment: Nifty tools and assignments

**Link:** https://dl.acm.org/doi/pdf/10.5555/2379703.2379730

**Notes:**

- no real description of JavaWIDE, seems more like an advertisement

**category:** ?

**Cites / Views:** 1 / 239

## Real-time collaborative coding in a web IDE

**Link:** https://doi.org/10.1145/2047196.2047215

**Notes:**

- this paper describes the web-based collaborative integrated development environment collabode
- uses operational transform to enable collaborative editing
- collaborative editing powered by etherpad
- client server architecture
- uses eclipse in the backend
- an evaluation of the system is given

**category:** client-server

**Cites / Views:** 87 / 1175

## Redprint: Integrating API specific "instant example" and "instant documentation" display interface in IDEs

**Link:** https://doi.org/10.1145/2046396.2046408

**Notes:**

- idea itself is interesting but the paper not really

**category:** extension, documentation

**interesting:** 2/5 paper and 4/5 general idea

**Cites / Views:** 1 / 324

## CEclipse: An Online IDE for Programing in the Cloud

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=6012686

**Notes:**

- another paper describing the architecture of ceclipse
- another evaluation is given to answer the following research questions:
  - which one is better between black-list strategy and white-list strategy? Whether our black-list strategy will affect the students' programming activities?
  - In order to avoid the system resources being over consumed, what's the maximum run time should be set for the training online IDE?
- supports compiling, running, debugging, code completion, etc. for java programs (uses eclipse in backend)
- client server architecture

**category:** client-server

**Cites / Views:** 21 / 899

## Supporting introductory test-driven labs with WebIDE

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=5876137

**Notes:**

- describes a webide built on google web toolkit (GWT)
- lab specifications are written in a well-defined XML language
- evaluators can be associated with lab steps to evaluate the students solution
- used for test driven learning
- not much more info about the ide
- a pilot study and analysis is given

**category:** ?

**Cites / Views:** 9 / 266

## The learning and productivity benefits to student programmers from real-world development environments

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84865620372&partnerID=40&md5=866f53f594aaf566cfa4f1ce1ce79fc9
**Link:** https://files.eric.ed.gov/fulltext/EJ1136657.pdf

**Notes:**

- a study trying to find out if students benefit from using commercial ides instead of simple text editors for learning programming
- the ideal combination seems to be an ide and a simple text editor

**Cites / Views:** 0 / 14

## Adinda: A knowledgeable, browser-based IDE

**Link:** https://doi.org/10.1145/1810295.1810330

**Notes:**

- describes the system adinda
- proposes restructuring of traditional ides into a set of cooperating services
- adinda comprises a thin client connected to a range of different services
- adinda based on an earlier prototype for a web-based ide called wwworkspace
- client server architecture (eclipse on the server-side)
- syntax-highlighting and compilation supported

**category:** client-server

**Cites / Views:** 25 / 550

## XYLUS: A virtualized programming environment

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=5625674

**Notes:**

- client server architecture
- user can compile and execute programs
- uses vms for program execution (and rdp)
- a simple evaluation of the system is given

**category:** client-server

**Cites / Views:** 1 / 96

## A web-based programming environment for LEGO mindstorms robots

**Link:** https://doi.org/10.1145/1167253.1167333

**Notes:**

- short paper
- client server architecture
- allows compiliation and execution

**category:** client-server

**Cites / Views:** 3 / 323

## WIPE: A programming environment for novices

**Link:** https://doi.org/10.1145/1067445.1067479

**Notes:**

- client server architecture
- allows compilation and execution of pascal like programs with custom pseudo assembly code running on vm
- an evaluation of the system is given

**category:** client-server

**Cites / Views:** 14 / 574

## View/edit/compile/run Web-based programming environment

**Link:** https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=1408552

**Notes:**

- the VECR system is described
- client server architecture
- focused on c and java programming

**category:** client-server

**Cites / Views:** 1 / 108

## A web-based distributed programming environment

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-84944029694&doi=10.1007%2f3-540-45492-6_24&partnerID=40&md5=c4267a5a85b9e5a27744799875f06b71

**Notes:**

- client server architecture
- compilation agents
- allows compilation and execution of c/c++ programs

**category:** client-server

**Cites / Views:** 1 / 6

## A critical analysis and evaluation of Web-based environments for program development

**Link:** https://www.scopus.com/inward/record.uri?eid=2-s2.0-0034426139&doi=10.1016%2fS1096-7516%2801%2900038-0&partnerID=40&md5=f1c3951e6cfaa127ef40e50bb798cb1b

**Notes:**

- extremely long paper
- classification and review of different web-based interactive programming environments
- not sure how useful since it was released in 2001
- maybe classification categories are important

**Cites / Views:** 8 / 8

# Other Sources

## CoVSCode: A Novel Real-Time Collaborative Programming Environment for Lightweight IDE

**Link:** https://www.researchgate.net/publication/336973796_CoVSCode_A_Novel_Real-Time_Collaborative_Programming_Environment_for_Lightweight_IDE

**Notes:**

- does not seem to support shared compilation / debugging
- works with an operational transformation approach (client-server)
- defines an architecture for the whole collaboration system
- defines the architecture of a vscode client adapter
- discusses the prototypical implementation of the system
- evaluates the implemented system

**category:** collaboration

**interesting:** 5/5
