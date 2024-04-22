import assert from "node:assert";
import { describe, it } from "node:test";
import { Left, Right } from "purify-ts";
import { HttpError } from "../errors/errors.js";
import { CelciusToFarenheit, FarhenheitToCelcius, GetTemperatureCache, WeatherHash, WeatherValidation } from "./weather.js";

describe('weather request', () => {
	it("does not pass the validation when the city is missing", () => {
		const result = WeatherValidation({ city: "", date: new Date().toISOString() })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: city")))
	})

	it("does not pass the validation when the date is invalid", () => {
		const result = WeatherValidation({ city: "Lille", date: "bad" })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: date")))
	})

	it("does not pass the validation when the date format is not iso8601", () => {
		const result = WeatherValidation({ city: "Lille", date: new Date().toString() })

		assert.deepEqual(result, Left(new HttpError(422, "Invalid fields: date")))
	})


	it("return the weather when the data are valid", () => {
		const date = new Date().toISOString()
		const result = WeatherValidation({ city: "Lille", date })

		assert.deepEqual(result, Right({
			city: "Lille",
			date
		}))
	})

	it("return a hash representation", () => {
		assert.strictEqual(WeatherHash({
			city: "Lille",
			date: "2024-04-22T14:48:00.000Z"
		}), "5b624b36c42f5a4012b87ce2b9915e3a")
	})
});

describe("temperature cache", () => {
	it("return the weather request data and the temperature when the temperature is in cache", () => {
		const getCacheValue = (_: String) => Right({ celcius: 0, fahrenheit: 32 })

		const result = GetTemperatureCache({
			city: "Lille",
			date: "2024-04-22T14:48:00.000Z"
		}, getCacheValue)

		assert.deepEqual(result, Right({
			city: "Lille",
			date: "2024-04-22T14:48:00.000Z",
			celcius: 0,
			fahrenheit: 32
		}))
	})

	it("return the weather request data when the temperature is not in cache", () => {
		const getCacheValue = (_: String) => Left(null)

		const result = GetTemperatureCache({
			city: "Lille",
			date: "2024-04-22T14:48:00.000Z"
		}, getCacheValue)

		assert.deepEqual(result, Left({
			city: "Lille",
			date: "2024-04-22T14:48:00.000Z",
		}))
	})
})


describe("temperature converter", () => {
	it("convert farhenheit to celcius", () => {
		assert.strictEqual(FarhenheitToCelcius(50), 10)
	})

	it("convert celcius to farhenheit", () => {
		assert.strictEqual(CelciusToFarenheit(10), 50)
	})

})
