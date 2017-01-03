import registerSuite from '../object';
import * as assert from 'intern/chai!assert';

import { Handle } from 'dojo-interfaces/core';
import request, { Response, providerRegistry, Headers } from '../../src/index';
import Task from 'dojo-core/async/Task';

class MockResponse extends Response {
	headers: Headers;
	ok = true;
	status = 200;
	statusText = 'OK';
	url = '¯\\_(ツ)_/¯';
	bodyUsed = false;

	result: number;

	constructor(result: number) {
		super();

		this.result = result;
	}

	arrayBuffer(): any { return null; }
	blob(): any { return null; }
	formData(): any { return null; }
	text(): any { return null; }
}

function mockProviderOne(url: string): Task<Response> {
	return Task.resolve(new MockResponse(1));
}

function mockProviderTwo(url: string): Task<Response> {
	return Task.resolve(new MockResponse(2));
}

let handle: Handle | null;

registerSuite({
	name: 'request',

	afterEach() {
		if (handle) {
			handle.destroy();
			handle = null;
		}
	},

	methods() {
		assert.property(request, 'get');
		assert.property(request, 'delete');
		assert.property(request, 'post');
		assert.property(request, 'put');
		assert.property(request, 'setDefaultProvider');
	},

	provider: {
		beforeEach() {
			request.setDefaultProvider(mockProviderOne);
		},

		none: {
			beforeEach() {
				request.setDefaultProvider(<any> null);
			},

			rejects() {
				const dfd = this.async();

				request('foo')
					.then(dfd.callback(() => {
						assert(false, 'Should have failed');
					}))
					.catch(dfd.callback(() => {}));
			}
		},

		default() {
			const dfd = this.async();

			request('foo')
				.then(dfd.callback((response: MockResponse) => {
					assert.equal(response.result, 1);
				}));
		},

		'String matching'() {
			handle = providerRegistry.register('foo', mockProviderTwo);

			const dfd = this.async();

			request('foo')
				.then(dfd.callback((response: MockResponse) => {
					assert.equal(response.result, 2);
				}));
		},

		'RegExp matching'() {
			handle = providerRegistry.register(/foo$/, mockProviderTwo);

			const dfd = this.async();

			request('blah/foo')
				.then(dfd.callback((response: MockResponse) => {
					assert.equal(response.result, 2);
				}));
		},

		'Function matching'() {
			handle = providerRegistry.register(
				url => {
					return url === 'foo';
				},
				mockProviderTwo
			);

			const dfd = this.async();

			request('foo')
				.then(dfd.callback((response: MockResponse) => {
					assert.equal(response.result, 2);
				}));
		}
	}
});
