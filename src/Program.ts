import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Effect } from "effect";
import { oktaScan } from "./asset-detector.js";

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
