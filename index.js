import lookup from './lookup.js';

function validate(codePoint) {
	if (!Number.isSafeInteger(codePoint)) {
		throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
	}
}

export function eastAsianWidthType(codePoint) {
	validate(codePoint);

	return lookup(codePoint);
}

export function eastAsianWidth(codePoint, {ambiguousAsWide = false} = {}) {
	const type = eastAsianWidthType(codePoint);
	return type === 'fullwidth' || type === 'wide' || (type === 'ambiguous' && ambiguousAsWide)
		? 2
		: 1;
}
