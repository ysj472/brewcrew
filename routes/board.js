const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middlewares/upload'); // 파일 업로드 미들웨어
const path = require('path');

// 📌 게시글 작성 화면
router.get('/board', (req, res) => {
  res.render('board');
});

// 📌 게시글 작성 처리
router.post('/boardProc', upload.array('files', 10), (req, res) => {
  const { board, category, title, content } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  console.log("✅ 선택된 게시판:", board); // 🔍 게시판 값 확인

  // 🚨 게시판 값 검증 (올바른 게시판인지 확인)
  const validBoards = ["밀워키게시판", "타팀게시판", "자유게시판"];
  if (!validBoards.includes(board)) {
      return res.send("<script>alert('올바른 게시판을 선택해주세요.'); history.back();</script>");
  }

  // ✅ 게시글 저장
  const postBoard = `INSERT INTO brewers_posts (board, category, title, content, brewers_id) VALUES (?, ?, ?, ?, ?)`;
  db.query(postBoard, [board, category, title, content, brewers_id], (err, result) => {
      if (err) {
          console.error("게시글 저장 오류", err);
          return res.status(500).send("<script>alert('게시글 저장 실패.'); history.back();</script>");
      }

      console.log("✅ 저장된 게시판:", board); // 🔍 저장된 게시판 값 확인

      const postId = result.insertId;

      // ✅ 파일 업로드 처리
      if (req.files.length > 0) {
          const fileQuery = `INSERT INTO brewers_files (post_id, file_path, file_type) VALUES ?`;
          const fileData = req.files.map(file => [
              postId,
              `/img/${file.filename}`,
              file.mimetype.startsWith('image') ? 'image' : 'video'
          ]);

          db.query(fileQuery, [fileData], (err) => {
              if (err) console.error("파일 저장 오류:", err);
          });
      }

      // ✅ 선택된 게시판으로 리디렉트
      let redirectUrl = "/brewers"; // 기본: 밀워키게시판
      if (board === "타팀게시판") redirectUrl = "/mlb";
      if (board === "자유게시판") redirectUrl = "/free";

      console.log("✅ 리디렉트 URL:", redirectUrl); // 🔍 리디렉트 URL 확인

      res.send(`<script>alert('게시글이 등록되었습니다.'); location.href='/boardDetail?id=${postId}';</script>`);
  });
});

