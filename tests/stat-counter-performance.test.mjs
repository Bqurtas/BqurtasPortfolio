import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
function section(from, to) {
  const start = main.indexOf(from), end = main.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `actual application section found: ${from}`);
  return main.slice(start, end);
}
const counterSource = section('  const statDigits = ', '  /* ---------- REVEAL on scroll');
const observationSource = section("    const resizeObserver = typeof ResizeObserver === 'function'", '\n    document.fonts?.ready?.then(queueMeasure');

function fixture() {
  const queued = [], mutations = [], sizeObservers = [];
  const counters = [], subscriptions = [];
  let measurements = 0;
  const notify = (type, target, addedNodes = [], removedNodes = []) => {
    mutations.push({ type, target, addedNodes, removedNodes });
    for (const { callback, options } of subscriptions) {
      if (options[type]) callback([{ type, target, addedNodes, removedNodes }]);
    }
  };
  const textNode = (initial) => {
    let value = initial;
    return {
      nodeType: 3, nextSibling: null, writes: [],
      get data() { return value; },
      set data(next) { this.writes.push(next); value = next; notify('characterData', this); },
    };
  };
  const classList = { contains: () => false };
  const scroller = { children: [], classList, addEventListener() {}, dataset: {} };
  const sheet = { classList, querySelector: () => scroller };
  const elementNode = () => ({
    nodeType: 1, className: '', children: [],
    setAttribute() {},
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.append(node); return node; },
    replaceChildren(...nodes) { this.children = nodes; },
    get firstChild() { return this.children[0] || null; },
    get textContent() { return this.children.map(node => node.nodeType === 3 ? node.data : node.textContent).join(''); },
    set textContent(value) { this.replaceChildren(textNode(value)); },
    querySelector(selector) {
      for (const child of this.children) {
        if (child.className === selector.slice(1)) return child;
        const found = child.querySelector?.(selector);
        if (found) return found;
      }
      return null;
    },
  });
  const document = { createTextNode: textNode, createElement: elementNode };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); sizeObservers.push(this); }
    observe(target) { this.targets.add(target); }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe(_root, options) { subscriptions.push({ callback: this.callback, options }); }
  }
  const context = {
    document, sheets: [sheet], ResizeObserver, MutationObserver,
    updatePaperMeter() {}, queueMeasure() { measurements++; },
    performance: { now: () => 0 }, requestAnimationFrame: callback => queued.push(callback),
  };
  vm.runInNewContext(`${observationSource}\n${counterSource}\nglobalThis.animate = animateCount;`, context);
  return {
    sizeObservers, scroller, mutations,
    get measurements() { return measurements; },
    count(target, suffix = '+', empty = false) {
      const element = elementNode();
      element.dataset = { count: String(target), suffix };
      if (!empty) {
        // The authored counter now separates live digits from the stable
        // suffix and accessible final value. Model that actual DOM shape.
        const span = (name, value) => {
          const node = elementNode();
          node.className = name;
          node.appendChild(textNode(value));
          return node;
        };
        const finalValue = target.toLocaleString('en-US');
        const digits = elementNode();
        digits.className = 'stat-digits';
        digits.append(span('stat-sizer', finalValue), span('stat-live', '0'));
        element.append(digits, span('stat-plus', suffix), span('stat-final', finalValue + suffix));
      }
      element.replaceChildren = function (...nodes) {
        const old = this.children;
        this.children = nodes;
        notify('childList', this, nodes, old);
      };
      counters.push(element);
      context.animate(element);
      return element;
    },
    finish() {
      let now = 0;
      while (queued.length && now < 2000) {
        now += 1000 / 60;
        const frame = queued.splice(0);
        frame.forEach(callback => callback(now));
      }
      assert.equal(queued.length, 0, 'the entrance must settle without a permanent frame loop');
    },
  };
}

test('all four animated statistics retain their values without repeatedly fitting the paper deck', () => {
  const page = fixture();
  const targets = [1000, 25, 20, 100];
  const counters = targets.map(value => page.count(value));
  const originalNodes = counters.map(counter => counter.querySelector('.stat-live').firstChild);
  page.finish();
  counters.forEach((counter, index) => {
    const live = counter.querySelector('.stat-live').firstChild;
    assert.equal(live, originalNodes[index], 'the counter must reuse its authored text node');
    assert.equal(live.data, targets[index].toLocaleString('en-US'));
    assert.equal(counter.querySelector('.stat-plus').textContent, '+', 'the suffix stays separate from animated digits');
    assert.equal(counter.querySelector('.stat-final').textContent, targets[index].toLocaleString('en-US') + '+');
  });
  assert.ok(page.mutations.some(record => record.type === 'characterData'), 'the entrance still visibly counts upward');
  assert.equal(page.mutations.filter(record => record.type === 'childList').length, 0);
  assert.equal(page.measurements, 0, 'number ticks cannot masquerade as newly inserted paper content');
  // Geometry observation stays live: a true change to the observed content
  // still takes the ordinary paper measurement path.
  assert.equal(page.sizeObservers[0].targets.has(page.scroller), true);
  page.sizeObservers[0].callback([{ target: page.scroller }]);
  assert.equal(page.measurements, 1);
});

test('small counts skip unchanged integer frames instead of rewriting the same text', () => {
  const page = fixture();
  const counter = page.count(20);
  page.finish();
  const writes = counter.querySelector('.stat-live').firstChild.writes;
  assert.ok(writes.length <= 21, 'a 20-step count does not need 84 text writes');
  assert.ok(writes.length > 1, 'the animation remains intact');
  assert.ok(writes.every((value, index) => !index || value !== writes[index - 1]));
  assert.equal(writes.at(-1), '20');
});

test('an empty statistic initializes its counter structure once and then reuses the live text node', () => {
  const page = fixture();
  const counter = page.count(25, '', true);
  const initialized = counter.querySelector('.stat-live').firstChild;
  page.finish();
  assert.equal(counter.querySelector('.stat-live').firstChild, initialized);
  assert.equal(initialized.data, '25');
  assert.equal(counter.querySelector('.stat-final').textContent, '25');
  assert.equal(page.mutations.filter(record => record.type === 'childList').length, 1);
  assert.equal(page.measurements, 1, 'only the genuine insertion needs the paper observer');
});
