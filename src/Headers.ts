import { IterableIterator, forOf, ShimIterator } from 'dojo-shim/iterator';
import Map from 'dojo-shim/Map';
import { Headers as HeadersInterface } from './interfaces';

function isHeadersLike(object: any): object is HeadersInterface {
	return typeof object.append === 'function' && typeof object.entries === 'function' && typeof object[Symbol.iterator] === 'function';
}

export default class Headers implements HeadersInterface {
	protected map = new Map<string, string[]>();

	constructor(headers?: { [key: string]: string } | HeadersInterface) {
		if (headers) {
			if (headers instanceof Headers) {
				this.map = new Map(headers.map);
			}
			else if (isHeadersLike(headers)) {
				forOf(headers, ([key, value]) => {
					this.append(key, value);
				});
			}
			else {
				for (let key in headers) {
					this.set(key, headers[key]);
				}
			}
		}
	}

	append(name: string, value: string) {
		const values = this.map.get(name.toLowerCase());

		if (values) {
			values.push(value);
		}
		else {
			this.set(name, value);
		}
	}

	delete(name: string) {
		this.map.delete(name.toLowerCase());
	}

	entries(): IterableIterator<[string, string]> {
		const entries: [string, string][] = [];
		forOf(this.map.entries(), ([key, values]) => {
			values.forEach(value => {
				entries.push([key, value]);
			});
		});
		return new ShimIterator(entries);
	}

	get(name: string): string | null {
		const values = this.map.get(name.toLowerCase());

		if (values) {
			return values[0];
		}
		else {
			return null;
		}
	}

	getAll(name: string): string[] {
		const values = this.map.get(name.toLowerCase());

		if (values) {
			return values.slice(0);
		}
		else {
			return [];
		}
	}

	has(name: string): boolean {
		return this.map.has(name.toLowerCase());
	}

	keys(): IterableIterator<string> {
		return this.map.keys();
	}

	set(name: string, value: string) {
		this.map.set(name.toLowerCase(), [ value ]);
	}

	values(): IterableIterator<string> {
		const values: string[] = [];
		forOf(this.map.values(), value => {
			values.push(...value);
		});
		return new ShimIterator(values);
	}

	[Symbol.iterator]() {
		return this.entries();
	}
}
