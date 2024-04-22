import { Either, Left, Right } from "purify-ts"
import { DB } from "../db/db.js"
import { HttpError } from "../errors/errors.js"
import { Temperature } from "./weather.js"


export type TemperatureRepository = {
	getCacheValue(hash: string): Either<null, Temperature>
	setCacheValue(hash: string, temperature: Temperature): Either<HttpError, null>
}

export const TemperatureRepository: TemperatureRepository = {
	getCacheValue(hash: string): Either<null, Temperature> {
		const sql = "SELECT celcius, fahrenheit FROM temperature_cache WHERE key = ?"

		try {
			const stmt = DB.prepare<[string]>(sql)

			const result = <Temperature>stmt.get(hash)
			return result ? Right(result) : Left(null)
		} catch (e) {
			return Left(null)
		}
	},

	setCacheValue(hash: string, { celcius, fahrenheit }: Temperature) {
		const sql = "INSERT INTO temperature_cache (key, celcius, fahrenheit) VALUES (?, ?, ?)"
		const stmt = DB.prepare<[string, number, number]>(sql)

		try {
			stmt.run(hash, celcius, fahrenheit)
			return Right(null)
		} catch (e) {
			return Left(new HttpError(500, "Something went wrong", e))
		}
	}

}

