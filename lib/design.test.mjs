import test from "node:test";
import assert from "node:assert/strict";
import { designPrice, keepInPrintArea, printedSides, parseDesign, productColours, moveSelection, selectionBounds, resizeLayer, resizeSelection, productViewImages, resizeLayerDimension, missingProductViews, hasRequiredProductImages, getPrintArea, moveLayerToSide, relocatePrintArea } from "./design.ts";
import { addDesignItems, addItem, itemKey, readCart } from "./cart.ts";
import { refreshCart } from "./cart-refresh.ts";

const layer = { id: "layer1", kind: "text", side: "front", x: 250, y: 240,
  width: 120, height: 30, rotation: 0, text: "HAWK", font: "Arial", color: "#111111" };
const customization = { designId: "12345678-1234-1234-1234-123456789012", colour: "As pictured", sides: ["front"], printPricePerSide: 5 };
const product = { id: "1", slug: "shirt", name: "Shirt", price: 30, stock: 5, customization };

test("custom prices use integer cents and never invent missing printing fees", () => {
  assert.equal(designPrice(25, null, 1, 10), null);
  assert.deepEqual(designPrice(25, 5, 2, 3), { unit: 35, total: 105 });
  assert.deepEqual(designPrice(10.01, .1, 1, 3), { unit: 10.11, total: 30.33 });
  assert.deepEqual(printedSides([layer, { ...layer, id: "other", side: "back" }]), ["front", "back"]);
  assert.deepEqual(productColours({}), ["As pictured"]);
});

test("rotated and resized elements stay within the print area", () => {
  const fitted = keepInPrintArea({ ...layer, x: -100, y: 1000, width: 400, height: 200, rotation: 90 });
  const halfWidth = fitted.height / 2;
  const halfHeight = fitted.width / 2;
  assert.ok(fitted.x - halfWidth >= 155 - 1e-8);
  assert.ok(fitted.x + halfWidth <= 345 + 1e-8);
  assert.ok(fitted.y - halfHeight >= 170 - 1e-8);
  assert.ok(fitted.y + halfHeight <= 420 + 1e-8);
});

test("custom lines stay separate from ready-made products and other designs", () => {
  let items = addItem([], { id: "1", slug: "shirt", name: "Shirt", price: 25, stock: 5 }, "M");
  items = addDesignItems(items, product, { M: 1, L: 2 });
  const other = { ...product, customization: { ...customization, designId: "87654321-1234-1234-1234-123456789012" } };
  items = addDesignItems(items, other, { M: 1 });
  assert.equal(items.length, 4);
  assert.notEqual(itemKey(items[0]), itemKey(items[1]));
  assert.notEqual(itemKey(items[1]), itemKey(items[3]));
  assert.deepEqual(readCart(JSON.stringify(items)), items);
  assert.equal(addDesignItems(items, other, { M: 1 }), items);
});

test("cart refresh preserves the design and recomputes printing charges", () => {
  const items = addDesignItems([], product, { M: 2 });
  const current = { ...product, customization: undefined, price: 26, sizes: ["M"], colours: ["As pictured"], requiresSize: true, printPricePerSide: 6 };
  const refreshed = refreshCart(items, [current], ["1"]);
  assert.equal(refreshed.items[0].price, 32);
  assert.equal(refreshed.items[0].customization.designId, customization.designId);
  assert.equal(refreshed.items[0].customization.printPricePerSide, 6);
  assert.equal(refreshCart(items, [{ ...current, printPricePerSide: null }], ["1"]).items.length, 0);
});

test("imported designs reject remote images, invalid data and excessive quantities", () => {
  const design = { version: 1, id: "draft", productId: "1", colour: "As pictured", layers: [layer], quantities: { M: 1 }, updatedAt: new Date().toISOString() };
  assert.ok(parseDesign(design));
  assert.equal(parseDesign({ ...design, layers: [{ ...layer, kind: "image", src: "https://untrusted.example/image.png" }] }), null);
  assert.equal(parseDesign({ ...design, quantities: { M: -1 } }), null);
  assert.equal(parseDesign({ ...design, layers: [{ ...layer, rotation: Infinity }] }), null);
});

