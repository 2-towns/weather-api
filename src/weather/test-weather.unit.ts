import assert from "node:assert";
import { describe, it } from "node:test";
import { Left, Right } from "purify-ts";
import { HttpError } from "../errors/errors.js";
import { Temperature, Weather } from "./weather.js";

describe.only('weather request', () => {
	it("does not pass the validation when the location is missing", () => {
		const result = Weather.validation({ location: "", date: new Date().toISOString() })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: location")))
	})

	it("does not pass the validation when the date is invalid", () => {
		const result = Weather.validation({ location: "San francisco", date: "bad" })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: date")))
	})

	it.only("does not pass the validation when the date format is not iso8601", () => {
		const result = Weather.validation({ location: "San francisco", date: new Date().toUTCString() })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: date")))
	})

	it.only("does not pass the validation when there is an extra fields", () => {
		const result = Weather.validation({ location: "San francisco", date: new Date().toISOString(), hello: "world" })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields")))
	})

	it("return the weather when the data are valid", () => {
		const date = new Date().toISOString()
		const result = Weather.validation({ location: "San francisco", date })

		assert.deepEqual(result, Right({
			location: "San francisco",
			date
		}))
	})

	it("return the weather when the data are valid and location contains US state", () => {
		const date = new Date().toISOString()
		const result = Weather.validation({ location: "NY - Austin", date })

		assert.deepEqual(result, Right({
			location: "NY - Austin",
			date
		}))
	})

	it("return a hash representation", () => {
		assert.strictEqual(Weather.hash({
			location: "San francisco",
			date: "2024-04-22T14:48:00.000Z"
		}), "6b80f37baddbe8ca43a645a0a66bf8dd")
	})
});

describe("temperature cache", () => {
	it("return the weather request data and the temperature when the temperature is in cache", () => {
		const getCacheValue = (_: String) => Right({ celcius: 0, fahrenheit: 32 })

		const result = Temperature.getCache({
			location: "San francisco",
			date: "2024-04-22T14:48:00.000Z"
		}, getCacheValue)

		assert.deepEqual(result, Right({
			location: "San francisco",
			date: "2024-04-22T14:48:00.000Z",
			celcius: 0,
			fahrenheit: 32
		}))
	})

	it("return the weather request data when the temperature is not in cache", () => {
		const getCacheValue = (_: String) => Left(new HttpError(404, "no data found in cache"))

		const result = Temperature.getCache({
			location: "San francisco",
			date: "2024-04-22T14:48:00.000Z"
		}, getCacheValue)

		assert.deepEqual(result, Left({
			error: new HttpError(404, "no data found in cache"),
			data: {
				location: "San francisco",
				date: "2024-04-22T14:48:00.000Z",
			}
		}))
	})
})


describe("temperature converter", () => {
	it("convert farhenheit to celcius", () => {
		assert.strictEqual(Temperature.farhenheitToCelcius(50), 10)
	})

	it("convert celcius to farhenheit", () => {
		assert.strictEqual(Temperature.celciusToFarenheit(10), 50)
	})

})
