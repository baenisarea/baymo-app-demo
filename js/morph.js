/* Minimal DOM morphing: patches live DOM to match new HTML, keeping element identity
   (scroll positions, focused inputs and running illustration iframes survive re-renders).
   Children with data-key are matched by key; others by position and tag. */
(function () {
  const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);

  function syncAttrs(a, b) {
    for (const { name } of Array.from(a.attributes)) if (!b.hasAttribute(name)) a.removeAttribute(name);
    for (const { name, value } of Array.from(b.attributes)) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
    const tag = a.nodeName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked');
      else if (document.activeElement !== a) {
        const v = tag === 'TEXTAREA' ? b.textContent : (b.getAttribute('value') ?? '');
        if (a.value !== v) a.value = v;
      }
    }
  }

  function morphNode(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) {
      const c = b.cloneNode(true); a.replaceWith(c); return c;
    }
    if (a.nodeType === 3 || a.nodeType === 8) {
      if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
      return a;
    }
    if (a.nodeName === 'IFRAME') {
      if (a.getAttribute('src') !== b.getAttribute('src')) { const c = b.cloneNode(true); a.replaceWith(c); return c; }
      for (const { name, value } of Array.from(b.attributes)) if (name !== 'src' && a.getAttribute(name) !== value) a.setAttribute(name, value);
      return a;
    }
    syncAttrs(a, b);
    if (a.nodeName === 'TEXTAREA' || a.hasAttribute('data-static')) return a;
    morphChildren(a, b);
    return a;
  }

  function morphChildren(parent, next) {
    const oldKids = Array.from(parent.childNodes);
    const keyed = new Map();
    for (const n of oldKids) { const k = keyOf(n); if (k) keyed.set(k, n); }
    const used = new Set();
    let cursor = 0;
    const nextUnkeyed = () => {
      while (cursor < oldKids.length && (keyOf(oldKids[cursor]) || used.has(oldKids[cursor]))) cursor++;
      return oldKids[cursor];
    };
    let ref = parent.firstChild;
    for (const nb of Array.from(next.childNodes)) {
      const k = keyOf(nb);
      let match = null;
      if (k) {
        match = keyed.get(k) || null;
        if (match && used.has(match)) match = null;
      } else {
        const cand = nextUnkeyed();
        if (cand && cand.nodeName === nb.nodeName) { match = cand; cursor++; }
      }
      if (match) {
        used.add(match);
        if (match !== ref) parent.insertBefore(match, ref);
        const res = morphNode(match, nb);
        ref = res.nextSibling;
      } else {
        const fresh = nb.cloneNode(true);
        parent.insertBefore(fresh, ref);
        ref = fresh.nextSibling;
      }
    }
    for (const n of oldKids) if (!used.has(n) && n.parentNode === parent) {
      // nodes inserted fresh are not in oldKids; only remove unmatched originals
      n.remove();
    }
  }

  window.morph = function (target, html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const wrapper = document.createElement(target.nodeName);
    wrapper.appendChild(tpl.content);
    morphChildren(target, wrapper);
  };
})();
