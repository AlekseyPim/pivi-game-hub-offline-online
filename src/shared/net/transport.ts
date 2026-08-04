/**
 * A transport is a dumb, shared message bus: `send` publishes a message to every
 * OTHER participant (never echoed to the sender), and `subscribe` receives what
 * others publish. This mirrors a Supabase Realtime broadcast channel with
 * `{ self: false }`, so the session logic is identical over Supabase or the
 * in-memory loopback hub used in tests.
 *
 * Every game in the hub speaks its own wire protocol (`games/<id>/net/protocol`),
 * so the message type is a parameter: the transport never inspects a message, it
 * only moves it.
 */
export interface Transport<M> {
  send(msg: M): void;
  subscribe(handler: (msg: M) => void): () => void;
  close(): void;
}

/** In-memory hub for tests/local play: `send` reaches all other endpoints. */
export function createLoopbackHub<M>() {
  interface Endpoint {
    handlers: Set<(msg: M) => void>;
  }
  const endpoints = new Set<Endpoint>();

  return {
    connect(): Transport<M> {
      const ep: Endpoint = { handlers: new Set() };
      endpoints.add(ep);
      return {
        send(msg) {
          for (const other of endpoints) {
            if (other === ep) continue;
            for (const handler of other.handlers) handler(msg);
          }
        },
        subscribe(handler) {
          ep.handlers.add(handler);
          return () => ep.handlers.delete(handler);
        },
        close() {
          endpoints.delete(ep);
        },
      };
    },
  };
}
