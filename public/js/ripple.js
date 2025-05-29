document.addEventListener("DOMContentLoaded", function () {
    const commentForm = document.getElementById("commentForm");
    const postContainer = document.querySelector(".post-container");
    const commentList = document.getElementById("comment-list");
    const commentCount = document.getElementById("comment-count");
  
    if (!postContainer) return;
    const postId = postContainer.dataset.postId;
    const myId = postContainer.dataset.myId;
  
    if (commentForm) {
      commentForm.addEventListener("submit", async function (e) {
        e.preventDefault();
  
        const textarea = commentForm.querySelector("textarea");
        const comment = textarea.value.trim();
  
        if (!comment) {
          alert("댓글 내용을 입력해주세요.");
          return;
        }
  
        try {
          const response = await fetch("/addComment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment, postId }),
          });
          const result = await response.json();
  
          if (result.success) {
            alert("댓글이 등록되었습니다.");
            textarea.value = "";
            loadComments();
          } else {
            alert(result.message);
          }
        } catch (error) {
          console.error("댓글 등록 오류:", error);
        }
      });
    }
  
    async function loadComments() {
      commentList.innerHTML = "";
  
      try {
        const response = await fetch(`/getComments?postId=${postId}`);
        const result = await response.json();
  
        console.log("댓글 불러오기 결과:", result);
  
        if (result.success) {
          commentCount.innerText = result.totalComments;
  
          result.comments.forEach(comment => {
            const commentItem = document.createElement("div");
            commentItem.className = "comment-item";
            commentItem.innerHTML = `
              <div class="comment-header">
                <img src="${comment.brewers_profile_pic || '/img/default-profile.png'}" class="comment-profile-img" alt="프로필">
                <span class="comment-author nickname" data-username="${comment.brewers_nickname}" data-userid="${comment.brewers_id}">
                    ${comment.brewers_nickname}
                </span>
                <span class="comment-time">${new Date(comment.created_at).toLocaleString('ko-KR')}</span>
  
                ${comment.brewers_id === myId ? `
                  <span class="comment-meta-actions">
                    <button class="edit-btn" data-comment-id="${comment.id}" data-content="${comment.content}">수정</button>
                    <button class="delete-btn" data-comment-id="${comment.id}">삭제</button>
                  </span>
                ` : ''}
              </div>
              <div class="comment-body">
                <p>${comment.content}</p>
              </div>
            `;
            commentList.appendChild(commentItem);
          });
        } else {
          commentList.innerHTML = `<p>댓글을 불러오는 데 실패했습니다.</p>`;
        }
      } catch (error) {
        console.error("댓글 불러오기 오류:", error);
        commentList.innerHTML = `<p>댓글을 불러오는 중 오류 발생</p>`;
      }
    }
  
    commentList.addEventListener("click", async (e) => {
      const target = e.target;

      // ✨ 댓글 닉네임 클릭했을 때
      if (target.classList.contains("nickname")) {
        e.preventDefault();
        toggleCommentProfileBox(target);  // 옵션 박스(profile-box)만 띄움
        return;
    }
  
      // 댓글 수정
      if (target.classList.contains("edit-btn")) {
        const commentItem = target.closest(".comment-item");
        const commentId = target.dataset.commentId;
        const oldContent = commentItem.querySelector(".comment-body p").innerText;
  
        if (commentItem.querySelector(".edit-comment-form")) return;
  
        // 기존 본문 숨기기
        commentItem.querySelector(".comment-body p").style.display = "none";
  
        // ✨ 수정용 form 생성 (comment-form 스타일로)
        const editForm = document.createElement("form");
        editForm.className = "comment-form edit-comment-form";
  
        // textarea
        const textarea = document.createElement("textarea");
        textarea.value = oldContent;
        textarea.rows = 2;
        editForm.appendChild(textarea);
  
        // 수정 완료 버튼
        const saveBtn = document.createElement("button");
        saveBtn.type = "submit";
        saveBtn.innerText = "수정";
        editForm.appendChild(saveBtn);
  
        // comment-body에 삽입
        commentItem.querySelector(".comment-body").appendChild(editForm);
  
        // 수정 완료 버튼 동작
        editForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const newContent = textarea.value.trim();
  
          if (!newContent) {
            alert("수정할 내용을 입력하세요.");
            return;
          }
  
          try {
            const response = await fetch("/editComment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ commentId, newContent }),
            });
            const result = await response.json();
  
            if (result.success) {
              alert("댓글이 수정되었습니다.");
              loadComments();
            } else {
              alert(result.message);
            }
          } catch (error) {
            console.error("댓글 수정 오류:", error);
          }
        });
      }
  
      // 댓글 삭제
      if (target.classList.contains("delete-btn")) {
        const commentId = target.dataset.commentId;
  
        if (!commentId) {
          alert("삭제할 댓글 ID가 없습니다.");
          return;
        }
  
        if (confirm("댓글을 삭제하시겠습니까?")) {
          try {
            const response = await fetch("/deleteComment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ commentId }),
            });
            const result = await response.json();
  
            if (result.success) {
              alert("댓글이 삭제되었습니다.");
              loadComments();
            } else {
              alert(result.message);
            }
          } catch (error) {
            console.error("댓글 삭제 오류:", error);
          }
        }
      }
    });
  
    loadComments(); // 페이지 로딩 시 댓글 불러오기
  });
  

  function toggleCommentProfileBox(nicknameElement) {
    // 기존 열린 박스 다 닫기
    document.querySelectorAll(".profile-box").forEach(box => box.remove());

    const username = nicknameElement.dataset.username;
    const userid = nicknameElement.dataset.userid;

    if (!username || !userid) return;

    const profileBox = document.createElement("div");
    profileBox.className = "profile-box";
    profileBox.style.position = "absolute";
    profileBox.style.background = "#fff";
    profileBox.style.border = "1px solid #ccc";
    profileBox.style.padding = "10px";
    profileBox.style.zIndex = "9999";
    profileBox.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

    profileBox.style.display = "block";

    // 👉 본인과 비교
    const myId = document.querySelector(".post-container")?.dataset?.myId;

    // 👉 쪽지 보내기 제외 여부 확인
    const isSelf = myId && myId === userid;

    profileBox.innerHTML = `
        <a href="#" class="profileBtn" data-username="${userid}">프로필 보기</a><br>
        <a class="listBtn" href="/userList?id=${userid}">게시글 보기</a><br>
        ${myId && myId !== userid ? `
          <a href="#" class="send-message" data-username="${username}" data-userid="${userid}">쪽지 보내기</a>
        ` : ''}
    `;
    nicknameElement.parentElement.appendChild(profileBox);

    const profileBtn = profileBox.querySelector(".profileBtn");
    const sendMessageBtn = profileBox.querySelector(".send-message");

    if (profileBtn) {
        profileBtn.addEventListener("click", function (event) {
            event.preventDefault();
            const usernameFromButton = this.dataset.username;
            loadProfilePopup(usernameFromButton);
        });
    }

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener("click", function (event) {
            event.preventDefault();
            const usernameFromButton = this.dataset.username;
            openMessagePopup(usernameFromButton);
        });
    }

    const rect = nicknameElement.getBoundingClientRect();
    profileBox.style.top = (nicknameElement.offsetTop + nicknameElement.offsetHeight) + "px";
    profileBox.style.left = nicknameElement.offsetLeft + "px";
}

document.body.addEventListener("click", function (event) {
  const target = event.target;

  if (target.classList.contains("nickname")) {
      event.preventDefault();

      // ✨ 댓글(commentList) 안에 있는 nickname인지 체크
      const inComment = target.closest("#comment-list");

      if (inComment) {
          toggleCommentProfileBox(target); // 댓글용
      } else {
          // 본문용 닉네임 클릭이면 여기에 맞는 동작을 추가하거나,
          // 현재는 따로 profile-box를 찾지 않으니 무시하거나
          console.log("본문 닉네임 클릭: 별도 처리 필요 (toggleProfileBox 없음)");
      }

      return;
  }

  // 닉네임이 아닌 곳 클릭하면 열려있는 profile-box 닫기
  if (!target.closest(".profile-box")) {
      document.querySelectorAll(".profile-box").forEach(box => box.remove());
  }
});
