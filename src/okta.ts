import OktaSdk from "@okta/okta-sdk-nodejs";
import type { V2Configuration } from "@okta/okta-sdk-nodejs/src/types/configuration.js";
import { Config, Context, Data, Effect, Layer, Stream } from "effect";

export class OktaError extends Data.TaggedError("OktaError")<{
  cause?: unknown;
  message?: string;
}> {}

const OktaClient = OktaSdk.Client;

interface OktaImpl {
  use: <T>(
    fn: (client: InstanceType<typeof OktaClient>) => T
  ) => Effect.Effect<Awaited<T>, OktaError, never>;
}
export class Okta extends Context.Tag("Okta")<Okta, OktaImpl>() {}

export const make = (config: V2Configuration) =>
  Effect.gen(function*() {
    const client = yield* Effect.try({
      try: () => new OktaClient(config),
      catch: (e) => new OktaError({ cause: e, message: "Failed to create Okta client" })
    });
    return Okta.of({
      use: (fn) =>
        Effect.gen(function*() {
          const result = yield* Effect.try({
            try: () => fn(client),
            catch: (e) =>
              new OktaError({
                cause: e,
                message: "Synchronous error in `Okta.use`"
              })
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new OktaError({
                  cause: e,
                  message: "Asynchronous error in `Okta.use`"
                })
            });
          } else {
            return result;
          }
        })
    });
  });

export const layer = (config: V2Configuration) => Layer.scoped(Okta, make(config));

export const fromEnv = Layer.scoped(
  Okta,
  Effect.gen(function*() {
    const orgUrl = yield* Config.string("OKTA_ORG_URL");
    const token = yield* Config.string("OKTA_API_TOKEN");
    return yield* make({ orgUrl, token });
  })
);

export const listOktaUsers = Effect.gen(function*() {
  const okta = yield* Okta;
  const response = yield* okta.use((client) => client.userApi.listUsers());
  return collectionToStream(response);
}).pipe(Stream.unwrap);

export const listOktaGroups = Effect.gen(function*() {
  const okta = yield* Okta;
  const response = yield* okta.use((client) => client.groupApi.listGroups());
  return collectionToStream(response);
}).pipe(Stream.unwrap);

export const listOktaGroupMembers = (groupId: string) =>
  Effect.gen(function*() {
    const okta = yield* Okta;
    const response = yield* okta.use((client) => client.groupApi.listGroupUsers({ groupId }));
    return collectionToStream(response);
  }).pipe(Stream.unwrap);

function collectionToStream<T>(
  collection: OktaSdk.Collection<T>
): Stream.Stream<T, OktaError> {
  return Stream.fromAsyncIterable(
    collection,
    (cause) => new OktaError({ cause })
  ).pipe(Stream.filter((item) => item !== null));
}
