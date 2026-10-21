/* 서버 없는 백엔드: 데이터는 이 브라우저의 localStorage 에만 저장된다.
 * 데모 전용이다. 인증·권한이 브라우저 안에서 돌기 때문에 실제 보안이 아니다.
 * 메서드 이름과 반환 형태는 backend-http.js 와 같아야 한다(서버 API 설계의 기준).
 */
(function () {
  var KEY = 'ias.db.v1', SES = 'ias.session';
  var DAY = 86400000;
  var enc = new TextEncoder();
  var db = null, memSession = null;

  function fail(status, msg) { return Object.assign(new Error(msg), { status: status }); }

  async function hash(pw, salt) {
    var buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + pw));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function getSession() { try { return localStorage.getItem(SES); } catch (e) { return memSession; } }
  function setSession(v) {
    memSession = v;
    try { v ? localStorage.setItem(SES, v) : localStorage.removeItem(SES); } catch (e) {}
  }

  async function seed() {
    var now = Date.now();
    async function user(id, name, role, dept, title, mustChange) {
      var salt = id + '-salt';
      return { id: id, tenant: 'acme', name: name, role: role, dept: dept, title: title, email: '', phone: '',
        salt: salt, pwHash: await hash('Demo1234!', salt), mustChange: !!mustChange, failed: 0, lockedUntil: 0 };
    }
    db = {
      seq: 10,
      tenants: [{ id: 'acme', name: '에이씨엠이(ACME)' }],
      users: [
        await user('admin', '관리자', 'admin', '경영지원', '팀장'),
        await user('kim', '김민수', 'member', '영업', '대리'),
        await user('newbie', '이신입', 'member', '영업', '사원', true)
      ],
      posts: [
        { id: 1, tenant: 'acme', board: 'notice', title: 'IAS 그룹웨어 데모에 오신 것을 환영합니다', authorId: 'admin', at: now - 2 * DAY,
          body: '이 사이트는 서버 없이 브라우저에서만 동작하는 체험용 데모입니다.\n작성한 글과 댓글은 이 브라우저에만 저장됩니다.', comments: [] },
        { id: 2, tenant: 'acme', board: 'free', title: '점심 메뉴 추천 받습니다', authorId: 'kim', at: now - DAY,
          body: '오늘 점심 뭐 드실래요?', comments: [{ id: 3, authorId: 'admin', body: '저는 국밥이요.', at: now - DAY + 3600000 }] }
      ],
      notifs: [],
      audit: [{ id: 4, at: now, category: 'admin', event: 'seed', userId: null, summary: '데모 데이터를 만들었습니다' }]
    };
    persist();
  }

  var ready = (async function () {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db) await seed();
  })();

  function nextId() { db.seq += 1; return db.seq; }
  function record(category, event, userId, summary) {
    db.audit.push({ id: nextId(), at: Date.now(), category: category, event: event, userId: userId, summary: summary });
  }
  function notify(userId, title, body, link) {
    db.notifs.push({ id: nextId(), userId: userId, app: 'board', title: title, body: body, link: link, at: Date.now(), read: false });
  }
  function nameOf(id) { var u = db.users.find(function (x) { return x.id === id; }); return u ? u.name : id; }

  function pub(u) {
    var admin = u.role === 'admin';
    return {
      id: u.id, tenant: u.tenant, name: u.name, role: u.role, dept: u.dept, title: u.title,
      email: u.email, phone: u.phone, mustChange: u.mustChange,
      tenantName: db.tenants.find(function (t) { return t.id === u.tenant; }).name,
      permissions: admin ? ['*'] : ['app:board', 'widget:board-recent']
    };
  }

  async function current() {
    await ready;
    var u = db.users.find(function (x) { return x.id === getSession(); });
    if (!u) throw fail(401, '로그인이 필요합니다');
    return u;
  }
  function can(u, kind, id) { return u.role === 'admin' || (kind === 'app' && id === 'board') || (kind === 'widget' && id === 'board-recent'); }

  var BOARDS = [{ id: 'notice', name: '공지사항', writeRole: 'admin' }, { id: 'free', name: '자유게시판', writeRole: 'member' }];

  IAS.backends.local = {
    async tenants() { await ready; return db.tenants.map(function (t) { return { id: t.id, name: t.name }; }); },

    async login(p) {
      await ready;
      var u = db.users.find(function (x) { return x.tenant === p.tenant && x.id === p.userId; });
      if (!u) throw fail(401, '회사, 아이디 또는 비밀번호를 확인해 주세요.');
      if (u.lockedUntil > Date.now()) throw fail(423, '로그인 실패가 많아 잠겼습니다. 잠시 후 다시 시도해 주세요.');
      if (await hash(p.password, u.salt) !== u.pwHash) {
        u.failed += 1;
        if (u.failed >= 5) { u.lockedUntil = Date.now() + 5 * 60000; u.failed = 0; record('security', 'login_locked', u.id, '로그인 5회 실패로 5분간 잠김'); }
        else record('security', 'login_fail', u.id, '로그인 실패');
        persist();
        throw fail(401, '회사, 아이디 또는 비밀번호를 확인해 주세요.');
      }
      u.failed = 0; u.lockedUntil = 0;
      record('security', 'login', u.id, '로그인');
      persist(); setSession(u.id);
      return pub(u);
    },

    async logout() {
      await ready;
      var id = getSession();
      if (id) { record('security', 'logout', id, '로그아웃'); persist(); }
      setSession(null);
    },

    async me() { return pub(await current()); },

    async changePassword(p) {
      var u = await current();
      if (await hash(p.current, u.salt) !== u.pwHash) throw fail(400, '현재 비밀번호가 맞지 않습니다.');
      if (p.next.length < 8 || !/[A-Za-z]/.test(p.next) || !/\d/.test(p.next)) throw fail(400, '새 비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.');
      if (p.next === p.current) throw fail(400, '현재와 다른 비밀번호를 써 주세요.');
      u.pwHash = await hash(p.next, u.salt); u.mustChange = false;
      record('security', 'password_change', u.id, '비밀번호 변경');
      persist();
    },

    async updateProfile(p) {
      var u = await current();
      var before = u.email + '/' + u.phone;
      u.email = String(p.email || '').slice(0, 100); u.phone = String(p.phone || '').slice(0, 30);
      record('data', 'profile_update', u.id, '내 정보 변경 (' + before + ' → ' + u.email + '/' + u.phone + ')');
      persist();
      return pub(u);
    },

    /* 메뉴에 보일 앱·위젯. 화면은 이 목록만 보고 그린다. */
    async apps() {
      var u = await current();
      var apps = [
        { id: 'board', name: '게시판', link: 'board.html', color: '#4f8cff', icon: '📋' },
        { id: 'audit', name: '변경 기록', link: 'log.html', color: '#7a6cf0', icon: '🧾' }
      ].filter(function (a) { return can(u, 'app', a.id); });
      var widgets = [
        { id: 'board-recent', name: '최근 게시글', app: 'board' },
        { id: 'audit-recent', name: '최근 기록', app: 'audit' }
      ].filter(function (w) { return can(u, 'widget', w.id); });
      return { apps: apps, widgets: widgets };
    },

    async boards() { await current(); return BOARDS.slice(); },

    async listPosts(p) {
      var u = await current();
      p = p || {};
      return db.posts.filter(function (x) { return x.tenant === u.tenant && (!p.board || x.board === p.board); })
        .sort(function (a, b) { return (b.board === 'notice') - (a.board === 'notice') || b.at - a.at; })
        .slice(0, p.limit || 200)
        .map(function (x) { return { id: x.id, board: x.board, title: x.title, authorName: nameOf(x.authorId), at: x.at, commentCount: x.comments.length }; });
    },

    async getPost(id) {
      var u = await current();
      var x = db.posts.find(function (q) { return q.id === Number(id) && q.tenant === u.tenant; });
      if (!x) throw fail(404, '글을 찾을 수 없습니다.');
      return { id: x.id, board: x.board, title: x.title, body: x.body, authorName: nameOf(x.authorId), at: x.at,
        comments: x.comments.map(function (c) { return { id: c.id, authorName: nameOf(c.authorId), body: c.body, at: c.at }; }) };
    },

    async createPost(p) {
      var u = await current();
      var board = BOARDS.find(function (b) { return b.id === p.board; });
      if (!board) throw fail(400, '게시판을 선택해 주세요.');
      if (board.writeRole === 'admin' && u.role !== 'admin') throw fail(403, '이 게시판은 관리자만 글을 쓸 수 있습니다.');
      var title = String(p.title || '').trim(), body = String(p.body || '').trim();
      if (!title) throw fail(400, '제목을 입력해 주세요.');
      if (!body) throw fail(400, '내용을 입력해 주세요.');
      var post = { id: nextId(), tenant: u.tenant, board: board.id, title: title.slice(0, 120), body: body.slice(0, 5000), authorId: u.id, at: Date.now(), comments: [] };
      db.posts.push(post);
      db.users.forEach(function (o) { if (o.id !== u.id && o.tenant === u.tenant) notify(o.id, '새 글: ' + post.title, u.name + ' · ' + board.name, 'post.html?id=' + post.id); });
      record('data', 'post_create', u.id, '게시글 작성: ' + post.title);
      persist();
      return { id: post.id };
    },

    async addComment(postId, body) {
      var u = await current();
      var x = db.posts.find(function (q) { return q.id === Number(postId) && q.tenant === u.tenant; });
      if (!x) throw fail(404, '글을 찾을 수 없습니다.');
      body = String(body || '').trim();
      if (!body) throw fail(400, '댓글 내용을 입력해 주세요.');
      x.comments.push({ id: nextId(), authorId: u.id, body: body.slice(0, 1000), at: Date.now() });
      if (x.authorId !== u.id) notify(x.authorId, '내 글에 댓글: ' + x.title, u.name + ': ' + body.slice(0, 40), 'post.html?id=' + x.id);
      record('data', 'comment_create', u.id, '댓글 작성: ' + x.title);
      persist();
    },

    async listNotifications() {
      var u = await current();
      var items = db.notifs.filter(function (n) { return n.userId === u.id; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 50);
      return { total: items.length, unread: items.filter(function (n) { return !n.read; }).length, items: items };
    },

    async markRead(id) {
      var u = await current();
      db.notifs.forEach(function (n) { if (n.userId === u.id && (id === 'all' || n.id === id)) n.read = true; });
      persist();
    },

    async listAudit(p) {
      var u = await current();
      if (!can(u, 'app', 'audit') || u.role !== 'admin') throw fail(403, '권한이 없습니다.');
      return db.audit.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, (p && p.limit) || 200)
        .map(function (a) { return { at: a.at, category: a.category, event: a.event, user: a.userId ? nameOf(a.userId) : '시스템', summary: a.summary }; });
    },

    /* 데모 전용: 서버 백엔드에는 없다. */
    async resetDemo() { setSession(null); await seed(); }
  };
})();
