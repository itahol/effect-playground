import { Effect, Stream } from "effect";
import * as Okta from "./okta.js";

const main = Effect.gen(function* () {
  Effect.log("Starting Okta User Listing...");
  const users = Okta.listOktaUsers;
  yield* users.pipe(
    Stream.tap((user) =>
      Effect.log(`User: ${user.profile?.firstName} ${user.profile?.lastName}`)
    ),
    Stream.runDrain
  );
}).pipe(Effect.provide(Okta.fromEnv));

Effect.runPromiseExit(
  main.pipe(
    Effect.catchAll((err) => Effect.logError(`Main effect failed: ${err}`))
  )
);
