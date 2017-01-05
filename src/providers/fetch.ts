import { RequestOptions } from '../interfaces';
import FetchHeaders from '../Headers';
import Response from '../Response';
import TimeoutError from '../TimeoutError';
import { generateRequestUrl } from '../util';
import { Handle } from 'dojo-core/interfaces';
import { createHandle } from 'dojo-core/lang';
import Task from 'dojo-core/async/Task';
import { forOf } from 'dojo-shim/iterator';

export interface FetchRequestOptions extends RequestOptions {
}

declare class Request {
	constructor(url: string, options?: any);
}

declare class Headers {
	append(name: string, value: string): void;
}

declare function fetch(_: any): any;

export class FetchResponse extends Response {
	readonly headers: FetchHeaders;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;
	readonly requestOptions: FetchRequestOptions;
	readonly nativeResponse: any;

	get bodyUsed(): boolean {
		return this.nativeResponse.bodyUsed;
	}

	constructor(url: string, options: FetchRequestOptions, response: any) {
		super();

		this.headers = new FetchHeaders(response.headers);
		this.nativeResponse = response;
		this.url = url;
		this.status = response.status;
		this.statusText = response.statusText || 'OK';
		this.requestOptions = options;
		this.ok = this.status >= 200 && this.status < 300;
	}

	arrayBuffer(): Task<ArrayBuffer> {
		return new Task<ArrayBuffer>((resolve, reject) => {
			this.nativeResponse.arrayBuffer().then((arrayBuffer: ArrayBuffer) => {
				this.emit({
					type: 'end',
					response: this
				});

				resolve(arrayBuffer);
			}, reject);
		});
	}

	blob(): Task<Blob> {
		return new Task<Blob>((resolve, reject) => {
			this.nativeResponse.blob().then((blob: Blob) => {
				this.emit({
					type: 'end',
					response: this
				});

				resolve(blob);
			}, reject);
		});
	}

	formData(): Task<FormData> {
		return new Task<FormData>((resolve, reject) => {
			this.nativeResponse.formData().then((formData: FormData) => {
				this.emit({
					type: 'end',
					response: this
				});

				resolve(formData);
			}, reject);
		});
	}

	json<T>(): Task<T> {
		return new Task<T>((resolve, reject) => {
			this.nativeResponse.json().then((json: T) => {
				this.emit({
					type: 'end',
					response: this
				});

				resolve(json);
			}, reject);
		});
	}

	text(): Task<string> {
		return new Task<string>((resolve, reject) => {
			this.nativeResponse.text().then((text: string) => {
				this.emit({
					type: 'end',
					response: this
				});

				resolve(text);
			}, reject);
		});
	}

	xml(): Task<Document> {
		return <any> this.text().then((text: string) => {
			this.emit({
				type: 'end',
				response: this
			});

			const parser = new DOMParser();
			return parser.parseFromString(text, this.headers.get('content-type') || 'text/html');
		});
	}
}

export default function fetchRequest(url: string, options?: FetchRequestOptions): Task<FetchResponse> {
	const fetchRequestOptions: any = {};
	const fetchRequestHeaders: Headers = new Headers();
	const requestUrl = generateRequestUrl(url, options);

	const requestOptions = options || {};

	if ((!requestOptions.user || !requestOptions.password) && requestOptions.auth) {
		const auth = requestOptions.auth.split(':');
		requestOptions.user = decodeURIComponent(auth[ 0 ]);
		requestOptions.password = decodeURIComponent(auth[ 1 ]);
	}

	if (requestOptions.user || requestOptions.password) {
		fetchRequestHeaders.append('authorization', `Basic ${btoa(`${requestOptions.user}:${requestOptions.password}`)}`);
	}

	if (requestOptions.cacheBust) {
		fetchRequestOptions.cache = 'reload';
	}

	if (!requestOptions.method) {
		requestOptions.method = 'GET';
	}

	fetchRequestOptions.method = requestOptions.method;

	if (requestOptions.headers) {
		const headers = new FetchHeaders(requestOptions.headers);

		let hasContentTypeHeader = false;
		let hasRequestedWithHeader = false;

		forOf(headers.entries(), ([ header, value ]) => {
			if (header.toLowerCase() === 'content-type') {
				hasContentTypeHeader = true;
			}
			else if (header.toLowerCase() === 'x-requested-with') {
				hasRequestedWithHeader = true;
			}
			fetchRequestHeaders.append(header.toLowerCase(), value);
		});
	}

	if (requestOptions.body) {
		fetchRequestOptions.body = requestOptions.body;
	}

	fetchRequestOptions.headers = fetchRequestHeaders;

	let request = new Request(requestUrl, fetchRequestOptions);

	return new Task<FetchResponse>((resolve, reject) => {
		let timeout: Handle;

		fetch(request).then((fetchResponse: any) => {
			timeout && timeout.destroy();

			const response = new FetchResponse(requestUrl, requestOptions, fetchResponse);

			response.emit({
				type: 'start',
				response: response
			});

			resolve(response);
		}, reject);

		if (requestOptions.timeout > 0 && requestOptions.timeout !== Infinity) {
			timeout = ((): Handle => {
				const timer = setTimeout(function (): void {
					const error = new TimeoutError(`Request timed out after ${requestOptions.timeout}ms`);
					reject(error);
				}, requestOptions.timeout);

				return createHandle((): void => {
					clearTimeout(timer);
				});
			})();
		}
	});
}
