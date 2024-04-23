import Hapi, { RequestEvent } from "@hapi/hapi"
import http from "http"
import { EitherAsync } from "purify-ts"
import tracer from "tracer"
import { RateLimiter } from "../rate-limiter/rate-limiter.js"
import { Cache } from "../rate-limiter/rate-limiter.repository.js"
import { Temperature, Weather } from "../weather/weather.js"

const logger = tracer.colorConsole();

const server = Hapi.server(
	{
		port: 3000,
		host: "localhost"
	})

const ip = (request: Hapi.Request) =>
	request.headers['x-real-ip'] ||
	request.info.remoteAddress;

server.route({
	method: "GET",
	path: "/weather",
	handler: async (request) => {
		request.log("info", "new incoming request")

		let result = await EitherAsync.liftEither(
			Weather.validation(request.query))
			.ifLeft(() => request.log("info", {
				message: "validation failed with payload",
				data: request.payload
			}))
			.ifRight(() => request.log("info", {
				message: "payload validated",
				data: request.query
			}))
			.ifRight(() => request.log("info", {
				message: "checking rate limit.",
				ip: ip(request),
			}))
			.chain(x =>
				RateLimiter.check(ip(request))
					.ifRight(calls => request.log("info", {
						message: "api calls",
						calls
					}))
					.map(_ => x))
			.chain(x =>
				EitherAsync.liftEither(Temperature.getCache(x))
					.ifLeft(({ error, data }) => request.log("info", {
						hash: Weather.hash(data),
						error: error.toLog()
					}))
					.ifRight(x => request.log("info", {
						message: "got data from cache",
						data: x
					}))
					.chainLeft(({ data }) =>
						Temperature.Api(data)
							.ifRight(() => request.log("info", "set the data in cache"))
							.ifRight(x => Temperature.setCache(x)
								.ifLeft((error) => request.log("error", {
									message: "error when inserting datai in cache",
									error: error.toLog()
								})))
					)
			).run()

		result.ifLeft(error => request.log("error", error.toLog()))

		return result.map(({ celcius, fahrenheit }) => ({
			celcius,
			fahrenheit
		}))
	}
})


server.route({
	method: '*',
	path: '/{any*}',
	handler: function (_, h) {
		return h.response({
			statusCode: 404,
			error: http.STATUS_CODES[404],
			message: "the path is not found"
		}).code(404);
	}
});

const logMessage = (event: RequestEvent) => typeof event === "string" ?
	event :
	{
		request: (event as any).request,
		timestamp: event.timestamp,
		data: event.data
	}

server.events.on('log', (event, tags) =>
	logger[tags.error ? "error" : "info"](logMessage(event))
);

server.events.on('request', (_, event, tags) =>
	logger[tags.info ? "info" : "error"](logMessage(event))
);

export async function ServerInit() {
	await Cache.start()

	await server.initialize()

	return server
}

export async function ServerStart() {
	await server.start()

	server.start().then(() => server.log("server started on port 3000"))

	return server
}

export async function ServerStop() {
	await Cache.stop()
	await server.stop()

	return server
}



