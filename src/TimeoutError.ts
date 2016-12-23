export default class TimeoutError extends Error {
	readonly message: string;

	get name(): string {
		return 'TimeoutError';
	}

	constructor(message?: string) {
		message = message || 'The request timed out';
		super(message);
		this.message = message;
	}
}
