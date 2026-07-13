import { copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const seedPath = path.join(root, "src", "data", "store.seed.json");
const storePath = path.join(root, "src", "data", "store.json");

await copyFile(seedPath, storePath);
console.log("Store reset from seed data.");

