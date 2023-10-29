import {getCategory, isAmbiguous, isFullWidth, isWide} from './lookup.js';

function validate(codePoint) {
	if (!Number.isSafeInteger(codePoint)) {
		throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
	}
}

export function eastAsianWidthType(codePoint) {
	validate(codePoint);

	return getCategory(codePoint);
}

export function eastAsianWidth(codePoint, {ambiguousAsWide = false} = {}) {
	validate(codePoint);

	if (
		isFullWidth(codePoint)
		|| isWide(codePoint)
		|| (ambiguousAsWide && isAmbiguous(codePoint))
	) {
		return 2;
	}

	return 1;
}

// For Prettier, this doesn't count "ambiguous" characters or valid input, see #6
export const _isNarrowWidth = codePoint => !(isFullWidth(codePoint) || isWide(codePoint));
