import "dotenv/config";
import { Effect, Option, pipe, Stream } from "effect";
import * as OktaClient from "./client.js";

const detectUsers = Effect.gen(function*() {
  yield* Effect.log("Starting to detect Okta users");
  yield* pipe(
    OktaClient.listOktaUsers,
    Stream.tap((user) => Effect.log(`User: ${user.profile?.firstName} ${user.profile?.lastName}`)),
    Stream.runDrain
  );
  yield* Effect.log("Finished detecting Okta users");
}).pipe(Effect.withSpan("detectUsers"));

const detectGroups = Effect.gen(function*() {
  yield* Effect.log("Starting to detect Okta groups");
  yield* pipe(
    OktaClient.listOktaGroups,
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
      OktaClient.listOktaGroupMembers(groupId),
      Stream.tap((user) =>
        Effect.log(
          `Group ID ${groupId} - Group Member: ${user.profile?.firstName} ${user.profile?.lastName} ID ${user.id}`
        )
      ),
      Stream.runDrain
    );
    yield* Effect.log("Finished detecting Okta group member");
  }).pipe(Effect.withSpan("detectGroupMembers", { attributes: { groupId } }));

export const oktaScan = Effect.gen(function*() {
  yield* Effect.log("Starting Okta scan");
  yield* Effect.all([
    detectUsers,
    detectGroups
  ], { concurrency: "unbounded" });
  yield* Effect.log("Okta scan completed");
}).pipe(
  Effect.withSpan("oktaScan"),
  Effect.provide(OktaClient.fromEnv)
);
