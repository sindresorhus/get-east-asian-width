import lookup from './lookup.js';

function validate(codePoint) {
	if (!Number.isSafeInteger(codePoint)) {
		throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
	}
}

export function eastAsianWidth(codePoint, {ambiguousAsWide = false} = {}) {
	validate(codePoint);

	switch (lookup(codePoint)) {
		case 'F':
		case 'W': {
			return 2;
		}

		case 'A': {
			return ambiguousAsWide ? 2 : 1;
		}

		default: {
			return 1;
		}
	}
}

export function eastAsianWidthType(codePoint) {
	validate(codePoint);

	switch (lookup(codePoint)) {
		case 'A': {
			return 'ambiguous';
		}

		case 'F': {
			return 'fullwidth';
		}

		case 'H': {
			return 'halfwidth';
		}

		case 'N': {
			return 'neutral';
		}

		case 'Na': {
			return 'narrow';
		}

		case 'W': {
			return 'wide';
		}

		// No default
	}
}
