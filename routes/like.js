const express = require('express');
const router = express.Router();
const db = require('../db');

// 📌 게시글 추천
router.post('/likePost', (req, res) => {
  if (!req.session.userInfo) {
    return res.status(403).json({ success: false, message: "로그인이 필요합니다." });
  }

  const { postId } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  if (!postId) {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  // 본인 글 체크
  db.query("SELECT brewers_id FROM brewers_posts WHERE id = ?", [postId], (err, results) => {
    if (err || results.length === 0) {
      console.error("게시글 조회 오류:", err);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }

    if (results[0].brewers_id === brewers_id) {
      return res.status(403).json({ success: false, message: "본인 글은 추천할 수 없습니다." });
    }

    // 이미 추천했는지 확인
    db.query("SELECT * FROM brewers_likes WHERE brewers_id = ? AND post_id = ? AND is_like = 1", [brewers_id, postId], (err, likeResults) => {
      if (err) {
        console.error("추천 중복 확인 오류:", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
      }

      if (likeResults.length > 0) {
        return res.status(400).json({ success: false, message: "이미 추천한 게시글입니다." });
      }

      // 추천 저장
      db.query("INSERT INTO brewers_likes (brewers_id, post_id, is_like) VALUES (?, ?, 1)", [brewers_id, postId], (err) => {
        if (err) {
          console.error("추천 저장 오류:", err);
          return res.status(500).json({ success: false, message: "추천 실패" });
        }
        res.json({ success: true, message: "추천 완료" });
      });
    });
  });
});

// 📌 게시글 비추천
router.post('/unlikePost', (req, res) => {
  if (!req.session.userInfo) {
    return res.status(403).json({ success: false, message: "로그인이 필요합니다." });
  }

  const { postId } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  if (!postId) {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  db.query("SELECT brewers_id FROM brewers_posts WHERE id = ?", [postId], (err, results) => {
    if (err || results.length === 0) {
      console.error("게시글 조회 오류:", err);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }

    if (results[0].brewers_id === brewers_id) {
      return res.status(403).json({ success: false, message: "본인 글은 비추천할 수 없습니다." });
    }

    // 이미 비추천했는지 확인
    db.query("SELECT * FROM brewers_likes WHERE brewers_id = ? AND post_id = ? AND is_like = 0", [brewers_id, postId], (err, likeResults) => {
      if (err) {
        console.error("비추천 중복 확인 오류:", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
      }

      if (likeResults.length > 0) {
        return res.status(400).json({ success: false, message: "이미 비추천한 게시글입니다." });
      }

      // 비추천 저장
      db.query("INSERT INTO brewers_likes (brewers_id, post_id, is_like) VALUES (?, ?, 0)", [brewers_id, postId], (err) => {
        if (err) {
          console.error("비추천 저장 오류:", err);
          return res.status(500).json({ success: false, message: "비추천 실패" });
        }
        res.json({ success: true, message: "비추천 완료" });
      });
    });
  });
});

// 📌 게시글 추천/비추천 수 조회
router.get('/postLikes', (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  const countQuery = `
    SELECT 
      SUM(CASE WHEN is_like = 1 THEN 1 ELSE 0 END) AS likeCount,
      SUM(CASE WHEN is_like = 0 THEN 1 ELSE 0 END) AS dislikeCount
    FROM brewers_likes
    WHERE post_id = ?
  `;

  db.query(countQuery, [postId], (err, results) => {
    if (err) {
      console.error("추천 수 조회 오류:", err);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }

    res.json({ 
      success: true, 
      likeCount: results[0].likeCount || 0, 
      dislikeCount: results[0].dislikeCount || 0 
    });
  });
});

module.exports = router;
