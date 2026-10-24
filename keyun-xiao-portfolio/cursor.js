/* Glass cursor — a translucent, blurred disc that replaces the pointer, and
   stretches into a labelled pill over anything carrying data-cursor="…".
   It is built in script rather than CSS so that the native cursor is only
   hidden once the replacement actually exists, and only where there is a
   real pointer to replace. */
(function () {
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!fine.matches) return;

  var LABEL_FONT = '500 15px/1 Arial,Helvetica,sans-serif';
  var PILL_H = 46;        // pill height
  var PILL_PAD = 28;      // space either side of the label

  var css = document.createElement('style');
  css.textContent = [
    ':root{--glass-size:clamp(24px,2vw,90px)}',
    'html.has-glass-cursor,html.has-glass-cursor body,',
    'html.has-glass-cursor a,html.has-glass-cursor button,html.has-glass-cursor label,',
    'html.has-glass-cursor summary,html.has-glass-cursor input,',
    'html.has-glass-cursor [role="button"],html.has-glass-cursor .tile{cursor:none}',
    '#glass-cursor{',
    '  position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;',
    '  display:flex;align-items:center;justify-content:center;overflow:hidden;',
    '  width:var(--glass-size);height:var(--glass-size);border-radius:50%;',
    '  transform:translate3d(-100px,-100px,0) translate(-50%,-50%);',
    '  opacity:0;',
    '  transition:opacity .18s ease,width .34s cubic-bezier(.22,1,.36,1),',
    '    height .34s cubic-bezier(.22,1,.36,1),border-radius .34s cubic-bezier(.22,1,.36,1),',
    '    background .26s ease,border-color .26s ease,box-shadow .26s ease;',
    /* the glass itself: it refracts the page behind it, carries a lit rim,
       and keeps a soft shadow so it sits above the paper */
    '  backdrop-filter:blur(7px) saturate(1.2) brightness(1.04);',
    '  -webkit-backdrop-filter:blur(7px) saturate(1.2) brightness(1.04);',
    '  background:linear-gradient(155deg,rgba(255,255,255,.87) 0%,rgba(255,255,255,.31) 38%,',
    '    rgba(124,142,131,.42) 72%,rgba(255,255,255,.67) 100%);',
    '  border:1px solid rgba(255,255,255,.78);',
    '  box-shadow:inset 0 1px 2px rgba(255,255,255,.95),',
    '    inset 0 -6px 12px rgba(23,32,30,.16),',
    '    inset 0 0 0 1px rgba(23,32,30,.05),',
    '    0 4px 14px rgba(23,32,30,.20);',
    '}',
    '#glass-cursor.is-visible{opacity:1}',
    /* the labelled state: smoked glass, white type, same lit rim */
    '#glass-cursor.is-pill{',
    '  backdrop-filter:blur(9px) saturate(1.15);',
    '  -webkit-backdrop-filter:blur(9px) saturate(1.15);',
    '  background:linear-gradient(145deg,rgba(196,200,198,.58) 0%,rgba(146,152,149,.48) 46%,',
    '    rgba(108,115,111,.56) 100%);',
    '  border:1px solid rgba(255,255,255,.46);',
    '  box-shadow:inset 0 1px 1px rgba(255,255,255,.72),',
    '    inset 0 -10px 18px rgba(23,32,30,.14),',
    '    0 8px 24px rgba(23,32,30,.24);',
    '}',
    '#glass-cursor .glass-label{',
    '  font:' + LABEL_FONT + ';letter-spacing:.02em;white-space:nowrap;color:#fff;',
    '  opacity:0;transform:scale(.9);',
    '  transition:opacity .2s ease .06s,transform .3s cubic-bezier(.22,1,.36,1) .04s;',
    '}',
    '#glass-cursor.is-pill .glass-label{opacity:1;transform:none}',
    '@media (prefers-reduced-transparency: reduce){',
    '  #glass-cursor{backdrop-filter:none;-webkit-backdrop-filter:none;',
    '   background:rgba(255,255,255,.70)}',
    '  #glass-cursor.is-pill{background:rgba(96,104,100,.88)}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  #glass-cursor,#glass-cursor .glass-label{transition-duration:.01ms}',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  var dot = document.createElement('div');
  dot.id = 'glass-cursor';
  dot.setAttribute('aria-hidden', 'true');
  var label = document.createElement('span');
  label.className = 'glass-label';
  dot.appendChild(label);
  document.body.appendChild(dot);
  document.documentElement.classList.add('has-glass-cursor');

  // offscreen ruler, so the pill can be sized before the label is shown
  var ruler = document.createElement('span');
  ruler.setAttribute('aria-hidden', 'true');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:-9999px;white-space:nowrap;' +
    'letter-spacing:.02em;font:' + LABEL_FONT;
  document.body.appendChild(ruler);

  var x = -100, y = -100, queued = false, seen = false, current = null;

  function draw() {
    queued = false;
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
  }

  function setLabel(text) {
    if (text === current) return;
    current = text;
    if (text) {
      ruler.textContent = text;
      var w = Math.ceil(ruler.getBoundingClientRect().width) + PILL_PAD * 2;
      label.textContent = text;
      dot.style.width = w + 'px';
      dot.style.height = PILL_H + 'px';
      dot.style.borderRadius = (PILL_H / 2) + 'px';
      dot.classList.add('is-pill');
    } else {
      dot.classList.remove('is-pill');
      dot.style.width = '';
      dot.style.height = '';
      dot.style.borderRadius = '';
    }
  }

  function move(e) {
    x = e.clientX;
    y = e.clientY;
    if (!seen) { seen = true; draw(); dot.classList.add('is-visible'); }
    if (!queued) { queued = true; requestAnimationFrame(draw); }
    var hit = e.target && e.target.closest ? e.target.closest('[data-cursor]') : null;
    setLabel(hit ? hit.getAttribute('data-cursor') : null);
  }

  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerdown', move, { passive: true });
  document.addEventListener('pointerover', move, { passive: true });
  document.addEventListener('mouseleave', function () { dot.classList.remove('is-visible'); });
  document.addEventListener('mouseenter', function () { if (seen) dot.classList.add('is-visible'); });
  window.addEventListener('blur', function () { dot.classList.remove('is-visible'); });

  // if the device gains a coarse pointer (tablet with the keyboard removed), stand down
  fine.addEventListener('change', function (e) {
    if (!e.matches) {
      dot.classList.remove('is-visible');
      document.documentElement.classList.remove('has-glass-cursor');
    } else {
      document.documentElement.classList.add('has-glass-cursor');
    }
  });
})();
