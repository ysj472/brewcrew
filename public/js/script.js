    // 닉네임 클릭 시 박스 표시
    document.body.addEventListener("click", function (event) {
        const nicknameElement = event.target.closest(".nickname");

        if (nicknameElement) {
            event.preventDefault();
            toggleProfileBox(nicknameElement);
        } else if (!event.target.closest(".profile-box")) {
            closeAllProfileBoxes();
        }

        if (event.target.classList.contains("send-message")) {
            event.preventDefault();
            openMessagePopup(event.target.dataset.username, event.target.dataset.userid);
        }
    });
    
    function toggleProfileBox(nicknameElement) {
        // 1. nicknameElement 기준으로 profile-box를 찾는다
        let profileBox = null;

        if (nicknameElement.parentElement) {
            profileBox = nicknameElement.parentElement.querySelector(".profile-box");
        }

        if (!profileBox && nicknameElement.nextElementSibling && nicknameElement.nextElementSibling.classList.contains("profile-box")) {
            profileBox = nicknameElement.nextElementSibling;
        }

        if (!profileBox) {
            profileBox = document.querySelector(".profile-box");
        }

        if (!profileBox) {
            console.error("profile-box를 찾을 수 없습니다.");
            return;
        }

        // 2. 다른 열린 박스 닫기
        document.querySelectorAll(".profile-box").forEach(box => {
            if (box !== profileBox) box.style.display = "none";
        });

        // 3. 내 박스 토글
        profileBox.style.display = (profileBox.style.display === "block") ? "none" : "block";
    }
    
    function closeAllProfileBoxes() {
      document.querySelectorAll(".profile-box").forEach(box => box.style.display = "none");
    }  
  
  // 페이지 하단 검색 옵션 변경
  document.addEventListener("DOMContentLoaded", function () {
    let searchSelect = document.getElementById("searchType");
    if (searchSelect) {
        searchSelect.options[0].text = "🔍 제목+내용";
    }
  });
  
  document.addEventListener("DOMContentLoaded", function () {
      // 회원가입 페이지의 프로필 사진 요소
      const signupProfilePicInput = document.getElementById("signupProfilePic");
      const signupProfilePicPreview = document.getElementById("signupProfilePicPreview");
  
      if (signupProfilePicInput && signupProfilePicPreview) {
          signupProfilePicInput.addEventListener("change", function (event) {
              const file = event.target.files[0];
  
              if (file) {
                  const reader = new FileReader();
                  reader.onload = function (e) {
                      signupProfilePicPreview.src = e.target.result;
                      signupProfilePicPreview.style.display = "block"; // 사진 미리보기 표시
                  };
                  reader.readAsDataURL(file);
              } else {
                  signupProfilePicPreview.style.display = "none"; // 파일 선택이 취소되면 다시 숨김
                  signupProfilePicPreview.src = "";
              }
          });
      }
  
      // 마이페이지 프로필 사진 수정
      const editProfilePicInput = document.getElementById("editProfilePic");
      const editProfilePicPreview = document.getElementById("editProfilePicPreview");
  
      if (editProfilePicInput && editProfilePicPreview) {
          editProfilePicInput.addEventListener("change", function (event) {
              const file = event.target.files[0];
  
              if (file) {
                  const reader = new FileReader();
                  reader.onload = function (e) {
                      editProfilePicPreview.src = e.target.result;
                  };
                  reader.readAsDataURL(file);
              }
          });
      }
  });
  
  // 프로필 팝업 로드 함수
  function loadProfilePopup(username) {
    const profilePopup = document.getElementById("profilePopup");

    fetch(`/getUserProfile?username=${encodeURIComponent(username)}`)
        .then(response => response.json())
        .then(data => {
            profilePopup.innerHTML = `
                <div class="profile-popup-content">
                    <button id="closeProfileBtn" class="close-btn">X</button>
                    <h2>프로필 정보</h2>
                    <img id="popupProfilePic" src="${data.profile_pic || '/img/default-profile.png'}" alt="프로필 사진">
                    <div class="profile-popup-info">
                        <p><strong>아이디:</strong> <span id="popupUserId">${username}</span></p>
                        <p><strong>닉네임:</strong> <span id="popupUserNickname">${data.nickname} 님</span></p>
                        <p><strong>가입일:</strong> <span id="popupUserJoinDate">${data.join_date}</span></p>
                    </div>
                </div>
            `;

            profilePopup.style.display = "block";

            document.getElementById("closeProfileBtn").addEventListener("click", function () {
                profilePopup.style.display = "none";
            });
        })
        .catch(error => {
            console.error("프로필 정보를 불러오는 중 오류 발생:", error);
            alert("프로필 정보를 불러오는 데 실패했습니다.");
        });
}
  
  // 프로필 보기 버튼 클릭 이벤트 추가
  document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll(".profileBtn").forEach(button => {
        button.addEventListener("click", function () {
            const username = this.getAttribute("data-username");
            if (!username) {
                alert("유저 정보를 찾을 수 없습니다.");
                return;
            }
            loadProfilePopup(username);
        });        
      });
  });
  
  //쪽지 보내기
