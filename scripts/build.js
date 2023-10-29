import fs from 'node:fs';
import assert from 'node:assert/strict';
import simplifyRanges from 'simplify-ranges';

const types = {
	A: 'ambiguous',
	F: 'fullwidth',
	H: 'halfwidth',
	N: 'neutral',
	Na: 'narrow',
	W: 'wide',
};

const toHexadecimal = number => number === 0 ? '0' : `0x${number.toString(16).toUpperCase()}`;

function parse(input) {
	// Remove comments
	input = input.trim().replaceAll(/^#.*$/gm, '').trim();

	const lines = input.split('\n');
	const categories = new Map();

	// Parse input and group by category
	for (const line of lines) {
		const [codePoint, rest] = line.split(';').map(x => x.trim());
		const type = rest.split(' ')[0];
		assert.ok(Object.hasOwn(types, type));
		const category = types[type];
		const [start, end = start] = codePoint.split('..').map(part => Number.parseInt(part, 16));
		if (!categories.has(category)) {
			categories.set(category, []);
		}

		categories.get(category).push([start, end]);
	}

	for (const [category, ranges] of categories) {
		categories.set(category, simplifyRanges(ranges, {separateTwoNumberRanges: true}));
	}

	return categories;
}

function generateLookupFunction(categories) {
	let code = '// Generated code.\n\nexport default function lookup(x) {\n';

	for (const [category, ranges] of categories) {
		const conditions = ranges.map(([start, end]) =>
			start === end
				? `x === ${toHexadecimal(start)}`
				: `x >= ${toHexadecimal(start)} && x <= ${toHexadecimal(end)}`,
		);

		code += `\n\tif (\n\t\t${conditions.join('\n\t\t|| ')}\n\t) {\n\t\treturn '${category}';\n\t}\n`;
	}

	code += '\n\treturn \'neutral\';\n';
	code += '}\n';

	return code;
}

const response = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/EastAsianWidth.txt');
const text = await response.text();
const parsed = parse(text);
const lookupFunction = generateLookupFunction(parsed);

fs.writeFileSync('lookup.js', lookupFunction);
fs.writeFileSync('scripts/EastAsianWidth.txt', text);
