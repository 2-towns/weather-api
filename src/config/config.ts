import { parseEnv, z } from "znv";

export const {
	DB_NAME,
	RATE_PERIOD_IN_SEC,
	RATE_LIMIT_PER_PERIOD,
	WEATHER_API_URL
} = parseEnv(process.env, {
	DB_NAME: z.string().optional().default("db.sqlite"),
	RATE_PERIOD_IN_SEC: z.number().optional().default(10),
	RATE_LIMIT_PER_PERIOD: z.number().optional().default(5),
	WEATHER_API_URL: z.string().optional().default("https://staging.v4.api.wander.com/hiring-test/weather")
})


