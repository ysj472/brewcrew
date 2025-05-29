const express = require('express');
const router = express.Router();
const db = require('../db');

// HTML에서 <img src="..."> 추출
function extractThumbnail(content) {
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : null;
}

function stripHtmlAndShorten(text, length = 300) {
  return text.replace(/<[^>]*>?/gm, '').slice(0, length);
}

router.get(['/', '/main'], async (req, res) => {
  try {
    // 최신 게시글 6개
    const [latestPostsRaw] = await db.promise().query(`
      SELECT id, title, board, content, created_at
      FROM brewers_posts
      ORDER BY created_at DESC
      LIMIT 6
    `);

    // 추천수 많은 게시글 6개
    const [popularPostsRaw] = await db.promise().query(`
      SELECT p.id, p.title, p.board, p.content, p.created_at, COUNT(l.id) AS likeCount
      FROM brewers_posts p
      LEFT JOIN brewers_likes l ON p.id = l.post_id AND l.is_like = 1
      GROUP BY p.id
      ORDER BY likeCount DESC, p.created_at DESC
      LIMIT 6
    `);

    // 조회수 많은 게시글 6개
    const [mostViewedPostsRaw] = await db.promise().query(`
      SELECT id, title, board, content, views, created_at
      FROM brewers_posts
      ORDER BY views DESC, created_at DESC
      LIMIT 6
    `);

    // ✨ 각 리스트에 썸네일, 요약 내용 추가
    const enhancePosts = (posts) =>
      posts.map((post) => ({
        ...post,
        thumbnail: extractThumbnail(post.content),
        summary: stripHtmlAndShorten(post.content),
      }));

    const latestPosts = enhancePosts(latestPostsRaw);
    const popularPosts = enhancePosts(popularPostsRaw);
    const mostViewedPosts = enhancePosts(mostViewedPostsRaw);

    res.render('main', {
      latestPosts,
      popularPosts,
      mostViewedPosts
    });
  } catch (error) {
    console.error('메인페이지 데이터 조회 오류:', error);
    res.status(500).send('서버 오류');
  }
});

module.exports = router;
