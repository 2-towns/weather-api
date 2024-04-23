import { Either, Left, Right } from "purify-ts"
import { WEATHER_CACHE_DURATION_IN_SEC } from "../config/config.js"
import { DB } from "../db/db.js"
import { HttpError } from "../errors/errors.js"
import { Temperature } from "./weather.js"


export type TemperatureRepository = {
	getCacheValue(hash: string): Either<null, Temperature.Type>
	setCacheValue(hash: string, temperature: Temperature.Type): Either<HttpError, null>
}

export const TemperatureRepository: TemperatureRepository = {
	getCacheValue(hash: string): Either<null, Temperature.Type> {
		const sql = "SELECT celcius, fahrenheit FROM temperature_cache WHERE key = ? AND (unixepoch('now') - unixepoch(expiration)) < ?"

		try {
			const stmt = DB.prepare<[string, number]>(sql)

			const result = <Temperature.Type>stmt.get(hash, WEATHER_CACHE_DURATION_IN_SEC)
			return result ? Right(result) : Left(null)
		} catch (e) {
			return Left(null)
		}
	},

	setCacheValue(hash: string, { celcius, fahrenheit }: Temperature.Type) {
		const sql = "INSERT INTO temperature_cache (key, celcius, fahrenheit, expiration) VALUES (?, ?, ?, ?)"
		const stmt = DB.prepare<[string, number, number, string]>(sql)

		try {
			stmt.run(hash, celcius, fahrenheit, new Date().toISOString())
			return Right(null)
		} catch (e) {
			return Left(new HttpError(500, "Something went wrong", e))
		}
	}

}