test("group movement preserves relative positions and respects the print boundary", () => {
  const first = { ...layer, id: "first", x: 210, width: 60 };
  const second = { ...layer, id: "second", x: 290, width: 60 };
  const moved = moveSelection([first, second], ["first", "second"], 100, 1000);
  assert.equal(moved[1].x - moved[0].x, 80);
  assert.ok(selectionBounds(moved).right <= 345 + 1e-8);
  assert.ok(selectionBounds(moved).bottom <= 420 + 1e-8);
  assert.equal(moved[0].y, moved[1].y);
});

test("new text effects and vector graphics survive save/import validation", () => {
  const styled = { ...layer, font: "Impact", textShape: "arch-up", letterSpacing: 3, outlineWidth: 2,
    outlineColor: "#ffffff", opacity: .5, flipX: true, bold: false, italic: true };
  const art = { ...layer, id: "art", kind: "art", artId: "shield" };
  const draft = { version: 1, id: "draft", productId: "1", colour: "As pictured", layers: [styled, art], quantities: { M: 1 }, updatedAt: new Date().toISOString() };
  const parsed = parseDesign(draft);
  assert.equal(parsed.layers[0].textShape, "arch-up");
  assert.equal(parsed.layers[1].artId, "shield");
  assert.equal(parseDesign({ ...draft, layers: [{ ...styled, letterSpacing: 1000 }] }), null);
  assert.equal(parseDesign({ ...draft, layers: [{ ...art, artId: "unknown" }] }), null);
});

test("product view images use the actual front photo and never substitute it for other sides", () => {
  const source = "https://example.com/actual-front.jpg";
  assert.deepEqual(productViewImages({ image_url: source }), { front: source });
  assert.deepEqual(productViewImages({ image_url: source, design_images: { front: "https://example.com/new-front.jpg", back: "https://example.com/back.jpg", left: "javascript:alert(1)" } }), {
    front: "https://example.com/new-front.jpg", back: "https://example.com/back.jpg",
  });
});

test("individual and group resizing preserve proportions and print boundaries", () => {
  const smaller = resizeLayer(layer, .5);
  assert.equal(smaller.width, 60);
  assert.equal(smaller.height, 15);
  const elements = [layer, { ...layer, id: "other", x: 270, y: 300, width: 50, height: 50 }];
  const result = resizeSelection(elements, ["layer1", "other"], .5);
  assert.equal(result[0].width, 60);
  assert.equal(result[1].width, 25);
  assert.equal(result[1].x - result[0].x, 10);
  const enlarged = resizeSelection(elements, ["layer1", "other"], 100);
  const bounds = selectionBounds(enlarged);
  assert.ok(bounds.left >= 155 - 1e-8 && bounds.right <= 345 + 1e-8);
  assert.ok(bounds.top >= 170 - 1e-8 && bounds.bottom <= 420 + 1e-8);
});

test("sleeve artwork survives design and cart persistence", () => {
  const sleeve = { ...layer, side: "left" };
  const draft = { version: 1, id: "draft", productId: "1", colour: "As pictured", layers: [sleeve], quantities: { M: 1 }, updatedAt: new Date().toISOString() };
  assert.equal(parseDesign(draft).layers[0].side, "left");
  assert.deepEqual(printedSides([layer, sleeve, { ...sleeve, side: "right" }]), ["front", "left", "right"]);
  const cart = addDesignItems([], { ...product, customization: { ...customization, sides: ["front", "left", "right"] } }, { M: 1 });
  assert.deepEqual(readCart(JSON.stringify(cart)), cart);
});

test("height and width resize independently, with optional proportion locking", () => {
  const taller = resizeLayerDimension(layer, "height", 90);
  assert.equal(taller.height, 90);
  assert.equal(taller.width, layer.width);
  const wider = resizeLayerDimension(layer, "width", 160);
  assert.equal(wider.width, 160);
  assert.equal(wider.height, layer.height);
  const locked = resizeLayerDimension({ ...layer, lockAspectRatio: true }, "height", 40);
  assert.equal(locked.height, 40);
  assert.equal(locked.width, 160);
  const rotated = { ...layer, rotation: 45 };
  const fitted = resizeLayerDimension(rotated, "height", 250);
  assert.equal(Math.round(fitted.width), rotated.width);
  const bounds = selectionBounds([fitted]);
  assert.ok(bounds.right - bounds.left <= 190 + 1e-8);
});

