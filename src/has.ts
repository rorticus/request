import global from 'dojo-core/global';
import has, { add } from 'dojo-core/has';

export * from 'dojo-core/has';
export default has;

add('fetch', 'fetch' in global && typeof global.fetch === 'function');

add('arraybuffer', typeof global.ArrayBuffer !== 'undefined', true);
add('formdata', typeof global.FormData !== 'undefined', true);
add('filereader', typeof global.FileReader !== 'undefined', true);
add('blob', () => {
	if (typeof global.Blob !== 'undefined') {
		try {
			new Blob();
			return true;
		}
		catch (error) {
			return false;
		}
	}
	return false;
}, true);
