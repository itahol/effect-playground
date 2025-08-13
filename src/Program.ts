import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Effect, Layer } from "effect";
import { OktaAssetsDetector } from "./asset-detector.js";

const program = Effect.gen(function*() {
  const oktaAssetsDetector = yield* OktaAssetsDetector;
  return yield* oktaAssetsDetector.scan;
});

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "okta-assets-detector" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter())
}));

Effect.runPromiseExit(
  program.pipe(
    Effect.provide(Layer.mergeAll(OktaAssetsDetector.Default, NodeSdkLive)),
    Effect.catchAllCause(Effect.logError)
  )
);
