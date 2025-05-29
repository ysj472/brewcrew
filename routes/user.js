const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middlewares/upload');
const bcrypt = require('bcrypt');

// 📌 시간 포맷 함수
const formatDate = (date) => {
  return new Date(date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
};

// 📌 마이페이지 화면
router.get('/myPage', (req, res) => {
  if (!req.session.userInfo) {
    return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  res.render('myPage', {
    brewers_id: req.session.userInfo.brewers_id,
    brewers_nickname: req.session.userInfo.brewers_nickname,
    brewers_profile_pic: req.session.userInfo.brewers_profile_pic,
    brewers_created_at: formatDate(req.session.userInfo.brewers_created_at)
  });
});

// 📌 마이페이지 수정 처리 (닉네임, 비밀번호, 프로필사진)
router.post('/updateProfile', upload.single('editProfilePic'), async (req, res) => {
  if (!req.session.userInfo) {
    return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  const { editNickname, currentPassword, newPassword, confirmPassword } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;
  let brewers_profile_pic = req.session.userInfo.brewers_profile_pic;

  if (req.file) {
    brewers_profile_pic = `/img/${req.file.filename}`;
  }

  try {
    // ✅ 닉네임 변경
    if (editNickname) {
      await new Promise((resolve, reject) => {
        db.query("UPDATE brewers_register SET brewers_nickname = ? WHERE brewers_id = ?", 
        [editNickname, brewers_id], (err) => {
          if (err) reject(err);
          req.session.userInfo.brewers_nickname = editNickname;
          resolve();
        });
      });
    }

    // ✅ 비밀번호 변경
    if (currentPassword && newPassword && confirmPassword) {
      const result = await new Promise((resolve, reject) => {
        db.query("SELECT brewers_pw FROM brewers_register WHERE brewers_id = ?", [brewers_id], (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });

      if (result.length === 0) {
        return res.send("<script>alert('사용자 정보를 찾을 수 없습니다.'); history.back();</script>");
      }

      const isMatch = await bcrypt.compare(currentPassword, result[0].brewers_pw);
      if (!isMatch) {
        return res.send("<script>alert('현재 비밀번호가 일치하지 않습니다.'); history.back();</script>");
      }

      if (newPassword !== confirmPassword) {
        return res.send("<script>alert('새 비밀번호가 일치하지 않습니다.'); history.back();</script>");
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await new Promise((resolve, reject) => {
        db.query("UPDATE brewers_register SET brewers_pw = ? WHERE brewers_id = ?", [hashedNewPassword, brewers_id], (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }

    // ✅ 프로필 사진 업데이트
    await new Promise((resolve, reject) => {
      db.query("UPDATE brewers_register SET brewers_profile_pic = ? WHERE brewers_id = ?", 
      [brewers_profile_pic, brewers_id], (err) => {
        if (err) reject(err);
        req.session.userInfo.brewers_profile_pic = brewers_profile_pic;
        resolve();
      });
    });

    res.send("<script>alert('프로필이 변경되었습니다.'); location.href='/myPage';</script>");

  } catch (error) {
    console.error("❌ 프로필 수정 실패:", error);
    res.send("<script>alert('변경 실패. 다시 시도해주세요.'); history.back();</script>");
  }
});

// 📌 특정 유저가 작성한 글 리스트 (userList)
router.get('/userList', (req, res) => {
  const brewers_id = req.query.id;
  const page = parseInt(req.query.page) || 1;
  const postsPerPage = 20;
  const offset = (page - 1) * postsPerPage;

  const countQuery = `SELECT COUNT(*) AS total FROM brewers_posts WHERE brewers_id = ?`;

  db.query(countQuery, [brewers_id], (err, countResult) => {
    if (err) {
      console.error("게시글 개수 조회 오류:", err);
      return res.status(500).send("<script>alert('게시글 개수를 불러올 수 없습니다.'); history.back();</script>");
    }

    const totalPosts = countResult[0].total;
    const totalPages = Math.ceil(totalPosts / postsPerPage);

    const getUserPostsQuery = `
      SELECT p.*, r.brewers_nickname, r.brewers_profile_pic,
        (SELECT COUNT(*) FROM brewers_comments c WHERE c.post_id = p.id) AS comment_count
      FROM brewers_posts p
      LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
      WHERE p.brewers_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.query(getUserPostsQuery, [brewers_id, postsPerPage, offset], (err, results) => {
      if (err) {
        console.error("유저 게시글 조회 오류:", err);
        return res.status(500).send("<script>alert('게시글을 불러올 수 없습니다.'); history.back();</script>");
      }

      if (results.length === 0) {
        return res.send("<script>alert('해당 사용자의 게시글이 없습니다.'); history.back();</script>");
      }

      const user = {
        brewers_nickname: results[0].brewers_nickname,
        brewers_profile_pic: results[0].brewers_profile_pic,
        brewers_id: brewers_id
      };

      res.render('userList', {
        posts: results,
        user,
        currentPage: page,
        totalPages,
        totalPosts,
        postsPerPage
      });
    });
  });
});

module.exports = router;
