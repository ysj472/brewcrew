const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db'); // ✅ DB 연결 파일
const upload = require('../middlewares/upload'); // ✅ multer upload 설정 가져온 경우
const saltRounds = 10; // ✅ 추가

// 로그인 페이지
router.get('/login', (req, res) => {
    res.render('login');
});

// 로그인 처리
router.post('/loginProc', (req, res) => {
  const { brewers_id, brewers_pw } = req.body;
  const sql = `SELECT * FROM brewers_register WHERE brewers_id = ? AND is_deleted = 0`;

  db.query(sql, [brewers_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("<script>alert('서버 오류 발생'); location.href='/login';</script>");
    }

    if (result.length === 0) {
      return res.send("<script>alert('존재하지 않는 아이디입니다.'); location.href='/login';</script>");
    }

    if (result[0].is_suspended) {
      return res.send("<script>alert('정지된 계정입니다. 관리자에게 문의하세요.'); location.href='/login';</script>");
    }

    const hashedPassword = result[0].brewers_pw;

    bcrypt.compare(brewers_pw, hashedPassword, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).send("<script>alert('서버 오류 발생'); location.href='/login';</script>");
      }

      if (!isMatch) {
        return res.send("<script>alert('비밀번호가 일치하지 않습니다.'); location.href='/login';</script>");
      }

      req.session.userInfo = result[0];
      res.send("<script>alert('로그인 되었습니다.'); location.href='/';</script>");
    });
  });
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.userInfo = null;
  res.send("<script>alert('로그아웃 되었습니다.'); location.href='/';</script>");
});

// 회원가입 페이지
router.get('/register', (req, res) => {
  res.render('register');
});

const getClientIp = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  return ip.replace('::ffff:', ''); // IPv4 호환
};

router.post('/registerProc', upload.single('profilePic'), async (req, res) => {
  const clientIp = getClientIp(req);
  const { brewers_id, brewers_nickname, brewers_pw } = req.body;
  const brewers_profile_pic = req.file ? `/img/${req.file.filename}` : null;
  const brewers_created_at = new Date();

  if (!brewers_id || !brewers_nickname || !brewers_pw) {
    return res.status(400).send("모든 필드를 입력해주세요.");
  }

  try {
    // 1. 해당 IP의 가입 횟수 확인
    const ipCheckQuery = `SELECT signup_count FROM brewers_ip_registers WHERE ip_address = ?`;
    db.query(ipCheckQuery, [clientIp], async (err, results) => {
      if (err) return res.status(500).send("DB 오류");

      const count = results.length > 0 ? results[0].signup_count : 0;
      if (count >= 1) {
        return res.send("<script>alert('해당 IP에서는 최대 1개의 계정만 생성할 수 있습니다.'); location.href='/register';</script>");
      }

      // 2. 아이디 중복 체크 (탈퇴회원 제외)
      const checkIdQuery = `SELECT * FROM brewers_register WHERE brewers_id = ?`;
      db.query(checkIdQuery, [brewers_id], async (err, idResults) => {
        if (err) return res.status(500).send("DB 오류");

        if (idResults.length > 0) {
          // 2-1. 탈퇴한 계정이라면 → 가입 차단
          if (idResults[0].is_deleted === 1) {
            return res.send("<script>alert('탈퇴한 계정입니다. 해당 아이디로는 가입할 수 없습니다.'); location.href='/register';</script>");
          }

          // 2-2. 일반 중복 아이디
          return res.send("<script>alert('이미 사용 중인 아이디입니다.'); location.href='/register';</script>");
          }

        // 3. 비밀번호 해시
        const hashedPassword = await bcrypt.hash(brewers_pw, saltRounds);

        // 4. 회원가입 처리
        const registerQuery = `
          INSERT INTO brewers_register (brewers_id, brewers_nickname, brewers_pw, brewers_profile_pic, brewers_created_at) 
          VALUES (?, ?, ?, ?, ?)`;

        db.query(registerQuery, [brewers_id, brewers_nickname, hashedPassword, brewers_profile_pic, brewers_created_at], (err) => {
          if (err) return res.status(500).send("회원가입 실패");

          // 5. IP 테이블 업데이트
          const upsertQuery = `
            INSERT INTO brewers_ip_registers (ip_address, signup_count) 
            VALUES (?, 1) 
            ON DUPLICATE KEY UPDATE signup_count = signup_count + 1, last_signup = CURRENT_TIMESTAMP
          `;

          db.query(upsertQuery, [clientIp], (err) => {
            if (err) console.error("IP 기록 실패:", err);
          });

          return res.send("<script>alert('회원가입이 완료되었습니다. 로그인해주세요.'); location.href='/login';</script>");
        });
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("서버 오류 발생");
  }
});

// 아이디 중복 체크
router.get('/check-id', (req, res) => {
  const { brewers_id } = req.query;

  if (!brewers_id) {
    return res.status(400).json({ success: false, message: "아이디를 입력해주세요." });
  }

  const checkID = `
    SELECT is_deleted 
    FROM brewers_register 
    WHERE brewers_id = ?
  `;

  db.query(checkID, [brewers_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "서버 오류 발생" });
    }

    if (results.length > 0) {
      if (results[0].is_deleted === 1) {
        return res.json({ success: false, message: "탈퇴한 계정입니다. 사용할 수 없습니다." });
      } else {
        return res.json({ success: false, message: "이미 사용 중인 아이디입니다." });
      }
    } else {
      return res.json({ success: true, message: "사용 가능한 아이디입니다." });
    }
  });
});

// 닉네임 중복 체크
router.get('/check-nickname', (req, res) => {
  const { brewers_nickname } = req.query;

  if (!brewers_nickname) {
    return res.status(400).json({ success: false, message: "닉네임을 입력해주세요." });
  }

  const checkNickname = "SELECT brewers_nickname FROM brewers_register WHERE brewers_nickname = ?";

  db.query(checkNickname, [brewers_nickname], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "서버 오류 발생" });
    }

    if (results.length > 0) {
      return res.json({ success: false, message: "이미 사용 중인 닉네임입니다." });
    } else {
      return res.json({ success: true, message: "사용 가능한 닉네임입니다." });
    }
  });
});

// 로그인 상태 체크
router.get('/checkLogin', (req, res) => {
  if (!req.session.userInfo) {
    return res.json({ success: false, message: "로그인이 필요합니다." });
  }
  res.json({ success: true, message: "로그인 상태입니다." });
});

router.post('/deleteAccount', (req, res) => {
  const { brewers_id } = req.body;

  if (!brewers_id) {
    return res.json({ success: false, message: 'ID 누락' });
  }

  // 1. is_deleted 업데이트
  const updateQuery = `
    UPDATE brewers_register 
    SET is_deleted = 1, deleted_at = NOW() 
    WHERE brewers_id = ?
  `;

  db.query(updateQuery, [brewers_id], (err, result) => {
    if (err) {
      console.error('탈퇴 오류:', err);
      return res.json({ success: false, message: 'DB 오류' });
    }

    // 2. 세션 종료
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

module.exports = router;
