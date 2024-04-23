import { EitherAsync, Left, Right } from "purify-ts"
import { RATE_LIMIT } from "../config/config.js"
import { HttpError } from "../errors/errors.js"
import { RateLimitRepository } from "./rate-limiter.repository.js"

type CheckRateLimit = (ip: string, increment?: typeof RateLimitRepository.increment, limit?: number) => EitherAsync<HttpError, number>

export const CheckRateLimit: CheckRateLimit = (ip, increment = RateLimitRepository.increment, limit = RATE_LIMIT) =>
	increment(ip)
		.chain(x => EitherAsync.liftEither(x > limit ?
			Left(new HttpError(429, "Requests limit reached.")) :
			Right(x)
		))
