const express = require('express');
const router = express.Router();
const db = require('../db');

// 📌 특정 유저 프로필 조회
router.get('/getUserProfile', (req, res) => {
  const brewers_id = req.query.username;

  if (!brewers_id) {
    return res.status(400).json({ success: false, message: "아이디가 제공되지 않았습니다." });
  }

  const sql = `
    SELECT brewers_nickname, brewers_profile_pic, brewers_created_at
    FROM brewers_register
    WHERE brewers_id = ?
  `;

  db.query(sql, [brewers_id], (err, result) => {
    if (err) {
      console.error("📛 DB 오류:", err);
      return res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
    }

    const user = result[0];
    res.json({
      success: true,
      nickname: user.brewers_nickname,
      profile_pic: user.brewers_profile_pic || '/img/default-profile.png',
      join_date: new Date(user.brewers_created_at).toLocaleDateString('ko-KR')
    });
  });
});

module.exports = router;