// 게시글 상세 조회 라우트
router.get('/boardDetail', (req, res) => {
    const postId = req.query.id;

    if (!postId) {
        return res.send("<script>alert('잘못된 접근입니다.'); history.back();</script>");
    }

    const updateViewsQuery = `UPDATE brewers_posts SET views = views + 1 WHERE id = ?`;

    db.query(updateViewsQuery, [postId], (err) => {
        if (err) {
            console.error("조회수 업데이트 오류:", err);
            return res.status(500).send("<script>alert('서버 오류로 조회수 증가에 실패했습니다.'); history.back();</script>");
        }

        // 게시글 조회
        const getPostQuery = `
            SELECT p.*, r.brewers_nickname, r.brewers_profile_pic
            FROM brewers_posts p
            LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
            WHERE p.id = ?
        `;

        db.query(getPostQuery, [postId], (err, postResults) => {
            if (err || postResults.length === 0) {
                console.error("게시글 조회 오류:", err);
                return res.status(500).send("<script>alert('게시글을 불러올 수 없습니다.'); history.back();</script>");
            }

            const post = postResults[0];
            const viewerId = req.session.userInfo?.brewers_id;

            const getPrevPostQuery = `
                SELECT id, title FROM brewers_posts WHERE id < ? ORDER BY id DESC LIMIT 1
            `;
            const getNextPostQuery = `
                SELECT id, title FROM brewers_posts WHERE id > ? ORDER BY id ASC LIMIT 1
            `;
            const getCommentsQuery = `
                SELECT c.*, r.brewers_nickname, r.brewers_profile_pic
                FROM brewers_comments c
                LEFT JOIN brewers_register r ON c.brewers_id = r.brewers_id
                WHERE c.post_id = ?
                ORDER BY c.created_at ASC
            `;

            const loadAndRender = () => {
                db.query(getPrevPostQuery, [postId], (err, prevResults) => {
                    if (err) {
                        console.error("이전 글 조회 오류:", err);
                        return res.status(500).send("<script>alert('이전 글 조회 중 오류 발생'); history.back();</script>");
                    }

                    const prevPost = prevResults.length > 0 ? prevResults[0] : null;

                    db.query(getNextPostQuery, [postId], (err, nextResults) => {
                        if (err) {
                            console.error("다음 글 조회 오류:", err);
                            return res.status(500).send("<script>alert('다음 글 조회 중 오류 발생'); history.back();</script>");
                        }

                        const nextPost = nextResults.length > 0 ? nextResults[0] : null;

                        db.query(getCommentsQuery, [postId], (err, comments) => {
                            if (err) {
                                console.error("댓글 조회 오류:", err);
                                return res.status(500).send("<script>alert('댓글을 불러올 수 없습니다.'); history.back();</script>");
                            }

                            const commentCount = comments.length;

                            res.render('boardDetail', {
                                post: post,
                                comments: comments,
                                commentCount: commentCount,
                                prevPost: prevPost,
                                nextPost: nextPost,
                                brewers_id: viewerId
                            });
                        });
                    });
                });
            };

            // 댓글 상태 업데이트 후 렌더링
            if (viewerId && viewerId === post.brewers_id) {
                const updateCommentCheckQuery = `
                            UPDATE brewers_comments 
                            SET is_checked = 1 
                            WHERE post_id = ? 
                            AND is_checked = 0 
                            AND brewers_id != ?
                `;
                db.query(updateCommentCheckQuery, [postId, viewerId], (err) => {
                    if (err) {
                        console.error("댓글 확인 상태 업데이트 오류:", err);
                    }
                    loadAndRender();
                });
            } else {
                loadAndRender();
            }
        });
    });
});

// 📌 게시글 수정 화면
router.get('/boardEdit', (req, res) => {
    const postId = req.query.id;  // 게시글 ID 가져오기

    if (!postId) {
        return res.send("<script>alert('잘못된 접근입니다.'); history.back();</script>");
    }
  
    // 📌 게시글 데이터 가져오기
    const getPostQuery = `
        SELECT p.*, r.brewers_nickname, r.brewers_profile_pic
        FROM brewers_posts p
        LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
        WHERE p.id = ?
    `;
  
    db.query(getPostQuery, [postId], (err, results) => {
        if (err || results.length === 0) {
            console.error("게시글 조회 오류:", err);
            return res.status(500).send("<script>alert('게시글을 불러올 수 없습니다.'); history.back();</script>");
        }
  
        res.render('boardEdit', { post: results[0] }); // ✅ post 데이터 전달
    });
});

