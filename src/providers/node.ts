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
import global from 'dojo-core/global';
import has from '../has';
import { getArrayBufferFromBlob } from '../Response';
import { getStringFromFormData } from '../util';

export interface NodeRequestOptions extends RequestOptions {
	agent?: any;
	ca?: any;
	cert?: string;
	ciphers?: string;
	dataEncoding?: string;
	followRedirects?: boolean;
	key?: string;
	localAddress?: string;
	passphrase?: string;
	pfx?: any;
	proxy?: string;
	rejectUnauthorized?: boolean;
	secureProtocol?: string;
	socketPath?: string;
	socketOptions?: {
		keepAlive?: number;
		noDelay?: boolean;
		timeout?: number;
	};
	streamData?: boolean;
	streamEncoding?: string;
	redirectOptions?: {
		limit?: number;
		count?: number;
		keepOriginalMethod?: boolean;
	};
}

let version = '2.0.0-pre';

const DEFAULT_REDIRECT_LIMIT = 15;

interface Options {
	agent?: any;
	auth?: string;
	headers?: { [name: string]: string; };
	host?: string;
	hostname?: string;
	localAddress?: string;
	method?: string;
	path?: string;
	port?: number;
	socketPath?: string;
}

interface HttpsOptions extends Options {
	ca?: any;
	cert?: string;
	ciphers?: string;
	key?: string;
	passphrase?: string;
	pfx?: any;
	rejectUnauthorized?: boolean;
	secureProtocol?: string;
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

export class NodeResponse extends Response {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;
	readonly nativeResponse: http.IncomingMessage;
	readonly requestOptions: NodeRequestOptions;

	get bodyUsed(): boolean {
		return dataMap.get(this).used;
	}

