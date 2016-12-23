import * as intern from 'intern';
import echo = require('intern/dojo/has!host-node?./services/echo');

let server: any;

export function setup() {
	if (echo && intern.mode === 'runner') {
		echo.start().then((echoServer: any) => {
			server = echoServer;
		});
	}
}

export function teardown() {
	server && server.close();
}

export const proxyPort = 9000;

export const proxyUrl = 'http://localhost:9001';

export const maxConcurrency = 3;

export const loaderOptions = {
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'tests', location: '_build/tests' },
		{ name: 'dojo', location: 'node_modules/intern/browser_modules/dojo' },
		{ name: 'dojo-has', location: 'node_modules/dojo-has' },
		{ name: 'dojo-shim', location: 'node_modules/dojo-shim' },
		{ name: 'dojo-core', location: 'node_modules/dojo-core' }
	]
};

export const loaders = {
	'host-browser': 'node_modules/dojo-loader/loader.js',
	'host-node': 'dojo-loader'
};

export const reporters = [ 'Console' ];

export const suites = [
	'tests/unit/request'
];

if (typeof process !== 'undefined') {
}
else {
	suites.push('tests/unit/browser');
}

export const excludeInstrumentation = /^(?:_build\/tests|node_modules)\//;