// 📌 게시글 수정 처리
router.post('/boardEditProc', upload.array('files', 10), (req, res) => {
  if (!req.session.userInfo) {
      return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
  }

  const { postId, board, category, title, content } = req.body;
  const brewers_id = req.session.userInfo.brewers_id;

  if (!postId || isNaN(postId)) {
      return res.send("<script>alert('잘못된 요청입니다.'); history.back();</script>");
  }

  // ✅ ENUM 값 검증
  const validBoards = ["밀워키게시판", "타팀게시판", "자유게시판"];
  if (!validBoards.includes(board)) {
      return res.send("<script>alert('올바른 게시판을 선택해주세요.'); history.back();</script>");
  }

  // ✅ 게시글 작성자 확인 (본인만 수정 가능)
  const checkPostQuery = `SELECT brewers_id FROM brewers_posts WHERE id = ?`;
  db.query(checkPostQuery, [postId], (err, results) => {
      if (err || results.length === 0) {
          console.error("게시글 조회 오류:", err);
          return res.status(500).send("<script>alert('게시글을 찾을 수 없습니다.'); history.back();</script>");
      }

      if (results[0].brewers_id !== brewers_id) {
          return res.send("<script>alert('본인 게시글만 수정할 수 있습니다.'); history.back();</script>");
      }

      // ✅ `updated_at`이 없다면 제거
      const updatePostQuery = `
          UPDATE brewers_posts 
          SET board = ?, category = ?, title = ?, content = ?
          WHERE id = ?
      `;

      db.query(updatePostQuery, [board, category, title, content, postId], (err) => {
          if (err) {
              console.error("게시글 수정 오류:", err);
              return res.status(500).send("<script>alert('게시글 수정 실패.'); history.back();</script>");
          }

          // ✅ 기존 파일 삭제 & 새로운 파일 저장 (옵션)
          if (req.files.length > 0) {
              const deleteFilesQuery = `DELETE FROM brewers_files WHERE post_id = ?`;
              db.query(deleteFilesQuery, [postId], (err) => {
                  if (err) console.error("파일 삭제 오류:", err);
              });

              const insertFilesQuery = `INSERT INTO brewers_files (post_id, file_path, file_type) VALUES ?`;
              const fileData = req.files.map(file => [
                  postId,
                  `/img/${file.filename}`,
                  file.mimetype.startsWith('image') ? 'image' : 'video'
              ]);

              db.query(insertFilesQuery, [fileData], (err) => {
                  if (err) console.error("파일 저장 오류:", err);
              });
          }

          res.send(`<script>alert('게시글이 수정되었습니다.'); location.href='/boardDetail?id=${postId}';</script>`);
      });
  });
});

// 📌 게시글 삭제 처리
router.post('/boardDelete', (req, res) => {
  const postId = req.body.postId;
  const userId = req.session.userInfo ? req.session.userInfo.brewers_id : null;

  console.log("✅ 전달된 postId:", postId); // 👉 콘솔에서 확인
  console.log("✅ 현재 로그인한 유저 ID:", userId);

  if (!userId) {
      return res.send("<script>alert('로그인이 필요합니다.'); history.back();</script>");
  }

  if (!postId) {
      return res.send("<script>alert('잘못된 요청입니다.'); history.back();</script>");
  }

  const checkAuthorQuery = "SELECT brewers_id FROM brewers_posts WHERE id = ?";
  db.query(checkAuthorQuery, [postId], (err, result) => {
      if (err) {
          console.error("❌ 게시글 확인 오류:", err);
          return res.send("<script>alert('게시글 조회 중 오류가 발생했습니다.'); history.back();</script>");
      }

      console.log("✅ 조회된 게시글:", result);

      if (result.length === 0) {
          return res.send("<script>alert('게시글을 찾을 수 없습니다.'); history.back();</script>");
      }

      if (result[0].brewers_id !== userId) {
          return res.send("<script>alert('삭제 권한이 없습니다.'); history.back();</script>");
      }

      const deleteQuery = "DELETE FROM brewers_posts WHERE id = ?";
      db.query(deleteQuery, [postId], (err) => {
          if (err) {
              console.error("❌ 게시글 삭제 오류:", err);
              return res.send("<script>alert('삭제에 실패했습니다.'); history.back();</script>");
          }
          res.send("<script>alert('게시글이 삭제되었습니다.'); location.href='/brewers';</script>");
      });
  });
});

