/**
 * Package version - imported from package.json
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as { version: string };

export const VERSION = packageJson.version;
