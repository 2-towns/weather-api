import http from "http"

export class HttpError {
	readonly statusCode: number
	readonly message: string
	readonly #error?: Error
	readonly error: String | undefined

	constructor(code: number, message: string, error?: unknown) {
		this.statusCode = code
		this.message = message
		this.error = http.STATUS_CODES[code]

		if (error instanceof Error) {
			this.#error = error
		}
	}

	toLog() {
		return {
			statusCode: this.statusCode,
			message: this.message,
			error: this.error,
			_error: this.#error
		}
	}
}
