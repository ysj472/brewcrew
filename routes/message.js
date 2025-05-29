const express = require('express');
const router = express.Router();
const db = require('../db');

// 📌 쪽지함 리스트 (받은 쪽지)
router.get('/message', (req, res) => {
  if (!req.session.userInfo) {
    return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  const myId = req.session.userInfo.brewers_id;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) AS total FROM brewers_messages WHERE receiver_id = ?`;
  const listQuery = `
    SELECT m.id, m.title, m.message, m.created_at, r.brewers_nickname AS sender_nickname
    FROM brewers_messages m
    JOIN brewers_register r ON m.sender_id = r.brewers_id
    WHERE m.receiver_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countQuery, [myId], (err, countResult) => {
    if (err) {
      console.error("쪽지 개수 조회 오류:", err);
      return res.status(500).send("서버 오류");
    }

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    db.query(listQuery, [myId, limit, offset], (err, messages) => {
      if (err) {
        console.error("쪽지 목록 조회 오류:", err);
        return res.status(500).send("서버 오류");
      }

      res.render('message', {
        messages,
        page,
        totalPages
      });
    });
  });
});

// 📌 쪽지 상세 조회
router.get('/messageDetail', (req, res) => {
  if (!req.session.userInfo) {
    return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  const messageId = req.query.id;
  const myId = req.session.userInfo.brewers_id;

  if (!messageId) {
    return res.send("<script>alert('잘못된 접근입니다.'); history.back();</script>");
  }

  const getMessageDetailQuery = `
    SELECT m.*, s.brewers_nickname AS sender_nickname
    FROM brewers_messages m
    JOIN brewers_register s ON m.sender_id = s.brewers_id
    WHERE m.id = ? AND m.receiver_id = ?
  `;

  db.query(getMessageDetailQuery, [messageId, myId], (err, result) => {
    if (err || result.length === 0) {
      console.error("쪽지 상세 조회 오류:", err);
      return res.status(500).send("<script>alert('쪽지를 불러올 수 없습니다.'); history.back();</script>");
    }

    // ✅ 읽음 처리
    const updateReadStatus = `UPDATE brewers_messages SET is_read = 1 WHERE id = ?`;
    db.query(updateReadStatus, [messageId]);

    res.render('messageDetail', { message: result[0] });
  });
});

// 📌 쪽지 보내기
router.post('/sendMessage', (req, res) => {
  if (!req.session.userInfo) {
    return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  const senderId = req.session.userInfo.brewers_id;
  const { receiver_id, title, message } = req.body;

  if (!receiver_id || !title || !message) {
    return res.send("<script>alert('모든 입력란을 채워주세요.'); history.back();</script>");
  }

  if (senderId === receiver_id) {
    return res.send("<script>alert('본인에게는 쪽지를 보낼 수 없습니다.'); history.back();</script>");
  }

  const sendMessageQuery = `
    INSERT INTO brewers_messages (sender_id, receiver_id, title, message)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sendMessageQuery, [senderId, receiver_id, title, message], (err) => {
    if (err) {
      console.error("쪽지 전송 오류:", err);
      return res.status(500).send("<script>alert('쪽지 전송에 실패했습니다.'); history.back();</script>");
    }

    const returnTo = req.get('referer') || '/';
    res.send(`<script>alert('쪽지가 성공적으로 전송되었습니다.'); location.href='${returnTo}';</script>`);
  });
});

// 📌 쪽지 삭제
router.post('/deleteMessage', (req, res) => {
  if (!req.session.userInfo) {
    return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  const { messageId } = req.body;
  const userId = req.session.userInfo.brewers_id;

  if (!messageId) {
    return res.send("<script>alert('잘못된 요청입니다.'); history.back();</script>");
  }

  const deleteQuery = `
    DELETE FROM brewers_messages
    WHERE id = ? AND receiver_id = ?
  `;

  db.query(deleteQuery, [messageId, userId], (err, result) => {
    if (err) {
      console.error("쪽지 삭제 오류:", err);
      return res.status(500).send("<script>alert('쪽지 삭제에 실패했습니다.'); history.back();</script>");
    }

    if (result.affectedRows === 0) {
      return res.send("<script>alert('삭제 권한이 없거나 이미 삭제된 쪽지입니다.'); history.back();</script>");
    }

    return res.send("<script>alert('쪽지가 삭제되었습니다.'); location.href='/message';</script>");
  });
});

module.exports = router;
