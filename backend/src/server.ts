import http from "node:http";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./schema.js";
import { createResolvers } from "./resolvers.js";
import { authenticate } from "./auth.js";
import { prisma, databaseHealth } from "./db.js";

const port = Number(process.env.PORT ?? 4000);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/ready", async (_req, res) => {
  try { await databaseHealth(); res.status(200).json({ status: "ready" }); }
  catch { res.status(503).json({ status: "not_ready" }); }
});

const schema = makeExecutableSchema({ typeDefs, resolvers: createResolvers() });

const apollo = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== "production",
  plugins: [{
    async requestDidStart() {
      return {
        async didEncounterErrors(ctx) {
          console.error(JSON.stringify({
            level: "ERROR", service: "graphql-ecs", operation: ctx.operationName ?? "unknown",
            errors: ctx.errors.map(error => error.extensions?.code ?? "INTERNAL_ERROR")
          }));
        }
      };
    }
  }]
});

await apollo.start();
app.use("/graphql", expressMiddleware(apollo, {
  context: async ({ req }) => ({ userId: await authenticate(req.headers.authorization) })
}));

const httpServer = http.createServer(app);
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
useServer({
  schema,
  context: async (ctx) => {
    const connectionParams = ctx.connectionParams as Record<string, string> | undefined;
    const authorization = connectionParams?.Authorization ?? connectionParams?.authorization;
    return { userId: await authenticate(authorization) };
  },
  onConnect: () => true,
  onDisconnect: () => {}
}, wsServer as any);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "INFO", service: "graphql-ecs", event: "started", port }));
});

async function shutdown(signal: string) {
  console.log(JSON.stringify({ level: "INFO", service: "graphql-ecs", event: "shutdown", signal }));
  httpServer.close();
  await apollo.stop();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
