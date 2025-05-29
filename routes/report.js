const express = require('express');
const router = express.Router();
const db = require('../db');

// 게시글 신고
router.post('/report/post', (req, res) => {
  const { target_id, reason } = req.body;
  const reporter_id = req.session.userInfo?.brewers_id;

  if (!reporter_id) return res.status(401).send("로그인 필요");

  const sql = `
    INSERT INTO brewers_reports (target_type, target_id, reason, reporter_id)
    VALUES ('post', ?, ?, ?)`;

  db.query(sql, [target_id, reason, reporter_id], (err) => {
    if (err) return res.status(500).send("신고 실패");
    res.send("<script>alert('신고 접수되었습니다.'); history.back();</script>");
  });
});

module.exports = router;