// 📌 게시판 공통 로직 함수
function getBoardList(boardType, req, res, viewName) {
    const page = parseInt(req.query.page) || 1;
    const postsPerPage = 20;
    const offset = (page - 1) * postsPerPage;
    const category = req.query.category || null;

    let countQuery = `SELECT COUNT(*) AS total FROM brewers_posts WHERE board = ?`;
    let countParams = [boardType];
    if (category) {
        countQuery += ` AND category = ?`;
        countParams.push(category);
    }

    db.query(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error("게시글 개수 가져오기 오류:", err);
            return res.status(500).send("서버 오류 발생");
        }

        const totalPosts = countResult[0].total;
        const totalPages = Math.ceil(totalPosts / postsPerPage);

        let postQuery = `
            SELECT 
                p.*, 
                r.brewers_nickname, 
                r.brewers_profile_pic,
                (SELECT f.file_path FROM brewers_files f WHERE f.post_id = p.id AND f.file_type = 'image' ORDER BY f.id ASC LIMIT 1) AS thumbnail_image,
                (SELECT f.file_path FROM brewers_files f WHERE f.post_id = p.id AND f.file_type = 'video' ORDER BY f.id ASC LIMIT 1) AS thumbnail_video,
                (SELECT COUNT(*) FROM brewers_comments c WHERE c.post_id = p.id) AS comment_count
            FROM brewers_posts p
            LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
            WHERE p.board = ?
            `;
        let postParams = [boardType];
        if (category) {
            postQuery += ` AND p.category = ?`;
            postParams.push(category);
        }
        postQuery += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        postParams.push(postsPerPage, offset);

        db.query(postQuery, postParams, (err, posts) => {
            if (err) {
                console.error("게시글 목록 가져오기 오류:", err);
                return res.status(500).send("서버 오류 발생");
            }


            // ✅ 공지글도 같이 불러오기
            const noticeQuery = `
                SELECT 
                    p.*, 
                    r.brewers_nickname, 
                    r.brewers_profile_pic 
                FROM brewers_posts p
                LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
                WHERE p.board = '공지'
                ORDER BY p.created_at DESC
            `;

            db.query(noticeQuery, (err2, notices) => {
                if (err2) {
                    console.error("공지글 조회 오류:", err2);
                    return res.status(500).send("공지글 불러오기 실패");
                }

            res.render(viewName, {
                posts,
                notices,
                currentPage: page,
                totalPages,
                totalPosts,
                postsPerPage,
                boardType,
                brewers_id: req.session.userInfo ? req.session.userInfo.brewers_id : null,
                currentPath: req.path,
                category
            });
        });
    });
    });
}


// 📌 밀워키 게시판
router.get('/brewers', (req, res) => {
    getBoardList('밀워키게시판', req, res, 'brewers');
});

// 📌 타팀 게시판
router.get('/mlb', (req, res) => {
    getBoardList('타팀게시판', req, res, 'mlb');
});

// 📌 자유 게시판
router.get('/free', (req, res) => {
    getBoardList('자유게시판', req, res, 'free');
});

// 내가 쓴 게시글
router.get('/myPosts', (req, res) => {
    if (!req.session.userInfo) {
      return res.send("<script>alert('로그인이 필요합니다.'); location.href='/login';</script>");
    }
  
    const brewers_id = req.session.userInfo.brewers_id;
    const page = parseInt(req.query.page) || 1;
    const postsPerPage = 20;
    const offset = (page - 1) * postsPerPage;
  
    // 전체 개수 조회
    const countQuery = `SELECT COUNT(*) AS total FROM brewers_posts WHERE brewers_id = ?`;
  
    db.query(countQuery, [brewers_id], (err, countResult) => {
      if (err) {
        console.error("내 게시글 개수 조회 오류:", err);
        return res.status(500).send("<script>alert('게시글을 불러오는 중 오류가 발생했습니다.'); history.back();</script>");
      }
  
      const totalPosts = countResult[0].total;
      const totalPages = Math.ceil(totalPosts / postsPerPage);
  
      // 글 리스트 조회
      const query = `
        SELECT p.*, r.brewers_nickname, r.brewers_profile_pic,
          (SELECT COUNT(*) FROM brewers_comments c WHERE c.post_id = p.id) AS comment_count
        FROM brewers_posts p
        LEFT JOIN brewers_register r ON p.brewers_id = r.brewers_id
        WHERE p.brewers_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
  
      db.query(query, [brewers_id, postsPerPage, offset], (err, posts) => {
        if (err) {
          console.error("내 게시글 조회 오류:", err);
          return res.status(500).send("<script>alert('게시글을 불러오는 중 오류가 발생했습니다.'); history.back();</script>");
        }
  
        res.render('myPosts', {
          posts,
          brewers_id,
          totalPosts,
          totalPages,
          currentPage: page,
          postsPerPage
        });
      });
    });
  });   

module.exports = router;
