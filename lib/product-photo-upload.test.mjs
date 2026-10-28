import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareProductPhoto, MAX_PRODUCT_PHOTO_BYTES } from './product-photo-upload.ts';

test('decodes real photos, rotates/resizes, and writes a WebP without EXIF', async () => {
  const input = await sharp({ create: { width: 2500, height: 10, channels: 3, background: 'red' } })
    .withMetadata({ exif: { IFD0: { Artist: 'private metadata' } } }).png().toBuffer();
  const result = await prepareProductPhoto(new File([input], 'unsafe-name.png', { type: 'image/png' }));
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 2400);
  assert.equal(metadata.exif, undefined);
});

test('rejects invalid payloads, spoofed SVG, unsupported MIME, empty and oversized files', async () => {
  for (const file of [
    new File(['not a photo'], 'photo.png', { type: 'image/png' }),
    new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'], 'photo.png', { type: 'image/png' }),
    new File(['anything'], 'photo.gif', { type: 'image/gif' }),
    new File([], 'photo.png', { type: 'image/png' }),
    new File([new Uint8Array(MAX_PRODUCT_PHOTO_BYTES + 1)], 'photo.png', { type: 'image/png' }),
  ]) await assert.rejects(prepareProductPhoto(file));
});

test('rejects images that exceed the decoded pixel limit', async () => {
  const image = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(prepareProductPhoto(new File([image], 'large.png', { type: 'image/png' })));
});
