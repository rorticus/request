import has, { add } from 'dojo-core/has';
import global from 'dojo-core/global';

export * from 'dojo-core/has';
export default has;

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
