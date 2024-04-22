import { readFileSync } from "fs";
import { DB } from "./db.js"

const migration = readFileSync("./static/migration.sql")

DB.exec(migration.toString())
