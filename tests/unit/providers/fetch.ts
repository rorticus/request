import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from '../../../src/has';
import Promise from 'dojo-shim/Promise';
import fetchRequest from '../../../src/providers/fetch';
import UrlSearchParams from 'dojo-core/UrlSearchParams';

let echoServerAvailable = false;

registerSuite({
	name: 'request/fetch',

	before: function () {
		if (has('fetch')) {
			return new Promise(function (resolve, reject) {
				fetchRequest('/__echo/', {
					method: 'get',
					timeout: 10000
				}).then(
					function (response) {
						if (response && response.status === 200) {
							echoServerAvailable = true;
						}
						resolve();
					},
					function () {
						resolve();
					}
				);
			});
		}
	},

	'HTTP methods': {
		specified(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/foo.json', { method: 'get' })
				.then(function (response: any) {
					assert.strictEqual(response.requestOptions.method, 'get');
				});
		},

		'default'(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/foo.json')
				.then(function (response: any) {
					assert.strictEqual(response.requestOptions.method, 'GET');
				});
		},

		'.get with URL query'(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/fetch?color=blue&numbers=one&numbers=two').then(function (response: any) {
				return response.json().then((data: any) => {
					const query = data.query;
					assert.deepEqual(query, {
						color: 'blue',
						numbers: [ 'one', 'two' ]
					});
					assert.strictEqual(
						response.url,
						'/__echo/fetch?color=blue&numbers=one&numbers=two'
					);
				});
			});
		},

		'.post': function (this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/post', {
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
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/fetch?delay=5000', { timeout: 10 })
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
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/foo.json', {
				user: 'user',
				password: 'password'
			}).then(function (response: any) {
				assert.strictEqual(response.requestOptions.user, 'user');
				assert.strictEqual(response.requestOptions.password, 'password');
			});
		},

		'auth, without user or password'(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/foo.json', {
				auth: 'user:password'
			}).then(function (response: any) {
				assert.strictEqual(response.requestOptions.user, 'user');
				assert.strictEqual(response.requestOptions.password, 'password');
			});
		},

		'query': {
			'.get with query URL and query option string'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return fetchRequest('/__echo/fetch?color=blue&numbers=one&numbers=two', {
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
							'/__echo/fetch?color=blue&numbers=one&numbers=two&foo=bar&foo=baz&thud=thonk&xyzzy=3'
						);
					});
				});
			},

			'.get with query option string'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return fetchRequest('/__echo/fetch', {
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
							'/__echo/fetch?foo=bar&foo=baz&thud=thonk&xyzzy=3'
						);
					});
				});
			},

			'.get with query option object'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return fetchRequest('/__echo/fetch', {
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
							'/__echo/fetch?foo=bar&foo=baz&thud=thonk&xyzzy=3'
						);
					});
				});
			},

			'.get with cacheBust w/query string w/o/query option'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return fetchRequest('/__echo/fetch?foo=bar', {
					cacheBust: true
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/fetch?foo=bar'), 0);
					cacheBustStringA = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringA)));
					return new Promise<any>(function (resolve, reject) {
						setTimeout(function () {
							fetchRequest('/__echo/fetch?foo=bar', {
								cacheBust: true
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/fetch?foo=bar'), 0);
					cacheBustStringB = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust w/query string w/query option'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return fetchRequest('/__echo/fetch?foo=bar', {
					cacheBust: true,
					query: {
						bar: 'baz'
					}
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/fetch?foo=bar&bar=baz'), 0);
					cacheBustStringA = response.url.split('&')[ 2 ];
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return new Promise<any>(function (resolve, reject) {
						setTimeout(function () {
							fetchRequest('/__echo/fetch?foo=bar', {
								cacheBust: true,
								query: {
									bar: 'baz'
								}
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/fetch?foo=bar&bar=baz'), 0);
					cacheBustStringB = response.url.split('&')[ 2 ];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust w/o/query string w/query option'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return fetchRequest('/__echo/fetch', {
					cacheBust: true,
					query: {
						foo: 'bar'
					}
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/fetch?foo=bar'), 0);
					cacheBustStringA = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return new Promise<any>(function (resolve, reject) {
						setTimeout(function () {
							fetchRequest('/__echo/fetch', {
								cacheBust: true,
								query: {
									foo: 'bar'
								}
							}).then(resolve, reject);
						}, 5);
					});
				}).then(function (response: any) {
					assert.strictEqual(response.url.indexOf('/__echo/fetch?foo=bar'), 0);
					cacheBustStringB = response.url.split('&')[ 1 ];
					assert.isFalse(isNaN(Number(cacheBustStringB)));

					assert.notEqual(cacheBustStringA, cacheBustStringB);
				});
			},

			'.get with cacheBust and no query'(this: any) {
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				let cacheBustStringA: string;
				let cacheBustStringB: string;
				return fetchRequest('/__echo/fetch', {
					cacheBust: true
				}).then(function (response: any) {
					cacheBustStringA = response.url.split('?')[ 1 ];
					assert.ok(cacheBustStringA);
					assert.isFalse(isNaN(Number(cacheBustStringA)));

					return fetchRequest('/__echo/fetch', {
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
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return fetchRequest('/__echo/normalize', {
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
				if (!has('fetch')) {
					this.skip('Native fetch is not available');
				}
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}
				return fetchRequest('/__echo/custom', {
					headers: {
						'Content-Type': 'application/arbitrary-value'
					}
				}).then(function (response: any) {
					return response.json().then((data: any) => {
						assert.propertyVal(data.headers, 'content-type', 'application/arbitrary-value');

						return fetchRequest('/__echo/custom', {
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
			}
		}
	},

	'response object': {
		properties(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/foo.json').then(function (response: any) {
				assert.strictEqual(response.status, 200);
				assert.strictEqual(response.statusText, 'OK');
				assert.strictEqual(response.url, '/__echo/foo.json');
				assert.deepEqual(response.requestOptions, { method: 'GET' });
			});
		},

		'.header'(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}
			return fetchRequest('/__echo/foo.json').then(function (response: any) {
				const length: number = Number(response.headers.get('content-length'));

				return response.text().then((data: any) => {
					assert.strictEqual(length, data.length);
				});
			});
		},

		'body cannot be used more than once'(this: any) {
			if (!has('fetch')) {
				this.skip('Native fetch is not available');
			}
			if (!echoServerAvailable) {
				this.skip('No echo server available');
			}

			return fetchRequest('/__echo/foo.json').then(function (response: any) {
				assert.isFalse(response.bodyUsed);

				return response.json().then(() => {
					assert.isTrue(response.bodyUsed);

					return response.json().then(() => {
						throw new Error('should not succeed');
					}, () => {
						return true;
					});
				});
			});
		},

		'response types': {
			'arrayBuffer'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				return fetchRequest('/__echo/foo.json').then((response: any) => {
					return response.arrayBuffer().then((arrayBuffer: any) => {
						assert.isTrue(arrayBuffer instanceof ArrayBuffer);
					});
				});
			},

			'blob'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				return fetchRequest('/__echo/foo.json').then((response: any) => {
					return response.blob().then((blob: any) => {
						assert.isTrue(blob instanceof Blob);
					});
				});
			},

			'formData'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				if (!has('formdata')) {
					this.skip('FormData is not available');
				}

				/*
				FormData could be supported by the browser, but not by the fetch implementation.
				We're going to consider success either the check for support worked (error is thrown), or
				actual FormData is returned.
				 */
				return fetchRequest('/__echo/foo.json').then((response: any) => {
					return response.formData().then((formData: any) => {
						assert.isTrue(formData instanceof FormData);
					}, (e: any) => {
						assert.include(e.message, 'FormData is not supported');
					});
				});
			},

			'xml'(this: any) {
				if (!echoServerAvailable) {
					this.skip('No echo server available');
				}

				return fetchRequest('/__echo/xhr?responseType=xml').then((response: any) => {
					return response.xml().then((xml: any) => {
						assert.isTrue(xml instanceof Document);
					});
				});
			}
		}
	}
});