test("products require four distinct front, back, left and right photos", () => {
  const views = { front: "https://example.com/front.jpg", back: "https://example.com/back.jpg", left: "https://example.com/left.jpg", right: "https://example.com/right.jpg" };
  assert.equal(hasRequiredProductImages({ design_images: views }), true);
  assert.deepEqual(missingProductViews({ image_url: views.front }), ["back", "left", "right"]);
  for (const side of ["front", "back", "left", "right"]) {
    const missing = { ...views }; delete missing[side];
    assert.equal(hasRequiredProductImages({ design_images: missing }), false);
    assert.equal(hasRequiredProductImages({ design_images: { ...views, [side]: " " } }), false);
    assert.equal(hasRequiredProductImages({ design_images: { ...views, [side]: 123 } }), false);
  }
  assert.equal(hasRequiredProductImages({ design_images: { ...views, back: views.front } }), false);
  assert.equal(hasRequiredProductImages({ design_images: { ...views, back: "https://" } }), false);
});

test("moving artwork to a sleeve moves and sizes it to that sleeve's print area", () => {
  for (const side of ["left", "right"]) {
    const area = getPrintArea(side);
    const moved = moveLayerToSide(layer, side);
    const bounds = selectionBounds([moved]);
    assert.equal(moved.x, area.x + area.width / 2);
    assert.ok(bounds.left >= area.x - 1e-8 && bounds.right <= area.x + area.width + 1e-8);
    assert.ok(bounds.top >= area.y - 1e-8 && bounds.bottom <= area.y + area.height + 1e-8);
    const enlarged = resizeLayerDimension(moved, "width", 1000);
    assert.ok(selectionBounds([enlarged]).right <= area.x + area.width + 1e-8);
    const dragged = moveSelection([moved], [moved.id], -1000, 1000);
    assert.ok(selectionBounds(dragged).left >= area.x - 1e-8);
    assert.ok(selectionBounds(dragged).bottom <= area.y + area.height + 1e-8);
  }
});

test("legacy central sleeve designs migrate once and new saved placements remain stable", () => {
  const draft = { version: 1, id: "draft", productId: "1", colour: "As pictured", layers: [{ ...layer, side: "left" }], quantities: { M: 1 }, updatedAt: new Date().toISOString() };
  const restored = parseDesign(draft);
  assert.equal(restored.version, 2);
  assert.equal(restored.layers[0].x, 402.5);
  assert.deepEqual(parseDesign(restored), restored);
});

test("moving a print area moves its contents, preserves other views and stays on canvas", () => {
  const other = { ...layer, id: "other", side: "back" };
  const moved = relocatePrintArea([layer, other], "front", getPrintArea("front"), 200, 190);
  assert.equal(moved.layers[0].x, layer.x + 45);
  assert.equal(moved.layers[0].y, layer.y + 20);
  assert.equal(moved.layers[1], other);
  assert.deepEqual(moved.layers[0].printArea, moved.area);
  const resized = resizeLayerDimension(moved.layers[0], "height", 120);
  assert.equal(resized.x, moved.layers[0].x);
  const constrained = relocatePrintArea(moved.layers, "front", moved.area, 1000, -1000);
  assert.equal(constrained.area.x, 310);
  assert.equal(constrained.area.y, 0);
});

test("custom print areas and design coordinates survive reopening without being reset", () => {
  const moved = relocatePrintArea([layer], "front", getPrintArea("front"), 200, 190);
  const draft = { version: 2, id: "draft", productId: "1", colour: "As pictured", layers: moved.layers,
    printAreas: { front: moved.area }, quantities: { M: 1 }, updatedAt: new Date().toISOString() };
  const parsed = parseDesign(draft);
  assert.deepEqual(parsed.printAreas.front, moved.area);
  assert.equal(parsed.layers[0].x, moved.layers[0].x);
  assert.deepEqual(parseDesign(parsed), parsed);
  assert.equal(parseDesign({ ...draft, printAreas: { front: { ...moved.area, x: 9999 } } }), null);
});
