// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const isAdminOrManager = require('../middlewares/isAdminOrManager');

// 관리자 메인 페이지
router.get('/admin', isAdminOrManager, (req, res) => {
  res.render('admin/admin', { admin: req.session.userInfo });
});

// 회원 목록
// 회원 목록 (페이지네이션 적용)
router.get('/admin/users', isAdminOrManager, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) AS count FROM brewers_register`;
  const listSql = `
    SELECT brewers_id, brewers_nickname, brewers_role, is_suspended
    FROM brewers_register
    ORDER BY brewers_id ASC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, (err, countResult) => {
    if (err) return res.status(500).send('DB 오류');

    const totalCount = countResult[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    db.query(listSql, [limit, offset], (err, result) => {
      if (err) return res.status(500).send('DB 오류');
      res.render('admin/users', {
        users: result,
        page,
        totalPages,
      });
    });
  });
});

// 회원 권한 변경
router.post('/admin/promote', isAdminOrManager, (req, res) => {
  const { brewers_id, role } = req.body;

  const sql = `UPDATE brewers_register SET brewers_role = ? WHERE brewers_id = ?`;
  db.query(sql, [role, brewers_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('권한 변경 실패');
    }
    res.redirect('/admin/users');
  });
});

// 게시글 목록 조회
// 게시글 목록 조회 (페이지네이션 적용)
router.get('/admin/posts', isAdminOrManager, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) AS count FROM brewers_posts`;
  const listSql = `
    SELECT p.id, p.title, p.board, p.category, p.created_at, r.brewers_nickname
    FROM brewers_posts p
    JOIN brewers_register r ON p.brewers_id = r.brewers_id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, (err, countResult) => {
    if (err) return res.status(500).send('게시글 카운트 실패');

    const totalCount = countResult[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    db.query(listSql, [limit, offset], (err, posts) => {
      if (err) return res.status(500).send('게시글 조회 실패');
      res.render('admin/posts', {
        posts,
        page,
        totalPages,
      });
    });
  });
});

// 게시글 삭제 처리
// 게시글 삭제 처리
router.post('/admin/posts/delete', isAdminOrManager, (req, res) => {
  const { id } = req.body;
  const currentUser = req.session.userInfo;

  // 1. 게시글 작성자 brewers_id, role 확인
  const checkSql = `
    SELECT p.id, r.brewers_role
    FROM brewers_posts p
    JOIN brewers_register r ON p.brewers_id = r.brewers_id
    WHERE p.id = ?
  `;

  db.query(checkSql, [id], (err, results) => {
    if (err || results.length === 0) return res.status(500).send('삭제 대상 확인 실패');

    const authorRole = results[0].brewers_role;

    // 2. 매니저가 관리자의 글 삭제 시도 시 차단
    if (currentUser.brewers_role === 'manager' && authorRole === 'admin') {
      return res.status(403).send('<script>alert("관리자의 글은 삭제할 수 없습니다."); history.back();</script>');
    }

    // 3. 삭제 실행
    const deleteSql = `DELETE FROM brewers_posts WHERE id = ?`;
    db.query(deleteSql, [id], (err) => {
      if (err) return res.status(500).send('삭제 실패');
      res.redirect('/admin/posts');
    });
  });
});

// 공지 작성 페이지
router.get('/admin/notices', isAdminOrManager, (req, res) => {
  res.render('admin/notices');
});

// 공지 작성 처리
router.post('/admin/notices', isAdminOrManager, (req, res) => {
  const { title, content } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  if (!title || !content) {
    return res.status(400).send('<script>alert("제목과 내용을 입력하세요."); history.back();</script>');
  }

  const sql = `
    INSERT INTO brewers_posts (board, category, title, content, brewers_id)
    VALUES ('공지', '공지', ?, ?, ?)
  `;

  db.query(sql, [title, content, brewers_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('<script>alert("공지 작성 실패"); history.back();</script>');
    }
    res.send('<script>alert("공지 작성 완료"); location.href="/admin/posts";</script>');
  });
});

// 회원 정지/해제 처리
router.post('/admin/users/suspend', isAdminOrManager, (req, res) => {
  const { brewers_id, action } = req.body;

  let newStatus;
  if (action === 'suspend') newStatus = 1;
  else if (action === 'unsuspend') newStatus = 0;
  else return res.status(400).send('유효하지 않은 요청입니다.');

  const sql = `UPDATE brewers_register SET is_suspended = ? WHERE brewers_id = ?`;
  db.query(sql, [newStatus, brewers_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('상태 변경 실패');
    }
    res.redirect('/admin/users');
  });
});

// 신고 목록
router.get('/admin/reports', isAdminOrManager, (req, res) => {
  const sql = `
    SELECT r.*, u.brewers_nickname AS reporter_name
    FROM brewers_reports r
    JOIN brewers_register u ON r.reporter_id = u.brewers_id
    ORDER BY r.created_at DESC
  `;
  db.query(sql, (err, reports) => {
    if (err) return res.status(500).send('신고 목록 로드 실패');
    res.render('admin/reports', { reports });
  });
});

// 신고된 대상 삭제
router.post('/admin/reports/delete', isAdminOrManager, (req, res) => {
  const { target_type, target_id, report_id } = req.body;

  const deleteTargetSql = target_type === 'post'
    ? 'DELETE FROM brewers_posts WHERE id = ?'
    : 'DELETE FROM brewers_comments WHERE id = ?';

  db.query(deleteTargetSql, [target_id], (err) => {
    if (err) return res.status(500).send('삭제 실패');

    // 신고 정보도 삭제
    db.query('DELETE FROM brewers_reports WHERE id = ?', [report_id], () => {
      res.redirect('/admin/reports');
    });
  });
});

// 신고 무시 (신고 정보만 삭제)
router.post('/admin/reports/ignore', isAdminOrManager, (req, res) => {
  const { report_id } = req.body;
  db.query('DELETE FROM brewers_reports WHERE id = ?', [report_id], () => {
    res.redirect('/admin/reports');
  });
});

module.exports = router;
