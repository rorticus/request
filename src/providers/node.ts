import Task from 'dojo-core/async/Task';
import WeakMap from 'dojo-shim/WeakMap';
import Set from 'dojo-shim/Set';
import { Handle } from 'dojo-interfaces/core';
import { createTimer } from 'dojo-core/util';
import { RequestOptions } from '../interfaces';
import Response from '../Response';
import Headers from '../Headers';
import TimeoutError from '../TimeoutError';

import * as http from 'http';
import * as https from 'https';
import * as urlUtil from 'url';

export interface NodeRequestOptions extends RequestOptions {
	followRedirects?: boolean;
	proxy?: string;
	redirectLimit?: number;
	streamEncoding?: string;
}

interface RequestData {
	task: Task<http.IncomingMessage>;
	buffer: any[];
	data: string;
	size: number;
	used: boolean;
}

// const USER_AGENT_STRING = `dojo-request/${require('../package.json').version} Node.js/${process.version.replace(/^v/, '')}`;

const dataMap = new WeakMap<NodeResponse, RequestData>();
const discardedDuplicates = new Set<string>([
	'age', 'authorization', 'content-length', 'content-type', 'etag',
	'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
	'last-modified', 'location', 'max-forwards', 'proxy-authorization',
	'referer', 'retry-after', 'user-agent'
]);

function getDataTask(response: NodeResponse): Task<RequestData> {
	const data = dataMap.get(response);

	if (data.used) {
		return Task.reject<any>(new TypeError('Body already read'));
	}

	data.used = true;

	return <any> data.task.then(_ => data);
}

class NodeResponse extends Response {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;

	get bodyUsed(): boolean {
		return dataMap.get(this).used;
	}

	constructor(request: http.IncomingMessage) {
		super();

		const headers = this.headers = new Headers();
		for (let key in request.headers) {
			if (discardedDuplicates.has(key)) {
				headers.append(key, request.headers[key]);
			}
			else if (key === 'set-cookie') {
				(<string[]> request.headers[key]).forEach(value => {
					headers.append(key, value);
				});
			}
			else {
				const values: string[] = request.headers[key].split(', ');
				values.forEach(value => {
					headers.append(key, value);
				});
			}
		}

		this.status = request.statusCode;
		this.ok = this.status >= 200 && this.status < 300;
		this.statusText = request.statusMessage;
		this.url = 'TODO';
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
		return <any> getDataTask(this).then(data => {
			return String(data.data);
		});
	}
}

export default function node(url: string, options: NodeRequestOptions = {}): Task<Response> {
	const parsedUrl = urlUtil.parse(options.proxy || url);
	const requestOptions = {};

	// TODO: parse options to requestOptions
	// TODO: redirect

	const request = parsedUrl.protocol === 'https:' ? https.request(requestOptions) : http.request(requestOptions);

	const task = new Task<Response>((resolve, reject) => {
		let timeoutHandle: Handle;
		let timeoutReject: Function = reject;

		request.once('response', (message: http.IncomingMessage) => {
			const response = new NodeResponse(message);

			const task = new Task<http.IncomingMessage>((resolve, reject) => {
				timeoutReject = reject;

				message.on('data', (chunk: any) => {
					data.buffer.push(chunk);
					data.size += typeof chunk === 'string' ?
						Buffer.byteLength(chunk, options.streamEncoding) :
						chunk.length
					;
				});

				message.once('end', () => {
					timeoutHandle && timeoutHandle.destroy();

					data.data = (options.streamEncoding ? data.buffer.join('') : String(Buffer.concat(data.buffer, data.size)));

					resolve(message);
				});

			}, () => {
				request.abort();
			});

			const data: RequestData = {
				task,
				buffer: [],
				data: '',
				size: 0,
				used: false
			};

			dataMap.set(response, data);

			resolve(response);
		});

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeoutHandle = createTimer(() => {
				timeoutReject && timeoutReject(new TimeoutError('The request timed out'));
			}, options.timeout);
		}
	}, () => {
		request.abort();
	});

	return task;
}
