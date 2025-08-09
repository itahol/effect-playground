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
});

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
});

const detectGroupMembers = (groupId: string) =>
  Effect.gen(function*() {
    yield* Effect.log(`Detecting members for group ID: ${groupId}`);
    const members = Okta.listOktaGroupMembers(groupId);
    yield* members.pipe(
      Stream.tap((user) =>
        Effect.log(
          `Group ID ${groupId} - Group Member: ${user.profile?.firstName} ${user.profile?.lastName} ID ${user.id}`
        )
      ),
      Stream.runDrain
    );
    yield* Effect.log(`Finished detecting members for group ID: ${groupId}`);
  });

const oktaScan = Effect.gen(function*() {
  yield* Effect.log("Starting Okta scan");
  yield* Effect.all([
    detectUsers,
    detectGroups
  ], { concurrency: "unbounded" });
  yield* Effect.log("Okta scan completed");
}).pipe(Effect.provide(Okta.fromEnv));

Effect.runPromiseExit(
  oktaScan.pipe(
    Effect.timed,
    Effect.tap((timing) => Effect.log(`Main effect completed in ${timing}`)),
    Effect.catchAll((err) => Effect.logError(`Main effect failed: ${err}`))
  )
);
