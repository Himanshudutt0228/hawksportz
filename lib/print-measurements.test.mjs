import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standardPrintInches, measurementScale } from './print-measurements.ts';
import { printAreaForSize } from './print-pricing.ts';

const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} should equal ${b}`);
test('every supported box uses equal scaling on both axes and preserves visual aspect ratio', () => {
  for (const template of ['standard','long-sleeve']) for (const side of ['front','back','left','right']) for (const size of ['pocket','large']) {
    const area=printAreaForSize(side,size,undefined,template);
    const inches=standardPrintInches(side,size,template);
    close(inches.width/inches.height,area.width/area.height);
    for(const unit of ['in','cm']) {
      const scale=measurementScale(inches,unit);
      close(scale.width,scale.height);
      close(area.width*scale.width,inches.width*(unit==='cm'?2.54:1));
      close(area.height*scale.height,inches.height*(unit==='cm'?2.54:1));
      // Both square artwork and rectangular artwork keep their visible proportions.
      for(const [w,h] of [[40,40],[60,80],[area.width,area.height]]) close((w*scale.width)/(h*scale.height),w/h);
    }
  }
});
test('Large rectangle and Small sleeves no longer report square dimensions', () => {
  const large=standardPrintInches('front','large','standard');close(large.width,11);close(large.height,250*11/190);
  const pocket=standardPrintInches('back','pocket','standard');close(pocket.width,70*11/190);close(pocket.height,pocket.width);
  const small=standardPrintInches('left','pocket','standard');close(small.width,65*11/190);close(small.height,70*11/190);
  const long=standardPrintInches('right','pocket','long-sleeve');close(long.width,65*11/190);close(long.height,200*11/190);
  assert.equal(standardPrintInches('front','pocket','headwear'),null);
});
test('cm conversion and entry round trip do not resize the artwork', () => {
  const inches=standardPrintInches('front','large','standard');
  const a=measurementScale(inches,'in'),b=measurementScale(inches,'cm');
  for(const axis of ['width','height']) { close(b[axis]/a[axis],2.54);close(4/a[axis],10.16/b[axis]); }
  assert.deepEqual(measurementScale(null,'cm'),{width:1,height:1});
});

test('all box sizes share one scale including legacy smaller sleeve boxes', () => {
  const large=standardPrintInches('front','large','standard');
  const long=standardPrintInches('left','pocket','long-sleeve');
  close(long.height/large.height,200/250);
  for(const template of ['standard','long-sleeve']) for(const side of ['front','back','left','right']) for(const size of ['pocket','large']) {
    const inches=standardPrintInches(side,size,template);
    const scale=measurementScale(inches,'in');
    close(scale.width,11/190);close(scale.height,11/190);
    close(40*scale.width,40*measurementScale(large,'in').width);
  }
});
