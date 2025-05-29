const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const app = express();

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', './views');

// 메뉴 선택 효과
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));

// 세션 설정
app.use(session({
  secret: 'brewers',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60, secure: false }
}));

// POST 데이터 파싱
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 로그인 정보 미들웨어
app.use((req, res, next) => {
  res.locals.brewers_id = '';
  res.locals.brewers_nickname = '';
  res.locals.brewers_profile_pic = '';
  res.locals.brewers_role = '';

  if (req.session.userInfo) {
    res.locals.brewers_id = req.session.userInfo.brewers_id;
    res.locals.brewers_nickname = req.session.userInfo.brewers_nickname;
    res.locals.brewers_profile_pic = req.session.userInfo.brewers_profile_pic;
    res.locals.brewers_role = req.session.userInfo.brewers_role;
  }
  next();
});

// ✅ 여기에 추가하세요: 로그인한 유저의 알림 데이터 처리
app.use((req, res, next) => {
  if (req.session.userInfo) {
    const userId = req.session.userInfo.brewers_id;

    db.query(`
      SELECT COUNT(*) AS newCommentsCount 
      FROM brewers_comments 
      WHERE post_id IN (
        SELECT id FROM brewers_posts WHERE brewers_id = ?
      ) AND is_checked = 0
    `, [userId], (err, commentResult) => {
      if (err) return next(err);
      const newCommentsCount = commentResult[0].newCommentsCount;

      db.query(`
        SELECT COUNT(*) AS newMessagesCount 
        FROM brewers_messages 
        WHERE receiver_id = ? AND is_read = 0
      `, [userId], (err, messageResult) => {
        if (err) return next(err);
        res.locals.newCommentsCount = newCommentsCount;
        res.locals.newMessagesCount = messageResult[0].newMessagesCount;
        next();
      });
    });
  } else {
    res.locals.newCommentsCount = 0;
    res.locals.newMessagesCount = 0;
    next();
  }
});

// ---------------------
// 🔥 분리된 라우터 가져오기
// ---------------------
const authRouter = require('./routes/auth');
const boardRouter = require('./routes/board');
const commentRouter = require('./routes/comment');
const likeRouter = require('./routes/like');
const messageRouter = require('./routes/message');
const userRouter = require('./routes/user');
const searchRouter = require('./routes/search');
const profileRouter = require('./routes/profile');
const mainRouter = require('./routes/main');
const uploadRouter = require('./routes/upload');
const adminRouter = require('./routes/admin');
const reportRouter = require('./routes/report');
// ---------------------
// 라우터 등록
// ---------------------
app.use('/', mainRouter);
app.use('/', authRouter);
app.use('/', boardRouter);
app.use('/', commentRouter);
app.use('/', likeRouter);
app.use('/', messageRouter);
app.use('/', userRouter);
app.use('/', searchRouter);
app.use('/', profileRouter);
app.use('/', uploadRouter);
app.use('/', adminRouter);
app.use('/', reportRouter);

module.exports = app;
