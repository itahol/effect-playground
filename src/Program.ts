import { Effect, Option, pipe, Stream } from "effect";
import * as Okta from "./okta.js";

const detectGroupMembers = (groupId: string) =>
  Effect.gen(function*() {
    const members = Okta.listOktaGroupMembers(groupId);
    yield* members.pipe(
      Stream.tap((user) =>
        Effect.log(
          `Group ID ${groupId} - Group Member: ${user.profile?.firstName} ${user.profile?.lastName} ID ${user.id}`
        )
      ),
      Stream.runDrain
    );
  });

const program = Effect.gen(function*() {
  Effect.log("Starting Okta User Listing...");
  yield* pipe(
    Okta.listOktaUsers,
    Stream.tap((user) => Effect.log(`User: ${user.profile?.firstName} ${user.profile?.lastName}`)),
    Stream.runDrain
  );
  Effect.log("Starting Okta Group Listing...");
  yield* pipe(
    Okta.listOktaGroups,
    Stream.tap((group) => Effect.log(`Group: ${group.profile?.name}`)),
    Stream.map((group) => Option.fromNullable(group?.id).pipe(Option.getOrThrow)),
    Stream.tap((groupId) => Effect.log(`Group ID: ${groupId}`)),
    Stream.mapEffect(detectGroupMembers, { concurrency: "unbounded" }),
    Stream.runDrain
  );
}).pipe(Effect.provide(Okta.fromEnv));

Effect.runPromiseExit(
  program.pipe(
    Effect.timed,
    Effect.tap((timing) => Effect.log(`Main effect completed in ${timing}`)),
    Effect.catchAll((err) => Effect.logError(`Main effect failed: ${err}`))
  )
);
