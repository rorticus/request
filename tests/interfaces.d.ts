declare module 'intern/dojo/has!host-node?./services/echo' {
	const echo: any;
	export = echo;
}

declare module 'intern/dojo/node!http' {
	import * as http from 'http';
	export = http;
}

declare module 'intern/dojo/node!querystring' {
	import * as querystring from 'querystring';
	export = querystring;
}

declare module 'intern/dojo/node!http-proxy' {
	import * as httpProxy from 'http-proxy';
	export = httpProxy;
}

declare module 'intern/dojo/node!formidable' {
	import * as formidable from 'formidable';
	export = formidable;
}

declare const Promise: any;
