import crypto from "crypto"
import { Either, EitherAsync, Left, Maybe, Right } from "purify-ts"
import { ZodError, z } from "zod"
import { WEATHER_API_URL } from "../config/config.js"
import { HttpError } from "../errors/errors.js"
import { TemperatureRepository } from "./temperature.repository.js"

export namespace Weather {
	export const request = z.object({
		location: z.string().min(1),
		date: z.string().datetime()
	}).strict()

	export type Request = z.infer<typeof Weather.request>

	export type Validation = (o: Object) => Either<HttpError, Weather.Request>


	const zodErrorToString = (error: ZodError) => {
		const paths = error.errors.map(error => error.path).join("")

		return !paths ? "" : ": " + paths
	}


	export const validation: Validation = o => {
		let result = request.safeParse(o)
		return result.success ?
			Right(result.data) :
			Left(new HttpError(422, "Invalid fields" +
				zodErrorToString(result.error)
			))
	}

	export type Hash = (weather: Weather.Request) => string

	export const hash: Hash = (weather) =>
		crypto.createHash('md5').update(
			weather.location.toLowerCase() + weather.date
		).digest('hex')
}

export namespace Temperature {
	export type Type = {
		celcius: number
		fahrenheit: number
	}

	type GetCache = (
		weather: Weather.Request,
		getCacheValue?: typeof TemperatureRepository.getCacheValue
	) => Either<{ error: HttpError, data: Weather.Request }, WeatherRequestAndTemperature>

	export const getCache: GetCache =
		(weather, getCacheValue = TemperatureRepository.getCacheValue) =>
			getCacheValue(Weather.hash(weather))
				.mapLeft(error => ({ error, data: weather }))
				.map(temperature => ({ ...weather, ...temperature }))

	export type SetCache = (
		data: WeatherRequestAndTemperature,
		set?: typeof TemperatureRepository.setCacheValue
	) => Either<HttpError, null>

	export const setCache: SetCache = (
		{ celcius, fahrenheit, location, date },
		setCacheValue = TemperatureRepository.setCacheValue
	) => setCacheValue(Weather.hash({ location, date }), { celcius, fahrenheit })

	export const farhenheitToCelcius = (farhenheit: number) => Math.round(((farhenheit - 32) / 1.8) * 100) / 100
	export const celciusToFarenheit = (celcius: number) => Math.round((celcius * 1.8 + 32) * 100) / 100

	export type ApiResponse =
		{ celcius?: number, fahrenheit: number } |
		{ celcius: number, fahrenheit?: number } |
		{ celcius: number, fahrenheit: number }

	const isEmptyApiResponse = (json: ApiResponse) =>
		Maybe.fromNullable(json.fahrenheit).alt(Maybe.fromNullable(json.celcius)).isNothing()

	const callApi = (weather: Weather.Request) => fetch(WEATHER_API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(weather)
	})
		.then(res => res.ok ?
			Right(res) :
			Left(new HttpError(500, res.statusText)))
		.catch(e => Left(new HttpError(500, "Something went wrong.", e)))

	export const Api = (weather: Weather.Request): EitherAsync<HttpError, WeatherRequestAndTemperature> =>
		EitherAsync.fromPromise<HttpError, Response>(
			() => callApi(weather))

			// Retry once if the api returns an error 
			.chainLeft(() => EitherAsync.fromPromise(() => callApi(weather)))

			.chain(res => EitherAsync.fromPromise(
				() => res.json()
					.then((json) => isEmptyApiResponse(json as ApiResponse) ?
						Left(new HttpError(500, "no data")) :
						Right(json as ApiResponse)
					)
					.catch(e => Left(new HttpError(500, "Something went wrong", e)))
			)).map(json => {
				const { celcius, fahrenheit } = json

				return {
					...weather,
					celcius: Maybe.fromNullable(celcius).orDefault(farhenheitToCelcius(fahrenheit!)),
					fahrenheit: Maybe.fromNullable(fahrenheit).orDefault(celciusToFarenheit(celcius!))
				}
			})
}

export type WeatherRequestAndTemperature = Weather.Request & Temperature.Type







