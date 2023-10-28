import fs from 'node:fs';
import simplifyRanges from 'simplify-ranges';

function parse(input) {
	// Remove comments
	input = input.trim().replaceAll(/^#.*$/gm, '').trim();

	const lines = input.split('\n');
	const categories = {};

	// Parse input and group by category
	for (const line of lines) {
		const [codePoint, rest] = line.split(';').map(x => x.trim());
		const category = rest.split(' ')[0];
		const parts = codePoint.split('..');
		const start = Number.parseInt(parts[0], 16);
		const end = parts.length === 2 ? Number.parseInt(parts[1], 16) : start;
		categories[category] ??= [];
		categories[category].push([start, end]);
	}

	return Object.fromEntries(
		Object.entries(categories).map(([category, ranges]) => [
			category,
			simplifyRanges(ranges, {separateTwoNumberRanges: true}),
		]),
	);
}

function generateLookupFunction(normalizedCategories) {
	let code = '// Generated code.\n\nexport default function lookup(x) {\n';

	for (const [category, ranges] of Object.entries(normalizedCategories)) {
		const conditions = [];
		for (const [start, end] of ranges) {
			const condition = start === end
				? `x === 0x${start.toString(16)}`
				: `x >= 0x${start.toString(16)} && x <= 0x${end.toString(16)}`;

			conditions.push(condition);
		}

		code += `\n\tif (\n\t\t${conditions.join('\n\t\t|| ')}\n\t) {\n\t\treturn '${category}';\n\t}\n`;
	}

	code += '\n\treturn \'N\';\n';
	code += '}\n';

	return code;
}

const response = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/EastAsianWidth.txt');
const text = await response.text();
const parsed = parse(text);
const lookupFunction = generateLookupFunction(parsed);

fs.writeFileSync('lookup.js', lookupFunction);
fs.writeFileSync('scripts/EastAsianWidth.txt', text);
