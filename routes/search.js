const express = require('express');
const router = express.Router();
const db = require('../db');

// 📌 게시글 검색
router.get('/search', (req, res) => {
  const keyword = req.query.keyword;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!keyword) {
    return res.send("<script>alert('검색어를 입력해주세요.'); history.back();</script>");
  }

  const searchTerm = `%${keyword}%`;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM brewers_posts
    WHERE title LIKE ? OR content LIKE ? OR category LIKE ?
  `;

  const searchQuery = `
    SELECT p.*, r.brewers_nickname, r.brewers_profile_pic,
      (SELECT COUNT(*) FROM brewers_comments c WHERE c.post_id = p.id) AS comment_count
    FROM brewers_posts p
    LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
    WHERE p.title LIKE ? OR p.content LIKE ? OR p.category LIKE ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countQuery, [searchTerm, searchTerm, searchTerm], (err, countResult) => {
    if (err) {
      console.error("🔍 총 개수 조회 오류:", err);
      return res.status(500).send("<script>alert('검색 실패'); history.back();</script>");
    }

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    db.query(searchQuery, [searchTerm, searchTerm, searchTerm, limit, offset], (err, results) => {
      if (err) {
        console.error("🔍 검색 오류:", err);
        return res.status(500).send("<script>alert('검색 중 오류가 발생했습니다.'); history.back();</script>");
      }

      res.render("searchList", {
        posts: results,
        keyword,
        type: 'title_content',
        page,
        totalPages,
        total
      });
    });
  });
});


router.get('/boardSearch', (req, res) => {
  const { type, keyword } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!keyword || !type) {
    return res.send("<script>alert('검색 조건이 누락되었습니다.'); history.back();</script>");
  }

  // 검색 조건 매핑
  const searchMap = {
    title_content: 'p.title LIKE ? OR p.content LIKE ?',
    title: 'p.title LIKE ?',
    writer_id: 'p.brewers_id LIKE ?',
    nickname: 'u.brewers_nickname LIKE ?',
    category: 'p.category LIKE ?',
  };

  const condition = searchMap[type];
  const likeKeyword = `%${keyword}%`;

  if (!condition) {
    return res.send("<script>alert('잘못된 검색 유형입니다.'); history.back();</script>");
  }

  // 파라미터 구성
  const baseParams = condition.includes('OR') ? [likeKeyword, likeKeyword] : [likeKeyword];
  const countParams = [...baseParams];
  const dataParams = [...baseParams, limit, offset];

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM brewers_posts p
    JOIN brewers_register u ON p.brewers_id = u.brewers_id
    WHERE ${condition}
  `;

  const dataQuery = `
    SELECT p.*, u.brewers_nickname, u.brewers_profile_pic,
      (SELECT COUNT(*) FROM brewers_comments c WHERE c.post_id = p.id) AS comment_count
    FROM brewers_posts p
    JOIN brewers_register u ON p.brewers_id = u.brewers_id
    WHERE ${condition}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  // 총 개수 조회
  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error("🔍 총 개수 조회 오류:", err);
      return res.status(500).send("<script>alert('검색 실패 (총 개수)'); history.back();</script>");
    }

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // 데이터 조회
    db.query(dataQuery, dataParams, (err, results) => {
      if (err) {
        console.error("🔍 검색 결과 조회 오류:", err);
        return res.status(500).send("<script>alert('검색 실패 (데이터 조회)'); history.back();</script>");
      }

      res.render('searchList', {
        posts: results,
        keyword,
        type,
        page,
        totalPages,
        total
      });
    });
  });
});

module.exports = router;
