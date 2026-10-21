# IAS 그룹웨어 (정적 체험 데모)

서버 없이 브라우저만으로 동작합니다. 데이터는 방문자 브라우저의 `localStorage`에만 저장되며,
인증·권한이 브라우저 안에서 돌기 때문에 **체험용이고 실제 보안이 아닙니다.**

- 데모 계정: 회사 `acme` / 아이디 `admin`, `kim`, `newbie` / 비밀번호 `Demo1234!`
  (`newbie`는 첫 로그인 때 비밀번호 변경). 로그인 화면의 "데모 데이터 초기화"로 처음 상태로 되돌립니다.
- 화면: 로그인, 홈(위젯·앱), 게시판(목록·글쓰기·댓글), 알림, 프로필·테마, 비밀번호 변경, 변경·보안 기록(관리자).

## 나중에 서버를 붙이려면
화면은 데이터를 반드시 `IAS.api`로만 다룹니다(`js/core.js`).

1. `js/core.js`의 `IAS.config.backend`를 `'http'`로 바꿉니다.
2. 서버는 `js/backend-http.js`에 적힌 경로를 구현합니다(반환 형태는 `js/backend-local.js`와 동일).
3. 쿠키 세션(HttpOnly), 비밀번호 해시, 로그인 실패 잠금, **모든 API에서 권한 재확인**은 서버가 맡습니다.
4. 같은 출처가 아니면 `apiBase`와 CORS를 맞춥니다.

| 메서드 | 서버 경로 |
|---|---|
| tenants / login / logout / me | `GET /tenants`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| changePassword / updateProfile | `POST /auth/change-password`, `POST /me/profile` |
| apps / boards | `GET /me/apps`, `GET /board/boards` |
| listPosts / getPost / createPost / addComment | `GET·POST /board/posts`, `GET /board/posts/:id`, `POST /board/posts/:id/comments` |
| listNotifications / markRead | `GET /notifications`, `POST /notifications/read` |
| listAudit | `GET /admin/audit` |
