import Task, { State } from 'dojo-core/async/Task';
import WeakMap from 'dojo-shim/WeakMap';
import { Handle } from 'dojo-interfaces/core';
import { createTimer } from 'dojo-core/util';
import { RequestOptions } from '../interfaces';
import Response, { getArrayBufferFromBlob, getTextFromBlob } from '../Response';
import Headers from '../Headers';
import TimeoutError from '../TimeoutError';
import has from '../has';
import { forOf } from 'dojo-shim/iterator';
import { generateRequestUrl } from '../util';
import global from 'dojo-core/global';
import { queueTask } from 'dojo-core/queue';

export interface XhrRequestOptions extends RequestOptions {
	blockMainThread?: boolean;
}

interface RequestData {
	task: Task<XMLHttpRequest>;
	used: boolean;
}

const dataMap = new WeakMap<XhrResponse, RequestData>();

function getDataTask(response: XhrResponse): Task<XMLHttpRequest> {
	const data = dataMap.get(response);

	if (data.used) {
		return Task.reject<any>(new TypeError('Body already read'));
	}

	data.used = true;

	return data.task;
}

export class XhrResponse extends Response {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;
	readonly requestOptions: XhrRequestOptions;
	readonly nativeResponse: XMLHttpRequest;

	get bodyUsed(): boolean {
		return dataMap.get(this).used;
	}

	constructor(url: string, options: XhrRequestOptions, request: XMLHttpRequest) {
		super();

		const headers = this.headers = new Headers();

		const responseHeaders = request.getAllResponseHeaders();
		if (responseHeaders) {
			for (let line of responseHeaders.split(/\r\n/g)) {
				const match = line.match(/^(.*?): (.*)$/);
				if (match) {
					headers.append(match[1], match[2]);
				}
			}
		}

		this.requestOptions = options;
		this.status = request.status;
		this.ok = this.status >= 200 && this.status < 300;
		this.statusText = request.statusText || 'OK';
		this.url = url;
		this.nativeResponse = request;
	}

	arrayBuffer(): Task<ArrayBuffer> {
		return Task.reject<Blob>(new Error('ArrayBuffer not supported'));
	}

	blob(): Task<Blob> {
		return Task.reject<Blob>(new Error('Blob not supported'));
	}

	formData(): Task<FormData> {
		return Task.reject<Blob>(new Error('FormData not supported'));
	}

	text(): Task<string> {
		return <any> getDataTask(this).then((request: XMLHttpRequest) => {
			return String(request.responseText);
		});
	}
}

if (has('blob')) {
	XhrResponse.prototype.blob = function (this: XhrResponse): Task<Blob> {
		return <any> getDataTask(this).then((request: XMLHttpRequest) => request.response);
	};

	XhrResponse.prototype.text = function (this: XhrResponse): Task<string> {
		return <any> this.blob().then(getTextFromBlob);
	};

	if (has('arraybuffer')) {
		XhrResponse.prototype.arrayBuffer = function (this: XhrResponse): Task<ArrayBuffer> {
			return <any> this.blob().then(getArrayBufferFromBlob);
		};
	}

}

if (has('formdata')) {
	XhrResponse.prototype.formData = function (this: XhrResponse): Task<FormData> {
		return <any> this.text().then((text: string) => {
			const data = new FormData();

			text.trim().split('&').forEach(keyValues => {
				if (keyValues) {
					const pairs = keyValues.split('=');
					const name = (pairs.shift() || '').replace(/\+/, ' ');
					const value = pairs.join('=').replace(/\+/, ' ');

					data.append(decodeURIComponent(name), decodeURIComponent(value));
				}
			});

			return data;
		});
	};
}

function noop () {}

function setOnError(request: XMLHttpRequest, reject: Function) {
	request.onerror = function (event) {
		reject(new TypeError(event.error || 'Network request failed'));
	};
}

export default function xhr(url: string, options: XhrRequestOptions = {}): Task<Response> {
	const request = new XMLHttpRequest();
	const requestUrl = generateRequestUrl(url, options);

	options = Object.create(options);

	if (!options.method) {
		options.method = 'GET';
	}

	if ((!options.user || !options.password) && options.auth) {
		let auth = options.auth.split(':');
		options.user = decodeURIComponent(auth[ 0 ]);
		options.password = decodeURIComponent(auth[ 1 ]);
	}

	let isAborted = false;

	function abort() {
		isAborted = true;
		if (request) {
			request.abort();
			request.onreadystatechange = noop;
		}
	}

	let timeoutHandle: Handle;
	let timeoutReject: Function;

	const task = new Task<Response>((resolve, reject) => {
		timeoutReject = reject;

		request.onreadystatechange = function () {
			if (isAborted) {
				return;
			}

			if (request.readyState === 2) {
				const response = new XhrResponse(requestUrl, options, request);

				const task = new Task<XMLHttpRequest>((resolve, reject) => {
					request.onprogress = function (event: any) {
						if (isAborted) {
							return;
						}

						response.emit({
							type: 'progress',
							response,
							totalBytesDownloaded: event.loaded
						});
					};

					request.onreadystatechange = function () {
						if (isAborted) {
							return;
						}
						if (request.readyState === 4) {
							request.onreadystatechange = noop;
							timeoutHandle && timeoutHandle.destroy();

							response.emit({
								type: 'data',
								response,
								chunk: request.response
							});

							response.emit({
								type: 'end',
								response
							});

							resolve(request);
						}
					};

					setOnError(request, reject);

					queueTask(() => {
						timeoutReject = reject;

						response.emit({
							type: 'start',
							response
						});
					});
				}, abort);

				dataMap.set(response, {
					task,
					used: false
				});

				resolve(response);
			}
		};

		setOnError(request, reject);

	}, abort);

	request.open(options.method, requestUrl, !options.blockMainThread, options.user, options.password);

	if (has('filereader') && has('blob')) {
		request.responseType = 'blob';
	}

	if (options.timeout > 0 && options.timeout !== Infinity) {
		timeoutHandle = createTimer(() => {
			// Reject first, since aborting will also fire onreadystatechange which would reject with a
			// less specific error.  (This is also why we set up our own timeout rather than using
			// native timeout and ontimeout, because that aborts and fires onreadystatechange before ontimeout.)
			timeoutReject && timeoutReject(new TimeoutError('The XMLHttpRequest request timed out'));
			abort();
		}, options.timeout);
	}

	let hasContentTypeHeader = false;
	let hasRequestedWithHeader = false;

	if (options.headers) {
		const requestHeaders = new Headers(options.headers);
		forOf(requestHeaders, ([key, value]) => {
			if (key.toLowerCase() === 'content-type') {
				hasContentTypeHeader = true;
			}
			else if (key.toLowerCase() === 'x-requested-with') {
				hasRequestedWithHeader = true;
			}

			request.setRequestHeader(key, value);
		});
	}

	if (!hasRequestedWithHeader) {
		request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	}

	if (!hasContentTypeHeader && has('formdata') && options.body instanceof global.FormData) {
		// Assume that most forms do not contain large binary files. If that is not the case,
		// then "multipart/form-data" should be manually specified as the "Content-Type" header.
		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	}

	task.finally(() => {
		if (task.state !== State.Fulfilled) {
			request.onreadystatechange = noop;
			timeoutHandle && timeoutHandle.destroy();
		}
	});

	request.send(options.body || null);

	return task;
}
