import * as registerSuite from 'intern!object';
import Test = require('intern/lib/Test');
import { Thenable } from 'dojo-shim/interfaces';

export type TestFunction = (this: Test) => (void | Thenable<any>);

export interface TestObject {
	[key: string]: string | TestFunction | TestObject;
}

export interface RootTestObject extends TestObject {
	name: string;
	[key: string]: string | TestFunction | TestObject;
}

const object: {
	(definition: RootTestObject): void;
	(definition: () => RootTestObject): void;
} = registerSuite;

export default object;
