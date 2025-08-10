import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import "dotenv/config";
import { Effect, Option, pipe, Stream } from "effect";
import * as Okta from "./okta.js";

const detectUsers = Effect.gen(function*() {
  yield* Effect.log("Starting to detect Okta users");
  yield* pipe(
    Okta.listOktaUsers,
    Stream.tap((user) => Effect.log(`User: ${user.profile?.firstName} ${user.profile?.lastName}`)),
    Stream.runDrain
  );
  yield* Effect.log("Finished detecting Okta users");
}).pipe(Effect.withSpan("detectUsers"));

const detectGroups = Effect.gen(function*() {
  yield* Effect.log("Starting to detect Okta groups");
  yield* pipe(
    Okta.listOktaGroups,
    Stream.tap((group) => Effect.log(`Group: ${group.profile?.name}`)),
    Stream.map((group) => Option.fromNullable(group?.id).pipe(Option.getOrThrow)),
    Stream.mapEffect(detectGroupMembers, { concurrency: "unbounded" }),
    Stream.runDrain
  );
  yield* Effect.log("Finished detecting Okta groups");
}).pipe(Effect.withSpan("detectGroups"));

const detectGroupMembers = (groupId: string) =>
  Effect.gen(function*() {
    Effect.annotateLogsScoped({ groupId });
    yield* Effect.log("Starting to detect Okta group member");
    yield* pipe(
      Okta.listOktaGroupMembers(groupId),
      Stream.tap((user) =>
        Effect.log(
          `Group ID ${groupId} - Group Member: ${user.profile?.firstName} ${user.profile?.lastName} ID ${user.id}`
        )
      ),
      Stream.runDrain
    );
    yield* Effect.log("Finished detecting Okta group member");
  }).pipe(Effect.withSpan("detectGroupMembers", { attributes: { groupId } }));

const oktaScan = Effect.gen(function*() {
  yield* Effect.log("Starting Okta scan");
  yield* Effect.all([
    detectUsers,
    detectGroups
  ], { concurrency: "unbounded" });
  yield* Effect.log("Okta scan completed");
}).pipe(
  Effect.withSpan("oktaScan"),
  Effect.provide(Okta.fromEnv)
);

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "okta-assets-detector" },
  // Export span data to the console
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter())
}));

Effect.runPromiseExit(
  oktaScan.pipe(
    Effect.provide(NodeSdkLive),
    Effect.catchAllCause(Effect.logError)
  )
);
