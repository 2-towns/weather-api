import { parseEnv, z } from "znv";

export const {
	DB_NAME,
	RATE_PERIOD_IN_SEC,
	RATE_LIMIT,
	WEATHER_API_URL,
	WEATHER_CACHE_DURATION_IN_SEC
} = parseEnv(process.env, {
	DB_NAME: z.string().optional().default("db.sqlite"),
	RATE_PERIOD_IN_SEC: z.number().optional().default(10),
	RATE_LIMIT: z.number().optional().default(5),
	WEATHER_API_URL: z.string().optional().default("https://staging.v4.api.wander.com/hiring-test/weather"),
	WEATHER_CACHE_DURATION_IN_SEC: z.number().optional().default(60 * 10),
})

