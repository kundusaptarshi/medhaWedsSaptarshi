import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGenericPrintCardLayout,
  computePrintCardLayout,
} from './qrGenerator';

test('computePrintCardLayout keeps compact spacing between QR frame, guest name, and scan prompt', () => {
  const singleLine = computePrintCardLayout(1);
  assert.equal(singleLine.nameStartY - singleLine.frameBottom, 64);
  assert.equal(singleLine.promptY - singleLine.nameStartY, 46);
  // Total gap from QR white frame bottom to scan prompt is compact (110px vs old 348px)
  assert.equal(singleLine.promptY - singleLine.frameBottom, 110);
  // Bottom margin from prompt to inner gold border (height - 62) stays balanced
  assert.equal(singleLine.height - 62 - singleLine.promptY, 42);

  const twoLines = computePrintCardLayout(2);
  assert.equal(twoLines.promptY - singleLine.promptY, singleLine.nameLineHeight);
  assert.equal(twoLines.height - singleLine.height, singleLine.nameLineHeight);

  const threeLines = computePrintCardLayout(3);
  assert.equal(threeLines.promptY - twoLines.promptY, singleLine.nameLineHeight);
});

test('computeGenericPrintCardLayout places scan prompt snugly beneath QR frame with no guest name block', () => {
  const genericLayout = computeGenericPrintCardLayout();
  assert.equal(genericLayout.frameBottom, 1080);
  assert.equal(genericLayout.promptY - genericLayout.frameBottom, 56);
  assert.equal(genericLayout.height - 62 - genericLayout.promptY, 42);
  assert.ok(genericLayout.height < computePrintCardLayout(1).height);
});
