const express = require('express');
const router = express.Router();
const db = require('../db');

// 📌 댓글 작성
router.post('/addComment', (req, res) => {
  if (!req.session.userInfo) {
    return res.status(403).json({ success: false, message: "로그인이 필요합니다." });
  }

  const { comment, postId } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  if (!comment || !postId) {
    return res.status(400).json({ success: false, message: "댓글 내용이 없습니다." });
  }

  // 1. 게시글 작성자 조회
  const getAuthorQuery = `SELECT brewers_id FROM brewers_posts WHERE id = ?`;
  db.query(getAuthorQuery, [postId], (err, result) => {
    if (err || result.length === 0) {
      console.error("작성자 조회 오류:", err);
      return res.status(500).json({ success: false, message: "게시글 정보 오류" });
    }

    const postAuthorId = result[0].brewers_id;
    const isChecked = (postAuthorId === brewers_id) ? 1 : 0;

    // 2. 댓글 삽입
    const addCommentQuery = `
      INSERT INTO brewers_comments (post_id, brewers_id, content, is_checked)
      VALUES (?, ?, ?, ?)
    `;
    db.query(addCommentQuery, [postId, brewers_id, comment, isChecked], (err) => {
      if (err) {
        console.error("댓글 추가 오류:", err);
        return res.status(500).json({ success: false, message: "댓글 추가 실패" });
      }

      res.json({ success: true, message: "댓글이 등록되었습니다." });
    });
  });
});

// 📌 댓글 리스트 조회 (페이지네이션)
router.get('/getComments', (req, res) => {
  const postId = req.query.postId;
  const page = parseInt(req.query.page) || 1;
  const commentsPerPage = 20;
  const offset = (page - 1) * commentsPerPage;

  if (!postId) {
    return res.status(400).json({ success: false, message: "게시글 ID가 없습니다." });
  }

  const getCommentsQuery = `
    SELECT c.*, r.brewers_nickname, r.brewers_profile_pic
    FROM brewers_comments c
    LEFT JOIN brewers_register r ON c.brewers_id = r.brewers_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM brewers_comments WHERE post_id = ?`;

  db.query(getCommentsQuery, [postId, commentsPerPage, offset], (err, comments) => {
    if (err) {
      console.error("댓글 조회 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 조회 실패" });
    }

    db.query(countQuery, [postId], (err, countResult) => {
      if (err) {
        console.error("댓글 개수 조회 오류:", err);
        return res.status(500).json({ success: false, message: "댓글 수 조회 실패" });
      }

      const totalComments = countResult[0].total;
      const totalPages = Math.ceil(totalComments / commentsPerPage);

      res.json({ success: true, comments, totalComments, totalPages });
    });
  });
});

// 📌 댓글 추천 (좋아요)
router.post('/likeComment', (req, res) => {
  if (!req.session.userInfo) {
    return res.status(403).json({ success: false, message: "로그인이 필요합니다." });
  }

  const { commentId } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  if (!commentId) {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  const checkLikeQuery = `SELECT * FROM brewers_likes WHERE brewers_id = ? AND comment_id = ?`;

  db.query(checkLikeQuery, [brewers_id, commentId], (err, results) => {
    if (err) {
      console.error("좋아요 확인 오류:", err);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: "이미 추천한 댓글입니다." });
    }

    const insertLikeQuery = `INSERT INTO brewers_likes (brewers_id, comment_id) VALUES (?, ?)`;

    db.query(insertLikeQuery, [brewers_id, commentId], (err) => {
      if (err) {
        console.error("좋아요 저장 오류:", err);
        return res.status(500).json({ success: false, message: "좋아요 실패" });
      }

      res.json({ success: true, message: "댓글을 추천했습니다." });
    });
  });
});

// 📌 댓글 추천 취소
router.post('/unlikeComment', (req, res) => {
  const { commentId } = req.body;

  if (!commentId) {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  db.query('DELETE FROM brewers_likes WHERE comment_id = ?', [commentId], (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "추천 취소 실패" });
    }

    res.json({ success: true, message: "추천 취소 완료" });
  });
});

// 📌 댓글 수정
router.post('/editComment', (req, res) => {
  const { commentId, newContent } = req.body;

  if (!commentId || !newContent) {
      return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  const updateCommentQuery = `UPDATE brewers_comments SET content = ? WHERE id = ?`;

  db.query(updateCommentQuery, [newContent, commentId], (err, result) => {
      if (err) {
          console.error("댓글 수정 오류:", err);
          return res.status(500).json({ success: false, message: "댓글 수정 실패" });
      }

      if (result.affectedRows > 0) {
          res.json({ success: true, message: "댓글 수정 성공" });
      } else {
          res.json({ success: false, message: "수정할 댓글을 찾을 수 없습니다." });
      }
  });
});

// 📌 댓글 삭제
router.post('/deleteComment', (req, res) => {
  const { commentId } = req.body;

  const deleteQuery = `DELETE FROM brewers_comments WHERE id = ?`;

  db.query(deleteQuery, [commentId], (err) => {
    if (err) {
      console.error("댓글 삭제 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 삭제 실패" });
    }

    res.json({ success: true, message: "댓글이 삭제되었습니다." });
  });
});

module.exports = router;
