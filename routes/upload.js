const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');

// 이미지 업로드
router.post('/uploadImage', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '이미지 업로드 실패' });
  }
  res.json({ success: true, imageUrl: `/img/${req.file.filename}` });
});

// 비디오 업로드
router.post('/uploadVideo', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '비디오 업로드 실패' });
  }
  res.json({ success: true, videoUrl: `/img/${req.file.filename}` });
});

module.exports = router;
