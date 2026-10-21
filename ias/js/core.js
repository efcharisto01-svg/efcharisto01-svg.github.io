/* 공통: 설정, DOM 도우미, API 선택.
 *
 * 화면은 데이터를 반드시 IAS.api 로만 읽고 쓴다.
 * backend: 'local' = 브라우저 저장소(서버 없음), 'http' = 나중에 붙일 서버(/api).
 * 서버를 붙일 때는 아래 IAS.config.backend 를 'http' 로 바꾸기만 하면 된다.
 */
window.IAS = window.IAS || {};

IAS.config = {
  backend: 'local',
  apiBase: '/api'
};

IAS.backends = {};

IAS.h = function (tag, attrs) {
  var el = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    var v = attrs[k];
    if (v == null || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  Array.prototype.slice.call(arguments, 2).forEach(function add(c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(add);
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return el;
};

IAS.qs = function (name) { return new URLSearchParams(location.search).get(name); };

IAS.fmtDate = function (ts) {
  var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
};

IAS.toast = function (msg) {
  var t = IAS.h('div', { class: 'toast', text: msg });
  document.body.append(t);
  setTimeout(function () { t.remove(); }, 2400);
};

/* 백엔드 선택은 첫 호출 때 한다(스크립트 로드 순서와 무관). */
IAS.api = new Proxy({}, {
  get: function (_, name) {
    var be = IAS.backends[IAS.config.backend];
    if (!be) throw new Error('백엔드를 찾을 수 없습니다: ' + IAS.config.backend);
    return be[name];
  }
});
