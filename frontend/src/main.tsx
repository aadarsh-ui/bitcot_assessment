import React, { useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { AuthProvider, useAuth } from "react-oidc-context";
import App from "./App";
import "./styles.css";

const issuer = import.meta.env.VITE_COGNITO_ISSUER;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI ?? `${window.location.origin}/`;
const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI ?? `${window.location.origin}/`;
const httpUrl = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? "http://localhost:4000/graphql";
const wsUrl = import.meta.env.VITE_GRAPHQL_WS_URL ?? "ws://localhost:4000/graphql";

class ApiGatewayWebSocket extends WebSocket {
  constructor(url: string | URL, _protocols?: string | string[]) {
    super(url);
  }
}

function AuthenticationGate() {
  const auth = useAuth();
  const token = auth.user?.id_token;

  const client = useMemo(() => {
    if (!token) return null;

    const httpLink = new HttpLink({ uri: httpUrl });
    const authenticatedHttpLink = setContext((_, { headers }) => ({
      headers: { ...headers, Authorization: `Bearer ${token}` }
    }));
    const wsClient = createClient({
      url: wsUrl,
      webSocketImpl: ApiGatewayWebSocket,
      connectionParams: { Authorization: `Bearer ${token}` }
    });
    const wsLink = new GraphQLWsLink(wsClient);
    const link = split(({ query }) => {
      const def = getMainDefinition(query);
      return def.kind === "OperationDefinition" && def.operation === "subscription";
    }, wsLink, authenticatedHttpLink.concat(httpLink));

    return new ApolloClient({ link, cache: new InMemoryCache() });
  }, [token]);

  useEffect(() => () => {
    if (client) {
      client.stop();
    }
  }, [client]);

  if (auth.isLoading) return <main className="auth-page"><p>Checking your sign-in…</p></main>;
  if (auth.error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Sign-in failed</h1>
          <p>{auth.error.message}</p>
          <button className="primary" onClick={() => void auth.signinRedirect()}>Try again</button>
        </section>
      </main>
    );
  }
  if (!auth.isAuthenticated || !client) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand"><span>✓</span> Taskflow</div>
          <h1>Sign in to Taskflow</h1>
          <p>Use your assessment account to manage your tasks.</p>
          <button className="primary" onClick={() => void auth.signinRedirect()}>Sign in</button>
        </section>
      </main>
    );
  }

  return <ApolloProvider client={client}><App /></ApolloProvider>;
}

if (!issuer || !clientId) {
  throw new Error("Missing VITE_COGNITO_ISSUER or VITE_COGNITO_CLIENT_ID configuration");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider
      authority={issuer}
      client_id={clientId}
      redirect_uri={redirectUri}
      post_logout_redirect_uri={logoutUri}
      response_type="code"
      scope="openid email"
      onSigninCallback={() => window.history.replaceState({}, document.title, window.location.pathname)}
    >
      <AuthenticationGate />
    </AuthProvider>
  </React.StrictMode>
);
