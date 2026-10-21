/* 로그인 확인 + 상단 바(알림 종, 프로필 패널). 로그인 후 화면은 모두 이걸 쓴다. */
(function () {
  var h = IAS.h;

  IAS.auth = {
    /* 로그인되어 있으면 me 를, 아니면 로그인 화면으로 보낸다. */
    require: async function (opts) {
      opts = opts || {};
      var me;
      try { me = await IAS.api.me(); }
      catch (e) { location.replace('login.html'); return new Promise(function () {}); }
      if (me.mustChange && !opts.allowMustChange) { location.replace('change-password.html'); return new Promise(function () {}); }
      if (opts.admin && me.role !== 'admin') { location.replace('home.html'); return new Promise(function () {}); }
      return me;
    },
    logout: async function () {
      try { await IAS.api.logout(); } catch (e) {}
      location.replace('login.html');
    }
  };

  function closePanels() { document.querySelectorAll('.panel.open').forEach(function (p) { p.classList.remove('open'); }); }

  IAS.topbar = {
    mount: function (o) {
      var me = o.me;
      document.body.classList.add('has-topbar');

      var badge = h('span', { class: 'badge', hidden: true });
      var bell = h('button', { class: 'ibtn', type: 'button', 'aria-label': '알림' }, '🔔', badge);
      var avatar = h('button', { class: 'ibtn avatar', type: 'button', 'aria-label': '내 정보', text: me.name.slice(0, 1) });
      var notifPanel = h('div', { class: 'panel glass scroll' });
      var profPanel = h('div', { class: 'panel glass scroll' });

      var left = o.back
        ? h('a', { class: 'ibtn', href: o.back, 'aria-label': '뒤로' }, '←')
        : h('a', { class: 'ibtn', href: 'home.html', 'aria-label': '홈' }, '⌂');
      document.body.prepend(h('header', { class: 'topbar glass' },
        left, h('h1', { class: 'title', text: o.title || 'IAS' }), bell, avatar, notifPanel, profPanel));

      /* 알림 */
      async function refresh() {
        var r;
        try { r = await IAS.api.listNotifications(); } catch (e) { return; }
        badge.hidden = r.unread === 0;
        badge.textContent = r.unread > 99 ? '99+' : r.unread;
        notifPanel.replaceChildren(
          h('div', { class: 'panel-head' },
            h('span', { text: '전체 ' + r.total + '건 · 안 읽음 ' + r.unread + '건' }),
            r.unread ? h('button', { class: 'link', type: 'button', onclick: async function () { await IAS.api.markRead('all'); refresh(); } }, '모두 읽음') : null),
          ...(r.items.length ? r.items.map(function (n) {
            return h('button', { class: 'notif-item' + (n.read ? '' : ' unread'), type: 'button', onclick: async function () {
              await IAS.api.markRead(n.id);
              if (n.link && /^[\w-]+\.html(\?[\w=&-]*)?$/.test(n.link)) location.href = n.link; else refresh();
            } }, h('b', { text: n.title }), h('small', { text: n.body + ' · ' + IAS.fmtDate(n.at) }));
          }) : [h('p', { class: 'muted pad', text: '알림이 없습니다.' })]));
      }
      bell.addEventListener('click', function (e) { e.stopPropagation(); var open = notifPanel.classList.contains('open'); closePanels(); if (!open) { refresh(); notifPanel.classList.add('open'); } });
      refresh();
      setInterval(function () { if (!document.hidden) refresh(); }, 30000);

      /* 프로필 */
      function seg(value, label) {
        return h('button', { type: 'button', class: IAS.theme.get() === value ? 'on' : '', onclick: function (e) {
          IAS.theme.set(value);
          e.currentTarget.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
          e.currentTarget.classList.add('on');
        } }, label);
      }
      var email = h('input', { class: 'field', type: 'email', value: me.email || '', placeholder: '이메일', maxlength: '100', autocomplete: 'email' });
      var phone = h('input', { class: 'field', type: 'tel', value: me.phone || '', placeholder: '전화번호', maxlength: '30', autocomplete: 'tel' });
      profPanel.append(
        h('div', { class: 'me-card' },
          h('div', { class: 'me-photo', text: me.name.slice(0, 1) }),
          h('div', null, h('b', { text: me.name }), h('small', { text: [me.tenantName, me.dept, me.title].filter(Boolean).join(' · ') }))),
        h('label', { class: 'lbl', text: '화면' }),
        h('div', { class: 'segmented' }, seg('system', '시스템'), seg('light', '라이트'), seg('dark', '다크')),
        h('label', { class: 'lbl', text: '내 정보 (이메일·전화번호만 수정 가능)' }),
        email, phone,
        h('button', { class: 'btn btn-glass', type: 'button', onclick: async function () {
          try { await IAS.api.updateProfile({ email: email.value, phone: phone.value }); IAS.toast('저장했습니다.'); }
          catch (e) { IAS.toast(e.message); }
        } }, '저장'),
        h('a', { class: 'btn btn-glass', href: 'change-password.html', text: '비밀번호 변경' }),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: IAS.auth.logout }, '로그아웃'));
      avatar.addEventListener('click', function (e) { e.stopPropagation(); var open = profPanel.classList.contains('open'); closePanels(); if (!open) profPanel.classList.add('open'); });

      document.addEventListener('click', function (e) { if (!e.target.closest('.panel')) closePanels(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanels(); });
    }
  };
})();
