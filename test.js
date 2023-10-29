import test from 'ava';
import {eastAsianWidth, eastAsianWidthType} from './index.js';

test('wide', t => {
	const fixture = '字'.codePointAt();
	t.is(eastAsianWidth(fixture), 2);
	t.is(eastAsianWidthType(fixture), 'wide');
});

test('ambiguous', t => {
	const fixture = '⛣'.codePointAt();
	t.is(eastAsianWidth(fixture, {ambiguousAsWide: true}), 2);
	t.is(eastAsianWidth(fixture), 1);
	t.is(eastAsianWidthType(fixture), 'ambiguous');
});

test('validate', t => {
	t.throws(() => {
		eastAsianWidth('invalid');
	}, {instanceOf: TypeError});
	t.throws(() => {
		eastAsianWidthType('invalid');
	}, {instanceOf: TypeError});
});
