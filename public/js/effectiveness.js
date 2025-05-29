// 아이디 중복 확인
document.getElementById("checkUsernameBtn").addEventListener("click", function() {
    const brewers_id = document.getElementById("brewers_id").value.trim();
    const messageBox = document.getElementById("usernameCheckMessage");

    const idRegex = /^[a-zA-Z0-9]{6,12}$/;
    if (!brewers_id) {
        messageBox.style.color = "red";
        messageBox.textContent = "아이디를 입력해주세요.";
        return;
    } else if (!idRegex.test(brewers_id)) {
        messageBox.style.color = "red";
        messageBox.textContent = "아이디는 영문+숫자 조합 6~12자여야 합니다.";
        return;
    }

    fetch(`/check-id?brewers_id=${brewers_id}`)
        .then(response => response.json())
        .then(data => {
            messageBox.style.color = data.success ? "green" : "red";
            messageBox.textContent = data.message;
        })
        .catch(error => {
            console.error("오류 발생:", error);
            messageBox.style.color = "red";
            messageBox.textContent = "서버 오류가 발생했습니다.";
        });
});

// 닉네임 중복 확인
document.getElementById("checkNicknameBtn").addEventListener("click", function() {
    const brewers_nickname = document.getElementById("brewers_nickname").value.trim();
    const messageBox = document.getElementById("nicknameCheckMessage");

    if (!brewers_nickname) {
        messageBox.style.color = "red";
        messageBox.textContent = "닉네임을 입력해주세요.";
        return;
    } else if (brewers_nickname.length < 2 || brewers_nickname.length > 7) {
        messageBox.style.color = "red";
        messageBox.textContent = "닉네임은 2자 이상 7자 이하로 입력해주세요.";
        return;
    }

    fetch(`/check-nickname?brewers_nickname=${brewers_nickname}`)
        .then(response => response.json())
        .then(data => {
            messageBox.style.color = data.success ? "green" : "red";
            messageBox.textContent = data.message;
        })
        .catch(error => {
            console.error("오류 발생:", error);
            messageBox.style.color = "red";
            messageBox.textContent = "서버 오류가 발생했습니다.";
        });
});

// 회원가입 유효성 검사
document.getElementById("signupForm").addEventListener("submit", function(event) {
    const password = document.getElementById("brewers_pw").value;
    const confirmPassword = document.getElementById("brewers_pwcheck").value;

    const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{6,12}$/;

    if (!pwRegex.test(password)) {
        alert("비밀번호는 영문+숫자 조합 6~12자여야 합니다.");
        event.preventDefault();
        return;
    }

    // 2. 비밀번호 일치 여부
    if (password !== confirmPassword) {
        alert("비밀번호가 일치하지 않습니다.");
        event.preventDefault();
        return;
    }

    // ✅ 3. 프로필 사진 첨부 여부 검사
    if (!profilePicInput.files || profilePicInput.files.length === 0) {
        alert("프로필 사진을 선택해주세요.");
        event.preventDefault();
        return;
    }
});

document.getElementById('signupProfilePic').addEventListener('change', function (e) {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        alert('허용되지 않은 파일 형식입니다.\nPNG, JPG, JPEG 형식만 등록 가능합니다.');
        e.target.value = ''; // 파일 초기화
        return;
    }

    // 미리보기
    const reader = new FileReader();
    reader.onload = function (event) {
        const preview = document.getElementById('signupProfilePicPreview');
        preview.src = event.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
});