import { RequestOptions, Response, Provider } from './interfaces';
import ProviderRegistry from './ProviderRegistry';
import Task from 'dojo-core/async/Task';

export const providerRegistry = new ProviderRegistry();

const request: {
	(url: string, options?: RequestOptions): Task<Response>;
	delete(url: string, options?: RequestOptions): Task<Response>;
	get(url: string, options?: RequestOptions): Task<Response>;
	post(url: string, options?: RequestOptions): Task<Response>;
	put(url: string, options?: RequestOptions): Task<Response>;

	setDefaultProvider(provider: Provider): void;
} = <any> function request(url: string, options: RequestOptions = {}): Task<Response> {
	try {
		return providerRegistry.match(url, options)(url, options);
	}
	catch (error) {
		return Task.reject<Response>(error);
	}
};

[ 'DELETE', 'GET', 'POST', 'PUT' ].forEach(method => {
	Object.defineProperty(request, method.toLowerCase(), {
		value(url: string, options: RequestOptions = {}): Task<Response> {
			options = Object.create(options);
			options.method = method;
			return request(url, options);
		}
	});
});

Object.defineProperty(request, 'setDefaultProvider', {
	value(provider: Provider) {
		providerRegistry.setDefaultProvider(provider);
	}
});

export default request;
export * from './interfaces';
export { default as Headers } from './Headers';
export { default as TimeoutError } from './TimeoutError';
export { default as Response, ResponseData } from './Response';
