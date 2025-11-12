import { Indexer } from "./indexer/indexer.js";
import { logger } from "./utils/logger.js";

const indexer = new Indexer();

indexer.start().catch((error) => {
  logger.error("Failed to start indexer:", error);
  process.exit(1);
});

