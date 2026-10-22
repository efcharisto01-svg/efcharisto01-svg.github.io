// 임시 하드코딩 계정 (추후 서버 인증으로 교체 예정)
const VALID_ID = 'adm';
const VALID_PW = '1234';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('user-id').value.trim();
  const pw = document.getElementById('user-pw').value;

  if (id === VALID_ID && pw === VALID_PW) {
    errorEl.textContent = '';
    sessionStorage.setItem('loggedIn', 'true');
    alert('로그인 성공!');
    // TODO: 로그인 후 이동할 페이지 연결
  } else {
    errorEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
  }
});
