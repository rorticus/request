import registerSuite from '../../object';
import * as assert from 'intern/chai!assert';

import * as dojo1xhr from 'dojo/request/xhr';

import xhrRequest from '../../../src/providers/xhr';
import { Response, StartEvent, EndEvent, DataEvent, ProgressEvent } from '../../../src/interfaces';
import UrlSearchParams from 'dojo-core/UrlSearchParams';
import has from 'dojo-has/has';
import { XhrResponse } from '../../../src/providers/xhr';
import Promise from 'dojo-shim/Promise';

let echoServerAvailable = false;
registerSuite({
	name: 'request/providers/xhr',

	before() {
		return dojo1xhr('/__echo/', {
			method: 'GET',
			timeout: 10000
		}).then(
			response => {
				if (response && response.statusCode === 200) {
					echoServerAvailable = true;
					return;
				}
				this.skip('Proxy unavailable');
			},
			() => this.skip('Proxy unavailable')
		);
	},

	'HTTP methods': {
		specified(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json', { method: 'get' })
				.then(function (response: any) {
					assert.strictEqual(response.requestOptions.method, 'get');
				});
		},

		'default'(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json')
				.then(function (response: any) {
					assert.strictEqual(response.requestOptions.method, 'GET');
				});
		},

		'.get with URL query'(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/xhr?color=blue&numbers=one&numbers=two').then(function (response: any) {
				return response.json().then((data: any) => {
					const query = data.query;
					assert.deepEqual(query, {
						color: 'blue',
						numbers: [ 'one', 'two' ]
					});
					assert.strictEqual(
						response.url,
						'/__echo/xhr?color=blue&numbers=one&numbers=two'
					);
				});
			});
		},

		'.post': function (this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/post', {
				method: 'POST',
				body: new UrlSearchParams({ color: 'blue' }).toString()
			}).then(function (response: any) {
				return response.json().then((data: any) => {
					assert.strictEqual(data.method, 'POST');
					const payload = data.payload;

					assert.ok(payload && payload.color);
					assert.strictEqual(payload.color, 'blue');
				});
			});
		}
	},

	'request options': {
		'"timeout"'(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/xhr?delay=5000', { timeout: 10 })
				.then(
					function () {
						assert(false, 'Should have timed out');
					},
					function (error: Error) {
						assert.strictEqual(error.name, 'TimeoutError');
					}
				);
		},

		'user and password'(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json', {
				user: 'user',
				password: 'password'
			}).then(function (response: any) {
				assert.strictEqual(response.requestOptions.user, 'user');
				assert.strictEqual(response.requestOptions.password, 'password');
			});
		},

		'auth, without user or password'(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json', {
				auth: 'user:password'
			}).then(function (response: any) {
				assert.strictEqual(response.requestOptions.user, 'user');
				assert.strictEqual(response.requestOptions.password, 'password');
			});
		},

		'query': {
			'.get with query URL and query option string'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr?color=blue&numbers=one&numbers=two', {
					query: new UrlSearchParams({
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					}).toString()
				}).then(function (response: any) {
					return response.json().then((data: any) => {
						const query = data.query;
						assert.deepEqual(query, {
							color: 'blue',
							numbers: [ 'one', 'two' ],
							thud: 'thonk',
							foo: [ 'bar', 'baz' ],
							xyzzy: '3'
						});
						assert.strictEqual(
							response.url,
							'/__echo/xhr?color=blue&numbers=one&numbers=two&foo=bar&foo=baz&thud=thonk&xyzzy=3'
						);
					});
				});
			},

			'.get with query option string'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr', {
					query: new UrlSearchParams({
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					}).toString()
				}).then(function (response: any) {
					return response.json().then((data: any) => {
						const query = data.query;
						assert.deepEqual(query, {
							foo: [ 'bar', 'baz' ],
							thud: 'thonk',
							xyzzy: '3'
						});
						assert.strictEqual(
							response.url,
							'/__echo/xhr?foo=bar&foo=baz&thud=thonk&xyzzy=3'
						);
					});
				});
			},

			'.get with query option object'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr', {
					query: {
						foo: [ 'bar', 'baz' ],
						thud: 'thonk',
						xyzzy: '3'
					}
				}).then(function (response: any) {
					return response.json().then((data: any) => {
						const query = data.query;
						assert.deepEqual(query, {
							foo: [ 'bar', 'baz' ],
							thud: 'thonk',
							xyzzy: '3'
						});
						assert.strictEqual(
							response.url,
							'/__echo/xhr?foo=bar&foo=baz&thud=thonk&xyzzy=3'
						);
					});
				});
			},

			'.get with cacheBust w/query string w/o/query option'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr?foo=bar', {
					cacheBust: true
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringA = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringA)));
					return new Promise<Response>(function (resolve, reject) {
						setTimeout(function () {
							xhrRequest('/__echo/xhr?foo=bar', {
								cacheBust: true
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringB = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust w/query string w/query option'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr?foo=bar', {
					cacheBust: true,
					query: {
						bar: 'baz'
					}
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar&bar=baz'), 0);
					cacheBustStringA = response.url.split('&')[ 2 ];
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return new Promise<Response>(function (resolve, reject) {
						setTimeout(function () {
							xhrRequest('/__echo/xhr?foo=bar', {
								cacheBust: true,
								query: {
									bar: 'baz'
								}
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar&bar=baz'), 0);
					cacheBustStringB = response.url.split('&')[ 2 ];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust w/o/query string w/query option'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr', {
					cacheBust: true,
					query: {
						foo: 'bar'
					}
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringA = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return new Promise<Response>(function (resolve, reject) {
						setTimeout(function () {
							xhrRequest('/__echo/xhr', {
								cacheBust: true,
								query: {
									foo: 'bar'
								}
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/xhr?foo=bar'), 0);
					cacheBustStringB = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust and no query'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return xhrRequest('/__echo/xhr', {
					cacheBust: true
				}).then(function (response: any) {
					cacheBustStringA = response.url.split('?')[ 1 ];
					assert.ok(cacheBustStringA);
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return xhrRequest('/__echo/xhr', {
						cacheBust: true
					});
				}).then(function (response: any) {
					cacheBustStringB = response.url.split('?')[ 1 ];
					assert.ok(cacheBustStringB);
					assert.isFalse(isNaN(Number(cacheBustStringB)));
					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			}
		},

		'headers': {
			'normalize header names'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/normalize', {
					headers: {
						'CONTENT-TYPE': 'arbitrary-value',
						'X-REQUESTED-WITH': 'test'
					}
				}).then(function (response: any) {
					return response.json().then((data: any) => {
						assert.isUndefined(data.headers[ 'CONTENT-TYPE' ]);
						assert.propertyVal(data.headers, 'content-type', 'arbitrary-value');

						assert.isUndefined(data.headers[ 'X-REQUESTED-WITH' ]);
						assert.propertyVal(data.headers, 'x-requested-with', 'test');
					});
				});
			},

			'custom headers'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/custom', {
					headers: {
						'Content-Type': 'application/arbitrary-value'
					}
				}).then(function (response: any) {
					return response.json().then((data: any) => {
						assert.propertyVal(data.headers, 'content-type', 'application/arbitrary-value');

						return xhrRequest('/__echo/custom', {
							headers: {
								'Range': 'bytes=0-1024'
							}
						});
					});
				}).then((response: any) => {
					return response.json().then((data: any) => {
						assert.isDefined(data.headers, 'range');
					});
				});
			},

			'default headers'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				const options = has('formdata') ? { body: new FormData() } : {};
				return xhrRequest('/__echo/default', options).then(function (response: any) {
					return response.json().then((data: any) => {
						assert.strictEqual(data.headers[ 'x-requested-with' ], 'XMLHttpRequest');
						if (has('formdata')) {
							assert.include(data.headers[ 'content-type' ], 'application/x-www-form-urlencoded');
						}
					});
				});
			}
		},

		'responseType': {
			'xml'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return xhrRequest('/__echo/xhr?responseType=xml').then((response: XhrResponse) => {
					return response.xml().then((xml: any) => {
						const foo: string = xml.getElementsByTagName('foo')[ 0 ].getAttribute('value');
						assert.strictEqual(foo, 'bar');
					});
				});
			},

			'blob'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				if (!has('xhr2-blob')) {
					this.skip('Blob doesn\'t exist in this environment');
				}

				return xhrRequest('/__echo/xhr?responseType=gif').then((response: any) => {
					return response.blob().then((blob: any) => {
						assert.instanceOf(blob, Blob);
					});
				});
			},

			'arrayBuffer'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				if (!has('arraybuffer')) {
					this.skip('ArrayBuffer doesn\'t exist in this environment');
				}
				return xhrRequest('/__echo/xhr?responseType=gif').then((response: any) => {
					return response.arrayBuffer().then((buffer: any) => {
						assert.instanceOf(buffer, ArrayBuffer);
					});
				});
			}
		}
	},

	'response object': {
		properties(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json').then(function (response: XhrResponse) {
				assert.strictEqual(response.status, 200);
				assert.strictEqual(response.statusText, 'OK');
				assert.isTrue(response.nativeResponse instanceof XMLHttpRequest);
				assert.strictEqual(response.url, '/__echo/foo.json');
				assert.deepEqual(response.requestOptions, { method: 'GET' });
			});
		},

		'.header'(this: any) {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return xhrRequest('/__echo/foo.json').then(function (response: any) {
				return response.text().then((data: any) => {
					const length: number = Number(response.headers.get('content-length'));
					assert.strictEqual(length, data.length);
				});
			});
		},

		'body cannot be used twice'() {
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}

			return xhrRequest('/__echo/foo.json').then((response: any) => {
				assert.isFalse(response.bodyUsed);

				return response.text().then(() => {
					assert.isTrue(response.bodyUsed);

					return response.text().then(() => {
						throw new Error('should not have succeeded');
					}, () => {
						return 'success';
					});
				});
			});
		},

		'response types': {
			'arrayBuffer'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				return xhrRequest('/__echo/foo.json').then((response: any) => {
					return response.arrayBuffer().then((arrayBuffer: any) => {
						assert.isTrue(arrayBuffer instanceof ArrayBuffer);
					});
				});
			}
		},

		'response progress': {
			'start event'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				let startCalled = false;

				return xhrRequest('/__echo/foo.json').then((response: any) => {
					response.on('start', (event: StartEvent) => {
						startCalled = true;
					});

					return response.text().then(() => {
						assert.isTrue(startCalled);
					});
				});
			},

			'end event'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				let endCalled = false;

				return xhrRequest('/__echo/foo.json').then((response: any) => {
					response.on('end', (event: EndEvent) => {
						endCalled = true;
					});

					return response.text().then(() => {
						assert.isTrue(endCalled);
					});
				});
			},

			'data event'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				let timesCalled = 0;

				return xhrRequest('/__echo/foo.json').then((response: any) => {
					response.on('data', (event: DataEvent) => {
						assert.isNotNull(event.chunk);
						timesCalled++;
					});

					return response.text().then(() => {
						assert.equal(timesCalled, 1);
					});
				});
			},

			'progress event'() {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				let progressEvents: number[] = [];

				return xhrRequest('/__echo/foo.json').then((response: any) => {
					response.on('progress', (event: ProgressEvent) => {
						progressEvents.push(event.totalBytesDownloaded);
					});

					return response.text().then(() => {
						assert.isTrue(progressEvents.length > 0);
					});
				});
			}
		}
	}
});
