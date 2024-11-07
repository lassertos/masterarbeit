// import express from "express";
import proxy from "express-http-proxy";
import express from "express";
import expressWs from "express-ws";
import { RawData, WebSocket } from "ws";

const LOCAL_DOMAIN = process.env["LOCAL_DOMAIN"];
if (!LOCAL_DOMAIN) {
  throw new Error("Environment variable 'LOCAL_DOMAIN' not set!");
}

const DOCKER_DOMAIN = process.env["DOCKER_DOMAIN"];
if (!DOCKER_DOMAIN) {
  throw new Error("Environment variable 'DOCKER_DOMAIN' not set!");
}

// create a server
const app = expressWs(express()).app;

// Proxy websockets
app.ws("*", function (ws, req) {
  const proxyWsBuffer: RawData[] = [];
  const proxyWs = new WebSocket(
    "ws://" + DOCKER_DOMAIN + req.url.replace("/.websocket", "")
  );

  ws.on("message", (message) => {
    if (proxyWs.readyState === WebSocket.OPEN) {
      console.log("sending proxy websocket message!");
      proxyWs.send(message.toString().replaceAll(LOCAL_DOMAIN, DOCKER_DOMAIN));
    } else {
      console.log("buffering proxy websocket message!");
      proxyWsBuffer.push(message);
    }
  });
  ws.on("close", () => {
    proxyWs.close();
  });

  proxyWs.on("open", () => {
    console.log("proxy websocket opened!");
    for (const message of proxyWsBuffer) {
      console.log("sending buffered proxy websocket message!");
      proxyWs.send(message.toString().replaceAll(LOCAL_DOMAIN, DOCKER_DOMAIN));
    }
    proxyWs.on("message", (message) => {
      console.log("sending websocket message!");
      ws.send(message.toString().replaceAll(DOCKER_DOMAIN, LOCAL_DOMAIN));
    });
  });
  proxyWs.on("close", () => {
    ws.close();
  });
});

// proxy HTTP
app.use(
  proxy(DOCKER_DOMAIN, {
    proxyReqBodyDecorator: function (bodyContent) {
      return bodyContent
        .toString("utf-8")
        .replaceAll(LOCAL_DOMAIN, DOCKER_DOMAIN);
    },
    userResDecorator: function (_proxyRes, proxyResData) {
      const data = proxyResData.toString("utf-8") as string;
      return data.replaceAll(DOCKER_DOMAIN, LOCAL_DOMAIN);
    },
  })
);

app.listen(80);
