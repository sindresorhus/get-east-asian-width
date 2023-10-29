import fs from 'node:fs';
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

const toHexadecimal = number => number === 0 ? '0' : `0x${number.toString(16).toUpperCase()}`;
const indent = string => indentString(string, 1, {indent: '\t'});

function parse(input) {
	// Remove comments
	input = input.trim().replaceAll(/#.*$/gm, '').trim();

	const lines = input.split('\n');
	const categories = new Map(Array.from(CATEGORY_NAMES, ([, category]) => [category, []]));

	// Parse input and group by category
	for (let line of input.split('\n')) {
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
		categories.set(category, simplifyRanges(ranges, {separateTwoNumberRanges: true}));
	}

	return categories;
}

function generateLookupFunction(categories) {
	const branches = [];

	for (const [category, ranges] of categories) {
		if (category === DEFAULT_CATEGORY || ranges.length === 0) {
			continue;
		}

		const conditions = ranges.map(([start, end]) =>
			start === end
				? `x === ${toHexadecimal(start)}`
				: `x >= ${toHexadecimal(start)} && x <= ${toHexadecimal(end)}`,
		);

		branches.push(outdent`
			if (
				${conditions.join('\n\t|| ')}
			) {
				return '${category}';
			}
		`);
	}

	return outdent`
		function lookup(x) {
			${indent(branches.join('\n\n')).trimStart()}

			return '${DEFAULT_CATEGORY}';
		}
	`;
}

const response = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/EastAsianWidth.txt');
const text = await response.text();
const parsed = parse(text);
const lookupFunction = generateLookupFunction(parsed);

fs.writeFileSync(
	'lookup.js',
	outdent`
		// Generated code.

		export default ${lookupFunction}
	` + '\n',
);

fs.writeFileSync('scripts/EastAsianWidth.txt', text);
