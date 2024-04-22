import Database from "better-sqlite3"
import { DB_NAME } from "../config/config.js"

export const DB = new Database(DB_NAME, {})

DB.pragma("journal_mode = WAL")
