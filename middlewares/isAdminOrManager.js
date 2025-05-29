function isAdminOrManager(req, res, next) {
  const role = req.session.userInfo?.brewers_role;

  if (role === 'admin' || role === 'manager') {
    return next(); // 통과
  }

  res.status(403).send('<script>alert("관리자 전용 기능입니다."); location.href="/";</script>');
}

module.exports = isAdminOrManager;
