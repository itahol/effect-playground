import OktaSdk from "@okta/okta-sdk-nodejs";
import type { V2Configuration } from "@okta/okta-sdk-nodejs/src/types/configuration.js";
import { Config, Context, Data, Duration, Effect, Layer, Schedule, Stream } from "effect";

export class OktaClientError extends Data.TaggedError("OktaClientError")<{
  cause?: unknown;
  message?: string;
}> {}

const OktaSdkClient = OktaSdk.Client;

interface OktaClientImpl {
  use: <T>(
    fn: (client: InstanceType<typeof OktaSdkClient>) => T
  ) => Effect.Effect<Awaited<T>, OktaClientError, never>;
}
export class OktaClient extends Context.Tag("OktaClient")<OktaClient, OktaClientImpl>() {}

export const make = (config: V2Configuration) =>
  Effect.gen(function*() {
    const client = yield* Effect.try({
      try: () => new OktaSdkClient(config),
      catch: (e) => new OktaClientError({ cause: e, message: "Failed to create Okta client" })
    });
    return OktaClient.of({
      use: (fn) =>
        Effect.gen(function*() {
          const result = yield* Effect.try({
            try: () => fn(client),
            catch: (e) =>
              new OktaClientError({
                cause: e,
                message: "Synchronous error in `Okta.use`"
              })
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new OktaClientError({
                  cause: e,
                  message: "Asynchronous error in `Okta.use`"
                })
            });
          } else {
            return result;
          }
        }).pipe(Effect.retry({ schedule: Schedule.exponential(Duration.millis(100)), times: 3 }))
    });
  });

export const layer = (config: V2Configuration) => Layer.scoped(OktaClient, make(config));

export const fromEnv = Layer.scoped(
  OktaClient,
  Effect.gen(function*() {
    const orgUrl = yield* Config.string("OKTA_ORG_URL");
    const token = yield* Config.string("OKTA_API_TOKEN");
    return yield* make({ orgUrl, token });
  })
);

export const listOktaUsers = Effect.gen(function*() {
  const okta = yield* OktaClient;
  const response = yield* okta.use((client) => client.userApi.listUsers());
  return collectionToStream(response);
}).pipe(Stream.unwrap);

export const listOktaGroups = Effect.gen(function*() {
  const okta = yield* OktaClient;
  const response = yield* okta.use((client) => client.groupApi.listGroups());
  return collectionToStream(response);
}).pipe(Stream.unwrap);

export const listOktaGroupMembers = (groupId: string) =>
  Effect.gen(function*() {
    const okta = yield* OktaClient;
    const response = yield* okta.use((client) => client.groupApi.listGroupUsers({ groupId }));
    return collectionToStream(response);
  }).pipe(Stream.unwrap);

function collectionToStream<T>(
  collection: OktaSdk.Collection<T>
): Stream.Stream<T, OktaClientError> {
  return Stream.fromAsyncIterable(
    collection,
    (cause) => new OktaClientError({ cause })
  ).pipe(Stream.filter((item) => item !== null));
}
