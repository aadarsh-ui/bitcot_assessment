import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import App from "./App";
import "./styles.css";

const httpUrl = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? "http://localhost:4000/graphql";
const wsUrl = import.meta.env.VITE_GRAPHQL_WS_URL ?? "ws://localhost:4000/graphql";
const token = sessionStorage.getItem("taskflow_token") ?? "test-token";
const authHeaders = { Authorization: `Bearer ${token}` };
const httpLink = new HttpLink({ uri: httpUrl, headers: authHeaders });
const wsLink = new GraphQLWsLink(createClient({
  url: wsUrl,
  connectionParams: authHeaders
}));
const link = split(({ query }) => {
  const def = getMainDefinition(query);
  return def.kind === "OperationDefinition" && def.operation === "subscription";
}, wsLink, httpLink);
const client = new ApolloClient({ link, cache: new InMemoryCache() });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ApolloProvider client={client}><App /></ApolloProvider></React.StrictMode>
);
