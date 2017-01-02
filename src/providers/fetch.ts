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
			this.nativeResponse.arrayBuffer().then(resolve, reject);
		});
	}

	blob(): Task<Blob> {
		return new Task<Blob>((resolve, reject) => {
			this.nativeResponse.blob().then(resolve, reject);
		});
	}

	formData(): Task<FormData> {
		return new Task<FormData>((resolve, reject) => {
			this.nativeResponse.formData().then(resolve, reject);
		});
	}

	json<T>(): Task<T> {
		return new Task<any>((resolve, reject) => {
			this.nativeResponse.json().then(resolve, reject);
		});
	}

	text(): Task<string> {
		return new Task<string>((resolve, reject) => {
			this.nativeResponse.text().then(resolve, reject);
		});
	}

	xml(): Task<any> {
		return this.text().then((text: string) => {
			const parser = new DOMParser();
			return parser.parseFromString(text, this.headers.get('content-type') || 'text/html');
		});
	}
}

export default function fetchRequest(url: string, options?: FetchRequestOptions): Task<FetchResponse> {
	const fetchRequestOptions: any = {};
	const fetchRequestHeaders: Headers = new Headers();
	const requestUrl = generateRequestUrl(url, options);

	options = options || {};

	if ((!options.user || !options.password) && options.auth) {
		const auth = options.auth.split(':');
		options.user = decodeURIComponent(auth[ 0 ]);
		options.password = decodeURIComponent(auth[ 1 ]);
	}

	if (options.user || options.password) {
		fetchRequestHeaders.append('authorization', `Basic ${btoa(`${options.user}:${options.password}`)}`);
	}

	if (options.cacheBust) {
		fetchRequestOptions.cache = 'reload';
	}

	if (!options.method) {
		options.method = 'GET';
	}

	fetchRequestOptions.method = options.method;

	if (options.headers) {
		const headers = new FetchHeaders(options.headers);

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

	if (options.body) {
		fetchRequestOptions.body = options.body;
	}

	fetchRequestOptions.headers = fetchRequestHeaders;

	let request = new Request(requestUrl, fetchRequestOptions);

	return new Task<FetchResponse>((resolve, reject) => {
		let timeout: Handle;

		fetch(request).then((fetchResponse: any) => {
			timeout && timeout.destroy();

			resolve(new FetchResponse(requestUrl, options, fetchResponse));
		}, reject);

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeout = ((): Handle => {
				const timer = setTimeout(function (): void {
					const error = new TimeoutError(`Request timed out after ${options.timeout}ms`);
					reject(error);
				}, options.timeout);

				return createHandle((): void => {
					clearTimeout(timer);
				});
			})();
		}
	});
}
