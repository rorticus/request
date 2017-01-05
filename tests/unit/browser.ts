import registerSuite from '../object';
import * as assert from 'intern/chai!assert';
import * as dojo1xhr from 'dojo/request/xhr';

import request from '../../src/request';
import xhr from '../../src/providers/xhr';

import './providers/xhr';

import Response from '../../src/Response';

interface EchoData {
	method: string;
	query: any;
	headers: any;
	payload: any;
}

registerSuite({
	name: 'request',

	before() {
		request.setDefaultProvider(xhr);

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

	'.get'() {
		const dfd = this.async();

		request.get('/__echo/xhr?color=blue')
			.then((response: Response) => response.json<EchoData>())
			.then(<any> dfd.callback((data: EchoData) => {
				assert.deepEqual(data.query, { color: 'blue' });
				assert.equal(data.method.toLowerCase(), 'get');
			}));
	}
});
