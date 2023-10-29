import fs from 'node:fs';
import assert from 'node:assert/strict';
import simplifyRanges from 'simplify-ranges';
import {outdent} from 'outdent';
import indentString from 'indent-string';

const CATEGORY_NAMES = new Map([
	['A', 'ambiguous'],
	['F', 'fullwidth'],
	['H', 'halfwidth'],
	['N', 'neutral'],
	['Na', 'narrow'],
	['W', 'wide'],
]);
const DEFAULT_CATEGORY = CATEGORY_NAMES.get('N');
const independentFunctions = {
	ambiguous: 'isAmbiguous',
	fullwidth: 'isFullWidth',
	wide: 'isWide',
};

const toHexadecimal = number => number === 0 ? '0' : `0x${number.toString(16).toUpperCase()}`;
const indent = string => indentString(string, 1, {indent: '\t'});

function parse(input) {
	// Remove comments
	input = input.replaceAll(/\s*#.*$/gm, '').trim();

	const categories = new Map(Array.from(CATEGORY_NAMES, ([, category]) => [category, []]));

	// Parse input and group by category
	for (const line of input.split('\n')) {
		/*
		https://www.unicode.org/Public/UCD/latest/ucd/EastAsianWidth.txt

		The format is two fields separated by a semicolon.
		Field 0: Unicode code point value or range of code point values
		Field 1: East_Asian_Width property, consisting of one of the following values:
						"A", "F", "H", "N", "Na", "W"
		*/
		const [range, eastAsianWidthProperty] = line.split(';').map(x => x.trim());
		const category = CATEGORY_NAMES.get(eastAsianWidthProperty);
		const [start, end = start] = range.split('..').map(part => Number.parseInt(part, 16));
		categories.get(category).push([start, end]);
	}

	for (const [category, ranges] of categories) {
		const simplified = simplifyRanges(ranges, {separateTwoNumberRanges: true});
		assert.ok(simplified.length > 0);
		categories.set(category, simplified);
	}

	return categories;
}

function generateFunctions(categories) {
	const functions = {};

	const branches = [];

	for (const [category, ranges] of categories) {
		if (category === DEFAULT_CATEGORY) {
			continue;
		}

		const conditions = ranges.map(([start, end]) =>
			start === end
				? `x === ${toHexadecimal(start)}`
				: `x >= ${toHexadecimal(start)} && x <= ${toHexadecimal(end)}`,
		);

		const functionName = independentFunctions[category];
		if (functionName) {
			functions[functionName] = outdent`
				function ${functionName}(x) {
					return ${conditions.join('\n\t\t|| ')};
				}
			`;
			branches.push(`if (${functionName}(x)) return '${category}';`);
		} else {
			branches.push(outdent`
				if (
					${conditions.join('\n\t|| ')}
				) {
					return '${category}';
				}
			`);
		}
	}

	functions.getCategory = outdent`
		function getCategory(x) {
			${indent(branches.join('\n\n')).trimStart()}

			return '${DEFAULT_CATEGORY}';
		}
	`;

	return functions;
}

const response = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/EastAsianWidth.txt');
const text = await response.text();
const parsed = parse(text);
const functions = generateFunctions(parsed);

fs.writeFileSync(
	'lookup.js',
	outdent`
		// Generated code.

		${Object.values(functions).map(code => code).join('\n\n')}

		export {${Object.keys(functions).join(', ')}};
	` + '\n',
);

fs.writeFileSync('scripts/EastAsianWidth.txt', text);