// receiverNickname은 닉네임, receiverId는 brewers_id
function openMessagePopup(receiverNickname, receiverId, messageContent = '') {
    const popupHTML = `
      <div class="message-popup">
          <div class="message-content">
              <button class="close-message-btn">X</button>
              <h2>쪽지 보내기</h2>
              <p>받는 사람: <strong>${receiverNickname}</strong></p>

              <form id="messageForm" action="/sendMessage" method="POST">
                  <input type="text" name="title" placeholder="제목을 입력하세요" required>
                  <textarea name="message" placeholder="${messageContent ? '답장을 입력하세요...' : '내용을 입력하세요...'}" required></textarea>
                  <input type="hidden" name="receiver_id" value="${receiverId}">
                  <button type="submit" id="sendMessageBtn">보내기</button>
              </form>
          </div>
      </div>
    `;

    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = popupHTML;
    document.body.appendChild(popupDiv);

    popupDiv.querySelector(".close-message-btn").addEventListener("click", function () {
        popupDiv.remove();
    });
}
  
// 쪽지 보내기 버튼 클릭했을 때 팝업 띄우기
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("send-message")) {
        e.preventDefault();
        const receiverNickname = e.target.dataset.username; // 닉네임
        const receiverId = e.target.dataset.userid;         // brewers_id
        openMessagePopup(receiverNickname, receiverId);
    }
});

// 답장용 팝업 띄우기
function openReplyPopup(receiverNickname, receiverId, originalTitle) {
    const popupHTML = `
      <div class="message-popup">
          <div class="message-content">
              <button class="close-message-btn">X</button>
              <h2>답장 보내기</h2>
              <p>받는 사람: <strong>${receiverNickname}</strong></p>

              <form id="messageForm" action="/sendMessage" method="POST">
                  <input type="text" name="title" required>
                  <textarea name="message" placeholder="답장 내용을 입력하세요..." required></textarea>
                  <input type="hidden" name="receiver_id" value="${receiverId}">
                  <button type="submit" id="sendMessageBtn">보내기</button>
              </form>
          </div>
      </div>
    `;

    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = popupHTML;
    document.body.appendChild(popupDiv);

    popupDiv.querySelector(".close-message-btn").addEventListener("click", function () {
        popupDiv.remove();
    });
}
  
  // 댓글 개수를 업데이트하는 함수
  function updateCommentCount(postId, commentCount) {
      const postRow = document.querySelector(`#post-${postId}`);
      if (postRow) {
          const commentCountElement = postRow.querySelector(".comment-count");
          if (commentCountElement) {
              // 댓글 개수를 업데이트하고 보이도록 설정
              commentCountElement.textContent = `(${commentCount})`;
              commentCountElement.style.display = commentCount > 0 ? 'inline' : 'none';
          }
      }
  }
  
  // 예시로 댓글 개수를 업데이트하는 방법
  updateCommentCount(1, 5); // 게시물 1번에 댓글 5개가 추가된 경우


  //글쓰기 버튼 로그인 여부
    const writeBtn = document.getElementById("writeBtn");

    if (writeBtn) {
    writeBtn.addEventListener("click", async function () {
        try {
        const response = await fetch("/checkLogin");
        const data = await response.json();

        if (data.success) {
            window.location.href = "/board"; // 로그인 상태
        } else {
            alert(data.message); // 로그인 필요 메시지
            window.location.href = "/login";
        }
        } catch (error) {
        console.error("로그인 상태 확인 실패:", error);
        alert("서버 오류 발생. 다시 시도해주세요.");
        }
    });
    }
