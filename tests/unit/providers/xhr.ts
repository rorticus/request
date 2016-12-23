import registerSuite from '../../object';
import * as assert from 'intern/chai!assert';

import * as dojo1xhr from 'dojo/request/xhr';

import xhr from '../../../src/providers/xhr';

registerSuite({
	name: 'request/providers/xhr',

	before() {
		return dojo1xhr('/__echo/', {
			method: 'GET',
			timeout: 10000
		}).then(
			response => {
				if (response && response.statusCode === 200) {
					return;
				}
				this.skip('Proxy unavailable');
			},
			() => this.skip('Proxy unavailable')
		);
	},

	'HTTP Methods': {
		'GET with URL query'() {
			const dfd = this.async();

			xhr('/__echo/xhr?color=blue&numbers=one&numbers=two')
				.then(response => {
					return response.json<any>();
				})
				.then(dfd.callback((data: any) => {
					assert.deepEqual(data.query, {
						color: 'blue',
						numbers: [ 'one', 'two' ]
					});
				}))
				.catch(dfd.reject)
			;
		}
	}
});
