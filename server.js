console.log("🚀 server.js 실행 시작");

const app = require('./app');
const port = 80;

app.listen(port, () => {
    console.log(`서버 실행 중: http://localhost:${port}`);
})

module.exports = app;