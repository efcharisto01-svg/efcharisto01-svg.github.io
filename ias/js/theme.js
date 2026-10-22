/* <head>에서 가장 먼저 로드: 저장된 테마를 깜빡임 없이 적용한다. */
(function () {
  window.IAS = window.IAS || {};
  function get() { try { return localStorage.getItem('ias.theme') || 'system'; } catch (e) { return 'system'; } }
  function apply(mode) {
    if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
  }
  IAS.theme = {
    get: get,
    set: function (mode) { try { localStorage.setItem('ias.theme', mode); } catch (e) {} apply(mode); }
  };
  apply(get());
})();
