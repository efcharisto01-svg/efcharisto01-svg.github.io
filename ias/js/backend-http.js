/* 나중에 붙일 서버용 백엔드. IAS.config.backend = 'http' 로 바꾸면 쓰인다.
 * 아래 경로가 서버가 만들어야 할 API 계약이다. 반환 형태는 backend-local.js 와 같다.
 * 서버는 쿠키 세션(HttpOnly)을 쓰고, 권한은 서버에서 반드시 다시 확인해야 한다.
 */
(function () {
  async function req(method, path, body) {
    var res = await fetch(IAS.config.apiBase + path, {
      method: method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw Object.assign(new Error((data && data.error) || '요청에 실패했습니다.'), { status: res.status });
    return data;
  }
  function q(o) {
    var s = new URLSearchParams();
    Object.keys(o || {}).forEach(function (k) { if (o[k] != null) s.set(k, o[k]); });
    var t = s.toString();
    return t ? '?' + t : '';
  }

  IAS.backends.http = {
    tenants:             function ()        { return req('GET',  '/tenants'); },
    login:               function (p)       { return req('POST', '/auth/login', p); },
    logout:              function ()        { return req('POST', '/auth/logout', {}); },
    me:                  function ()        { return req('GET',  '/auth/me'); },
    changePassword:      function (p)       { return req('POST', '/auth/change-password', p); },
    updateProfile:       function (p)       { return req('POST', '/me/profile', p); },
    apps:                function ()        { return req('GET',  '/me/apps'); },
    boards:              function ()        { return req('GET',  '/board/boards'); },
    listPosts:           function (p)       { return req('GET',  '/board/posts' + q(p)); },
    getPost:             function (id)      { return req('GET',  '/board/posts/' + encodeURIComponent(id)); },
    createPost:          function (p)       { return req('POST', '/board/posts', p); },
    addComment:          function (id, b)   { return req('POST', '/board/posts/' + encodeURIComponent(id) + '/comments', { body: b }); },
    listNotifications:   function ()        { return req('GET',  '/notifications'); },
    markRead:            function (id)      { return req('POST', '/notifications/read', { id: id }); },
    listAudit:           function (p)       { return req('GET',  '/admin/audit' + q(p)); }
    /* resetDemo 는 데모 전용이라 서버에는 없다. */
  };
})();
