import FetchHeaders from '../Headers';
import { RequestOptions } from '../interfaces';
import Response from '../Response';
import { generateRequestUrl } from '../util';
import TimeoutError from '../TimeoutError';
import Task from 'dojo-core/async/Task';
import { Handle } from 'dojo-core/interfaces';
import { createHandle } from 'dojo-core/lang';
import { forOf } from 'dojo-shim/iterator';

/**
 * The Headers class used by the native fetch implementation. We only need to use one method on this
 */
declare class Headers {
	append(name: string, value: string): void;
}

/**
 * Special options just for fetch request. The fetch API supports a lot of cool stuff, CORS, authentication, etc,
 * that would probably be passed in here.
 */
export interface FetchRequestOptions extends RequestOptions {
}

/**
 * Request class used by the native fetch implementation
 */
declare class Request {
	constructor(url: string, options?: any);
}

/**
 * Fetch doesn't exist in the TS libs yet
 */
declare function fetch(_: any): any;

/**
 * A Response object that wraps a fetch Response. Since our response object is based on fetch
 * this is mostly just a wrapper.
 */
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
		if (!('formData' in this.nativeResponse)) {
			return Task.reject(new TypeError('FormData is not supported in the native fetch implementation'));
		}

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

/**
 * Create a promise that will resolve with a fetch response. This will use the browsers native fetch API to make
 * and HTTP request.
 *
 * @param url       {string}                The URL to request
 * @param options   {FetchRequestOptions}   Options for this request
 * @return {Task<FetchResponse>}
 */
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

		forOf(headers.entries(), ([ header, value ]) => {
			fetchRequestHeaders.append(header.toLowerCase(), value);
		});
	}

	if (requestOptions.body) {
		fetchRequestOptions.body = requestOptions.body;
	}

	fetchRequestOptions.headers = fetchRequestHeaders;

	const request = new Request(requestUrl, fetchRequestOptions);

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
