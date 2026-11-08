export { paths, isServerWritten, isAppendOnly,
         SERVER_WRITTEN_COLLECTIONS, APPEND_ONLY_SUBCOLLECTIONS } from "./paths";
export type { ServerWrittenCollection } from "./paths";

export { createMeta, updateMeta, softDeleteMeta, CURRENT_SCHEMA_VERSION } from "./meta";
export type { DocumentMeta } from "./meta";

export { readConfig, isConfigured, FirebaseConfigError, EMULATOR_PORTS } from "./config";
export type { NNFirebaseConfig, NNRuntimeConfig } from "./config";
