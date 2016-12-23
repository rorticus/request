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

class XhrResponse extends Response {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;

	get bodyUsed(): boolean {
		return dataMap.get(this).used;
	}

	constructor(request: XMLHttpRequest) {
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

		this.status = request.status;
		this.ok = this.status >= 200 && this.status < 300;
		this.statusText = request.statusText || 'OK';
		this.url = ('responseURL' in request ? (<any> request).responseURL : headers.get('X-Request-URL')) || '';
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
		return <any> getDataTask(this).then(request => {
			return String(request.responseText);
		});
	}

	xml(): Task<any> {
		return <any> getDataTask(this).then(request => request.responseXML);
	}
}

if (has('blob')) {
	XhrResponse.prototype.blob = function (this: XhrResponse): Task<Blob> {
		return <any> getDataTask(this).then(request => request.response);
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
		return <any> this.text().then(text => {
			const data = new FormData();

			text.trim().split('&').forEach(keyValues => {
				if (keyValues) {
					const pairs = keyValues.split('=');
					const name = pairs.shift().replace(/\+/, ' ');
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

	options = Object.create(options);

	if (!options.method) {
		options.method = 'GET';
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
				const response = new XhrResponse(request);

				const task = new Task<XMLHttpRequest>((resolve, reject) => {
					timeoutReject = reject;

					request.onreadystatechange = function () {
						if (isAborted) {
							return;
						}
						if (request.readyState === 4) {
							request.onreadystatechange = noop;
							timeoutHandle && timeoutHandle.destroy();

							resolve(request);
						}
					};

					setOnError(request, reject);
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

	request.open(options.method, url, !options.blockMainThread, options.user, options.password);

	if (options.timeout > 0 && options.timeout !== Infinity) {
		timeoutHandle = createTimer(() => {
			// Reject first, since aborting will also fire onreadystatechange which would reject with a
			// less specific error.  (This is also why we set up our own timeout rather than using
			// native timeout and ontimeout, because that aborts and fires onreadystatechange before ontimeout.)
			timeoutReject && timeoutReject(new TimeoutError('The XMLHttpRequest request timed out'));
			abort();
		}, options.timeout);
	}

	if (has('filereader') && has('blob')) {
		request.responseType = 'blob';
	}

	if (options.headers) {
		const requestHeaders = new Headers(options.headers);
		forOf(requestHeaders, ([key, value]) => {
			request.setRequestHeader(key, value);
		});
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
