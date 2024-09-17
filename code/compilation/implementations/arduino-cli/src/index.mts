#!/usr/bin/env node
import { ArduinoCliCompilationServer } from "./server.mjs";

const arduinoCliCompilationServer = new ArduinoCliCompilationServer();
arduinoCliCompilationServer.start();
