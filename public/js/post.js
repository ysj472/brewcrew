document.addEventListener("DOMContentLoaded", function () {
  const postContainer = document.querySelector(".post-container");
  if (!postContainer) return;

  const postId = postContainer.dataset.postId;
  const myId = postContainer.dataset.myId;
  const authorId = document.querySelector(".post-author .nickname")?.dataset.userid;

  const likeBtn = document.querySelector("#likeBtn");
  const dislikeBtn = document.querySelector("#dislikeBtn");
  const likeCountSpan = document.getElementById("postLikeCount");

  async function sendLikeRequest(url, successMessage) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId })
      });

      const result = await response.json();

      if (result.success) {
        alert(successMessage);
        updatePostLikeCount();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("추천/비추천 요청 오류:", error.message);
      alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  // 추천 버튼
  likeBtn?.addEventListener("click", () => {
    if (!myId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (myId === authorId) {
      alert("본인 글은 추천할 수 없습니다.");
      return;
    }

    sendLikeRequest("/likePost", "게시글을 추천했습니다.");
  });

  // 비추천 버튼
  dislikeBtn?.addEventListener("click", () => {
    if (!myId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (myId === authorId) {
      alert("본인 글은 비추천할 수 없습니다.");
      return;
    }

    sendLikeRequest("/unlikePost", "게시글을 비추천했습니다.");
  });

  // 추천수 갱신
  async function updatePostLikeCount() {
    try {
      const response = await fetch(`/postLikes?postId=${postId}`);
      const result = await response.json();

      if (result.success) {
        likeCountSpan.innerText = result.likeCount;
      }
    } catch (error) {
      console.error("추천수 갱신 실패:", error.message);
    }
  }

  updatePostLikeCount();
});