	constructor(url: string, options: NodeRequestOptions, response: http.IncomingMessage) {
		super();

		const headers = this.headers = new Headers();
		for (let key in response.headers) {
			if (discardedDuplicates.has(key)) {
				headers.append(key, response.headers[key]);
			}
			else if (key === 'set-cookie') {
				(<string[]> response.headers[key]).forEach(value => {
					headers.append(key, value);
				});
			}
			else {
				const values: string[] = response.headers[key].split(', ');
				values.forEach(value => {
					headers.append(key, value);
				});
			}
		}

		this.requestOptions = options;
		this.nativeResponse = response;
		this.status = response.statusCode;
		this.ok = this.status >= 200 && this.status < 300;
		this.statusText = response.statusMessage;
		this.url = url;
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

function redirect(resolve: (p?: any) => void, reject: (_?: Error) => void, url: string, options: NodeRequestOptions): boolean {
	if (!options.redirectOptions) {
		options.redirectOptions = {};
	}

	const { limit: redirectLimit = DEFAULT_REDIRECT_LIMIT } = options.redirectOptions;
	const { count: redirectCount = 0 } = options.redirectOptions;
	const { followRedirects = true } = options;

	if (!followRedirects) {
		return false;
	}

	if (!url) {
		reject(new Error('asked to redirect but no location header was found'));
		return true;
	}

	if (redirectCount > redirectLimit) {
		reject(new Error(`too many redirects, limit reached at ${redirectLimit}`));
		return true;
	}

	options.redirectOptions.count = redirectCount + 1;

	resolve(node(url, options));

	return true;
}

export default function node(url: string, options: NodeRequestOptions = {}): Task<Response> {
	const parsedUrl = urlUtil.parse(options.proxy || url);

	// TODO: Stream handling

	const requestOptions: HttpsOptions = {
		agent: options.agent,
		auth: parsedUrl.auth || options.auth,
		ca: options.ca,
		cert: options.cert,
		ciphers: options.ciphers,
		host: parsedUrl.host,
		hostname: parsedUrl.hostname,
		key: options.key,
		localAddress: options.localAddress,
		method: options.method ? options.method.toUpperCase() : 'GET',
		passphrase: options.passphrase,
		path: parsedUrl.path,
		pfx: options.pfx,
		port: Number(parsedUrl.port),
		rejectUnauthorized: options.rejectUnauthorized,
		secureProtocol: options.secureProtocol,
		socketPath: options.socketPath
	};

	requestOptions.headers = <{ [key: string]: string }> options.headers || {};

	if (!Object.keys(requestOptions.headers).map(headerName => headerName.toLowerCase()).some(headerName => headerName === 'user-agent')) {
		requestOptions.headers[ 'user-agent' ] = 'dojo/' + version + ' Node.js/' + process.version.replace(/^v/, '');
	}

	if (options.proxy) {
		requestOptions.path = url;
		if (parsedUrl.auth) {
			requestOptions.headers[ 'proxy-authorization' ] = 'Basic ' + new Buffer(parsedUrl.auth).toString('base64');
		}

		let _parsedUrl = urlUtil.parse(url);
		if (_parsedUrl.host) {
			requestOptions.headers[ 'host' ] = _parsedUrl.host;
		}
		requestOptions.auth = _parsedUrl.auth || options.auth;
	}

	if (!options.auth && (options.user || options.password)) {
		requestOptions.auth = encodeURIComponent(options.user || '') + ':' + encodeURIComponent(options.password || '');
	}

	const request = parsedUrl.protocol === 'https:' ? https.request(requestOptions) : http.request(requestOptions);

	const task = new Task<Response>((resolve, reject) => {
		let timeoutHandle: Handle;
		let timeoutReject: Function = reject;

		if (options.socketOptions) {
			if (options.socketOptions.timeout) {
				request.setTimeout(options.socketOptions.timeout);
			}

			if ('noDelay' in options.socketOptions) {
				request.setNoDelay(options.socketOptions.noDelay);
			}

			if ('keepAlive' in options.socketOptions) {
				const initialDelay: number | undefined = options.socketOptions.keepAlive;
				request.setSocketKeepAlive(initialDelay >= 0, initialDelay);
			}
		}

		request.once('response', (message: http.IncomingMessage) => {
			const response = new NodeResponse(url, options, message);

			// Redirection handling defaults to true in order to harmonise with the XHR provider, which will always
			// follow redirects
			if (
				response.status >= 300 &&
				response.status < 400
			) {
				const redirectOptions = options.redirectOptions || {};
				const newOptions = Object.create(options);

				switch (response.status) {
					case 300:
						/**
						 * Note about 300 redirects. RFC 2616 doesn't specify what to do with them, it is up to the client to "pick
						 * the right one".  We're picking like Chrome does, just don't pick any.
						 */
						break;

					case 301:
					case 302:
						/**
						 * RFC 2616 says,
						 *
						 *     If the 301 status code is received in response to a request other
						 *     than GET or HEAD, the user agent MUST NOT automatically redirect the
						 *     request unless it can be confirmed by the user, since this might
						 *       change the conditions under which the request was issued.
						 *
						 *     Note: When automatically redirecting a POST request after
						 *     receiving a 301 status code, some existing HTTP/1.0 user agents
						 *     will erroneously change it into a GET request.
						 *
						 * We're going to be one of those erroneous agents, to prevent the request from failing..
						 */
						if ((requestOptions.method !== 'GET' && requestOptions.method !== 'HEAD') && !redirectOptions.keepOriginalMethod) {
							newOptions.method = 'GET';
						}

						if (redirect(resolve, reject, response.headers.get('location'), newOptions)) {
							return;
						}
						break;

					case 303:

						/**
						 * The response to the request can be found under a different URI and
						 * SHOULD be retrieved using a GET method on that resource.
						 */
						if (requestOptions.method !== 'GET') {
							newOptions.method = 'GET';
						}

						if (redirect(resolve, reject, response.headers.get('location'), newOptions)) {
							return;
						}
						break;

					case 304:
						// do nothing so this can fall through and return the response as normal. Nothing more can
						// be done for 304
						break;

					case 305:
						if (!response.headers.get('location')) {
							reject(new Error('expected Location header to contain a proxy url'));
						}
						else {
							newOptions.proxy = response.headers.get('location');
							if (redirect(resolve, reject, url, newOptions)) {
								return;
							}
						}
						break;

					case 307:
						/**
						 *  If the 307 status code is received in response to a request other
						 *  than GET or HEAD, the user agent MUST NOT automatically redirect the
						 *  request unless it can be confirmed by the user, since this might
						 *  change the conditions under which the request was issued.
						 */
						if (redirect(resolve, reject, response.headers.get('location'), newOptions)) {
							return;
						}
						break;

					default:
						reject(new Error('unhandled redirect status ' + response.status));
						return;
				}
			}

			options.streamEncoding && message.setEncoding(options.streamEncoding);

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

		request.once('error', reject);

		if (options.body) {
			if (has('arraybuffer') && options.body instanceof global.ArrayBuffer) {
				request.end(options.body.toString());
			}
			else if (has('blob') && options.body instanceof global.Blob) {
				request.end(getArrayBufferFromBlob(<Blob> options.body));
			}
			else if (has('formdata') && options.body instanceof global.FormData) {
				request.end(getStringFromFormData(options.body));
			}
			else {
				request.end(options.body.toString());
			}
		}
		else {
			request.end();
		}

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeoutHandle = createTimer(() => {
				timeoutReject && timeoutReject(new TimeoutError('The request timed out'));
			}, options.timeout);
		}
	}, () => {
		request.abort();
	}).catch(function (error: Error): any {
		let parsedUrl = urlUtil.parse(url);

		if (parsedUrl.auth) {
			parsedUrl.auth = '(redacted)';
		}

		let sanitizedUrl = urlUtil.format(parsedUrl);

		error.message = '[' + requestOptions.method + ' ' + sanitizedUrl + '] ' + error.message;
		throw error;
	});

	return task;
}
