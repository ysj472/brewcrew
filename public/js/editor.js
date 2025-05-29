const Delta = Quill.import('delta');
const BlockEmbed = Quill.import('blots/block/embed');

// 🎞️ 사용자 영상 업로드용 커스텀 <video>
class CustomVideo extends BlockEmbed {
    static create(value) {
        const node = super.create();
        node.setAttribute('controls', true);
        node.setAttribute('src', value);
        node.setAttribute('style', 'width: 100%; border-radius: 8px;');
        return node;
    }
    static value(node) {
        return node.getAttribute('src');
    }
}
CustomVideo.blotName = 'customVideo';
CustomVideo.tagName = 'video';
Quill.register(CustomVideo);

// ▶️ iframe 태그 붙여넣기 허용 (유튜브/스트리머블 등)
class IframeBlot extends BlockEmbed {
    static create(value) {
        const node = super.create();
        node.setAttribute('src', value.src);
        node.setAttribute('width', value.width || '560');
        node.setAttribute('height', value.height || '315');
        node.setAttribute('frameborder', '0');
        node.setAttribute('allowfullscreen', true);
        node.setAttribute('style', 'width: 100%; margin: 1em 0;');
        return node;
    }
    static value(node) {
        return {
            src: node.getAttribute('src'),
            width: node.getAttribute('width'),
            height: node.getAttribute('height')
        };
    }
}
IframeBlot.blotName = 'iframe';
IframeBlot.tagName = 'iframe';
Quill.register(IframeBlot);

document.addEventListener("DOMContentLoaded", function () {
    const quill = new Quill("#editor-container", {
        theme: "snow",
        placeholder: "내용을 입력하세요...",
        modules: {
            toolbar: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['image', 'video']
            ]
        }
    });

        // 📌 <iframe> 붙여넣기 직접 embed 처리 (Streamable, YouTube 등)
        quill.root.addEventListener('paste', function (e) {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text/plain');

            if (pastedText && pastedText.startsWith('<iframe')) {
                e.preventDefault();

                // 1. src 추출
                const srcMatch = pastedText.match(/src="([^"]+)"/);
                if (!srcMatch) return alert("iframe 태그에 src가 없습니다.");

                const src = srcMatch[1];

                // 2. width, height 추출 (기본값 fallback)
                const widthMatch = pastedText.match(/width="([^"]+)"/);
                const heightMatch = pastedText.match(/height="([^"]+)"/);

                const width = widthMatch ? widthMatch[1] : "560";
                const height = heightMatch ? heightMatch[1] : "315";

                // 3. 에디터에 embed 삽입
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'iframe', { src, width, height });
            }
        });    

    // ✅ 붙여넣기 시 iframe 유지 (Streamable/YouTube iframe 직접 붙여넣을 때)
    quill.clipboard.addMatcher('IFRAME', function (node, delta) {
        return new Delta().insert({
            iframe: {
                src: node.getAttribute('src'),
                width: node.getAttribute('width'),
                height: node.getAttribute('height')
            }
        });
    });

    // 🖼️ 이미지 업로드
    quill.getModule('toolbar').addHandler('image', () => {
        let input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            let file = input.files[0];
            let formData = new FormData();
            formData.append('image', file);

            let response = await fetch('/uploadImage', { method: 'POST', body: formData });
            let data = await response.json();

            if (data.success) {
                let imageUrl = data.imageUrl;
                let range = quill.getSelection();
                quill.insertEmbed(range.index, 'image', imageUrl);
            } else {
                alert("이미지 업로드 실패: " + data.message);
            }
        };
    });

    // 🎥 동영상: 유튜브 링크 또는 직접 업로드 선택
    quill.getModule('toolbar').addHandler('video', () => {
        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div style="padding: 20px; font-size: 14px;">
                <p><strong>동영상 삽입 방법 선택</strong></p>
                <button id="embedYoutubeBtn" style="margin-right:10px;">🔗 유튜브 링크 삽입</button>
                <button id="uploadVideoBtn">📁 동영상 파일 업로드</button>
            </div>
        `;
        dialog.style.position = 'fixed';
        dialog.style.top = '30%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translateX(-50%)';
        dialog.style.zIndex = 9999;
        dialog.style.background = 'white';
        dialog.style.border = '1px solid #ccc';
        dialog.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
        document.body.appendChild(dialog);

        // 유튜브 링크
        dialog.querySelector('#embedYoutubeBtn').addEventListener('click', () => {
            const url = prompt("YouTube 영상 주소를 입력하세요:");
            if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'video', url);
            } else {
                alert("유효한 YouTube 링크를 입력해주세요.");
            }
            document.body.removeChild(dialog);
        });

        // 직접 업로드
        dialog.querySelector('#uploadVideoBtn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'video/*');
            input.click();

            input.onchange = async () => {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('video', file);

                try {
                    const response = await fetch('/uploadVideo', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();

                    if (data.success) {
                        const videoUrl = data.videoUrl;
                        const range = quill.getSelection(true);
                        quill.insertEmbed(range.index, 'customVideo', videoUrl);
                    } else {
                        alert("동영상 업로드 실패: " + data.message);
                    }
                } catch (error) {
                    console.error("동영상 업로드 에러:", error);
                }
                document.body.removeChild(dialog);
            };
        });
    });

    // 📥 기존 글 불러오기
    let content = document.querySelector("#content").value.trim();
    if (content) {
        quill.root.innerHTML = content;
    }

    // 📨 폼 제출 시 hidden input에 저장
    const form = document.querySelector("form[action='/boardProc']") || document.querySelector("form[action='/boardEditProc']");
    if (form) {
        form.addEventListener("submit", function () {
            document.querySelector("#content").value = quill.root.innerHTML;
        });
    }
});