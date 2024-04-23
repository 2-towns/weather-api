import assert from "node:assert";
import { describe, it } from "node:test";
import { Left, Right } from "purify-ts";
import { HttpError } from "../errors/errors.js";
import { Temperature, Weather } from "./weather.js";

describe('weather request', () => {
	it("does not pass the validation when the city is missing", () => {
		const result = Weather.validation({ city: "", date: new Date().toISOString() })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: city")))
	})

	it("does not pass the validation when the date is invalid", () => {
		const result = Weather.validation({ city: "San francisco", date: "bad" })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: date")))
	})

	it("does not pass the validation when the date format is not iso8601", () => {
		const result = Weather.validation({ city: "San francisco", date: new Date().toString() })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: date")))
	})


	it("return the weather when the data are valid", () => {
		const date = new Date().toISOString()
		const result = Weather.validation({ city: "San francisco", date })

		assert.deepEqual(result, Right({
			city: "San francisco",
			date
		}))
	})

	it("return a hash representation", () => {
		assert.strictEqual(Weather.hash({
			city: "San francisco",
			date: "2024-04-22T14:48:00.000Z"
		}), "6b80f37baddbe8ca43a645a0a66bf8dd")
	})
});

describe("temperature cache", () => {
	it("return the weather request data and the temperature when the temperature is in cache", () => {
		const getCacheValue = (_: String) => Right({ celcius: 0, fahrenheit: 32 })

		const result = Temperature.getCache({
			city: "San francisco",
			date: "2024-04-22T14:48:00.000Z"
		}, getCacheValue)

		assert.deepEqual(result, Right({
			city: "San francisco",
			date: "2024-04-22T14:48:00.000Z",
			celcius: 0,
			fahrenheit: 32
		}))
	})

	it("return the weather request data when the temperature is not in cache", () => {
		const getCacheValue = (_: String) => Left(null)

		const result = Temperature.getCache({
			city: "San francisco",
			date: "2024-04-22T14:48:00.000Z"
		}, getCacheValue)

		assert.deepEqual(result, Left({
			city: "San francisco",
			date: "2024-04-22T14:48:00.000Z",
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
