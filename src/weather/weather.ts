import crypto from "crypto"
import { Either, EitherAsync, Left, Right } from "purify-ts"
import { z } from "zod"
import { WEATHER_API_URL } from "../config/config.js"
import { HttpError } from "../errors/errors.js"
import { TemperatureRepository } from "./weather.repository.js"

export const WeatherRequest = z.object({
	city: z.string().min(1),
	date: z.string().datetime()
})

export type WeatherRequest = z.infer<typeof WeatherRequest>

export type Temperature = {
	celcius: number
	fahrenheit: number
}

type WeatherValidation = (o: Object) => Either<HttpError, WeatherRequest>

export const WeatherValidation: WeatherValidation = o => {
	let result = WeatherRequest.safeParse(o)
	return result.success ?
		Right(result.data) :
		Left(new HttpError(422, "Invalid fields: " +
			result.error.errors.map(error => error.path).join("")
		))
}

export type WeatherHash = (weather: WeatherRequest) => string

export const WeatherHash: WeatherHash = (weather) =>
	crypto.createHash('md5').update(
		weather.city.toLowerCase() + weather.date
	).digest('hex')

export type GetTemperatureCache = (
	weather: WeatherRequest,
	getCacheValue?: typeof TemperatureRepository.getCacheValue
) => Either<WeatherRequest, WeatherRequestAndTemperature>

export const GetTemperatureCache: GetTemperatureCache =
	(weather, getCacheValue = TemperatureRepository.getCacheValue) =>
		getCacheValue(WeatherHash(weather))
			.mapLeft(_ => weather)
			.map(temperature => ({ ...weather, ...temperature }))

export type WeatherRequestAndTemperature = WeatherRequest & Temperature

export type SetTemperatureCache = (
	data: WeatherRequestAndTemperature,
	set?: typeof TemperatureRepository.setCacheValue
) => Either<HttpError, null>

export const SetTemperatureCache: SetTemperatureCache = (
	{ celcius, fahrenheit, city, date },
	setCacheValue = TemperatureRepository.setCacheValue
) => setCacheValue(WeatherHash({ city, date }), { celcius, fahrenheit })

export type TemperatureApiResponse =
	{ celcius?: number, fahrenheit: number } |
	{ celcius: number, fahrenheit?: number } |
	{ celcius: number, fahrenheit: number }

export const FarhenheitToCelcius = (farhenheit: number) => Math.round(((farhenheit - 32) / 1.8) * 100) / 100

export const CelciusToFarenheit = (celcius: number) => Math.round((celcius * 1.8 + 32) * 100) / 100

const IsEmptyApiResponse = (json: TemperatureApiResponse) => json.fahrenheit === undefined && json.celcius === undefined

export const TemperatureApi = (weather: WeatherRequest): EitherAsync<HttpError, WeatherRequestAndTemperature> =>
	EitherAsync.fromPromise<HttpError, Response>(
		() => fetch(WEATHER_API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(weather)
		})
			.then(res => res.ok ?
				Right(res) :
				Left(new HttpError(500, res.statusText)))
			.catch(e => Left(new HttpError(500, "Something went wrong.", e)))
	)
		.chain(res => EitherAsync.fromPromise(
			() => res.json()
				.then((json) => IsEmptyApiResponse(json as TemperatureApiResponse) ?
					Left(new HttpError(500, "no data")) :
					Right(json as TemperatureApiResponse)
				)
				.catch(_ => Left(new HttpError(500, "Something went wrong")))
		)).map(json => {
			const { celcius, fahrenheit } = json

			return {
				...weather,
				celcius: celcius !== undefined ? celcius : FarhenheitToCelcius(fahrenheit!),
				fahrenheit: fahrenheit !== undefined ? fahrenheit : CelciusToFarenheit(celcius!)
			}
		})

