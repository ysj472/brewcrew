const multer = require('multer');
const path = require('path');

// 📌 저장 위치와 파일 이름 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'img')); // public/img 폴더에 저장
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName); // 파일명: 현재시간-랜덤숫자.확장자
  }
});

// 📌 업로드 가능한 파일 확장자
const allowedExtensions = ["jpeg", "jpg", "png", "gif", "mp4", "mov", "avi"];

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 제한
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const mimeType = file.mimetype.split("/")[1];

    if (allowedExtensions.includes(ext) && allowedExtensions.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(null, false); // ❌ 에러 던지지 않고 단순히 업로드 거부
    }
  }
});

module.exports = upload;
