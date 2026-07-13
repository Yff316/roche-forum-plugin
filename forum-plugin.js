window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.3.0",
  apps: [
    {
      id: "minimalist-forum-app",
      name: "论坛主页",
      icon: "chat",
      async mount(container, roche) {
        // 1. 初始化并读取数据
        const defaultWorldView = `围绕着游戏/动漫发帖人就是角色本人发帖 如: 崩铁、原神、鸣潮、王者、斩神、诡秘之主、排球少年等（不需要恋与深空）。
角色会分享近日的日常/对user的心思（暗戳戳表白和明着表白/吃醋）
评论区都是这个角色世界观里的人物会根据角色分享评论
$禁止ooc，根据官方人设发帖
$角色全洁从身到心都洁，只喜欢user/“你”一个人，不论男女。
$绝对代入向禁止出现明确的主角原名，使用“开拓者”“旅行者”或更亲密的称呼。
$评论禁止出现开拓者本人/旅行者本人！user就是开拓者/旅行者！`;

        let settings = (await roche.storage.get("forum_settings")) || {
          worldView: defaultWorldView,
          postCount: 3,
          commentCount: 5,
          themeColor: "#000000",
          apiUrl: "https://api.openai.com/v1/chat/completions",
          apiKey: ""
        };

        let userProfile = (await roche.storage.get("forum_user")) || {
          forumName: "旅行者",
          avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
          name: "旅行者/开拓者",
          age: "未知",
          appearance: "神秘而迷人"
        };

        let selectedWorldbooks = (await roche.storage.get("forum_worldbooks")) || [];
        let posts = (await roche.storage.get("forum_posts")) || [];

        // 2. 插入 CSS
        const style = document.createElement('style');
        style.id = "minimalist-forum-style";
        style.innerHTML = `
          :root { --primary-color: ${settings.themeColor}; }
          .roche-plugin-forum { font-family: monospace, sans-serif; display: flex; flex-direction: column; height: 100%; background: #fff; color: #000; position: relative; overflow: hidden; }
          .forum-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fff; border-bottom: 2px solid var(--primary-color); box-shadow: 0 4px 0 var(--primary-color); z-index: 5; position: relative; flex-shrink: 0; }
          .forum-header button { background: none; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: var(--primary-color); }
          
          /* 页面容器设置 */
          .page-view { flex: 1; overflow-y: auto; padding-bottom: 70px; display: none; background: #fff; }
          .page-view.active { display: block; }
          
          .forum-content { padding: 16px; }
          .forum-post { background: #fff; padding: 16px; margin-bottom: 20px; border: 2px solid var(--primary-color); box-shadow: 4px 4px 0 var(--primary-color); position: relative; }
          .post-header { display: flex; align-items: center; margin-bottom: 8px; }
          .post-avatar { width: 36px; height: 36px; border: 2px solid var(--primary-color); border-radius: 50%; margin-right: 10px; object-fit: cover; }
          .post-author { font-weight: bold; color: var(--primary-color); font-size: 16px; }
          .post-text { line-height: 1.6; white-space: pre-wrap; font-size: 15px; margin-bottom: 10px; }
          .post-text.collapsed { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; }
          .post-image { max-width: 100%; border: 2px solid var(--primary-color); margin-top: 10px; display: block; }
          .post-actions { position: absolute; top: 16px; right: 16px; font-size: 14px; color: var(--primary-color); cursor: pointer; font-weight: bold; }
          .post-comments { margin-top: 16px; padding-top: 12px; border-top: 2px dashed var(--primary-color); }
          .comment-item { margin-bottom: 8px; font-size: 14px; }
          .comment-author { font-weight: bold; margin-right: 8px; }
          
          /* 底部导航 */
          .forum-bottom-bar { display: flex; justify-content: space-around; padding: 12px; background: #fff; border-top: 2px solid var(--primary-color); position: absolute; bottom: 0; width: 100%; box-sizing: border-box; box-shadow: 0 -4px 0 var(--primary-color); z-index: 5; }
          .forum-bottom-bar button { background: none; border: none; font-size: 16px; font-weight: bold; cursor: pointer; flex: 1; color: var(--primary-color); }
          .forum-bottom-bar button.add-btn { font-size: 24px; }
          .forum-bottom-bar button.active { text-decoration: underline; text-decoration-thickness: 3px; }
          
          /* 表单元素 */
          .form-group { margin-bottom: 16px; padding: 0 16px; }
          .form-group h4 { margin-bottom: 8px; border-bottom: 2px solid var(--primary-color); display: inline-block; }
          input[type="text"], input[type="number"], input[type="color"], textarea { width: 100%; margin: 8px 0; padding: 10px; border: 2px solid var(--primary-color); box-sizing: border-box; font-family: monospace; outline: none; background: #fff; }
          textarea { height: 80px; resize: vertical; }
          .btn-primary { background: var(--primary-color); color: #fff; border: 2px solid var(--primary-color); padding: 10px 16px; font-weight: bold; cursor: pointer; text-transform: uppercase; width: 100%; margin-top: 10px; }
          .btn-secondary { background: #fff; color: var(--primary-color); border: 2px solid var(--primary-color); padding: 8px 12px; font-weight: bold; cursor: pointer; font-size: 12px; }
          
          /* 文件上传样式 */
          .file-upload-wrapper { position: relative; display: inline-block; margin-top: 8px; width: 100%; }
          .file-upload-wrapper input[type="file"] { position: absolute; left: 0; top: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
          .file-upload-btn { background: #fff; border: 2px dashed var(--primary-color); color: var(--primary-color); padding: 10px; text-align: center; font-weight: bold; width: 100%; box-sizing: border-box; }
          .preview-img { max-height: 100px; margin-top: 10px; border: 2px solid var(--primary-color); display: none; }

          /* 加载动画 */
          .loading-mask { display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.95); z-index: 20; justify-content: center; align-items: center; flex-direction: column; text-align: center; }
          .spinner { width: 50px; height: 50px; border: 4px solid #eee; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .loading-text { font-weight: bold; font-size: 16px; color: var(--primary-color); }
          
          /* 弹窗保留给发帖 */
          .modal { display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.8); z-index: 15; justify-content: center; align-items: center; backdrop-filter: blur(2px); }
          .modal-content { background: #fff; padding: 20px; border: 2px solid var(--primary-color); box-shadow: 8px 8px 0 var(--primary-color); width: 85%; max-height: 80%; overflow-y: auto; }
        `;
        document.head.appendChild(style);

        // 3. 渲染主框架
        container.innerHTML = `
          <div class="roche-plugin-forum">
            <div class="forum-header">
              <button id="forum-exit">&lt;</button>
              <div id="header-title" style="font-weight: bold; font-size: 18px; text-transform: uppercase;">FORUM</div>
              <button id="nav-settings">...</button>
            </div>

            <!-- ===== 页面1：论坛信息流 ===== -->
            <div id="view-feed" class="page-view active">
              <div style="padding: 10px 16px; border-bottom: 2px solid var(--primary-color); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: var(--primary-color);" id="feed-user-name">@${userProfile.forumName}</span>
                <button id="btn-user-post" class="btn-secondary">+ 发布动态</button>
              </div>
              <div class="forum-content" id="forum-feed-container"></div>
            </div>

            <!-- ===== 页面2：用户主页 ===== -->
            <div id="view-user" class="page-view">
              <div style="padding: 20px 16px; text-align: center; border-bottom: 2px solid var(--primary-color);">
                <img id="user-avatar-preview" src="${userProfile.avatarUrl}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--primary-color); object-fit: cover; margin-bottom: 10px;">
                <h3 style="margin: 0; color: var(--primary-color);">@${userProfile.forumName}</h3>
              </div>
              <div class="form-group" style="margin-top: 20px;">
                <h4>头像设置</h4>
                <label>图片链接 (URL): <input type="text" id="user-avatar-url" value="${userProfile.avatarUrl}"></label>
                <div class="file-upload-wrapper">
                  <div class="file-upload-btn">上传本地头像图片</div>
                  <input type="file" id="user-avatar-file" accept="image/*">
                </div>
              </div>
              <div class="form-group">
                <h4>论坛名字</h4>
                <input type="text" id="user-forum-name" value="${userProfile.forumName}">
              </div>
              <div class="form-group">
                <h4>你的代入设定 (发帖角色可见)</h4>
                <label>姓名: <input type="text" id="user-name" value="${userProfile.name}"></label>
                <label>年龄: <input type="text" id="user-age" value="${userProfile.age}"></label>
                <label>外貌特征: <textarea id="user-appearance">${userProfile.appearance}</textarea></label>
              </div>
              <div class="form-group">
                <h4>界面颜色美化</h4>
                <input type="color" id="theme-color" value="${settings.themeColor}">
              </div>
              <div class="form-group">
                <button id="user-save" class="btn-primary">保存主页设定</button>
              </div>
            </div>

            <!-- ===== 页面3：偏好设置 ===== -->
            <div id="view-settings" class="page-view">
              <div class="form-group" style="margin-top: 16px;">
                <h4>世界观设定</h4>
                <textarea id="set-worldview" style="height: 120px;">${settings.worldView}</textarea>
              </div>
              <div class="form-group">
                <h4>挂载世界书</h4>
                <div id="wb-list" style="max-height: 120px; overflow-y: auto; border: 2px solid var(--primary-color); padding: 10px;">加载中...</div>
              </div>
              <div class="form-group">
                <h4>API 生成配置</h4>
                <label>帖子数: <input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                <label>评论数: <input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
              </div>
              <div class="form-group">
                <h4>独立 API 设置</h4>
                <label>API 地址: <input type="text" id="set-api-url" value="${settings.apiUrl}" placeholder="https://api.openai.com/v1/chat/completions"></label>
                <label>API 密钥 (Key): <input type="text" id="set-api-key" value="${settings.apiKey}" placeholder="sk-..."></label>
                <button id="btn-test-api" class="btn-secondary" style="width: 100%; margin-top: 5px;">测试连接</button>
              </div>
              <div class="form-group">
                <button id="settings-save" class="btn-primary">保存设置</button>
              </div>
            </div>

            <!-- 底部导航 -->
            <div class="forum-bottom-bar">
              <button id="nav-home" class="active">主页</button>
              <button id="nav-refresh" class="add-btn">↻</button>
              <button id="nav-msg">私信</button>
              <button id="nav-user-page">我的</button>
            </div>

            <!-- 发帖弹窗 -->
            <div class="modal" id="modal-post">
              <div class="modal-content">
                <h3>发布新动态</h3>
                <textarea id="user-post-content" placeholder="分享你的日常，或者吐槽点什么..."></textarea>
                <div class="file-upload-wrapper">
                  <div class="file-upload-btn">➕ 添加图片</div>
                  <input type="file" id="post-image-file" accept="image/*">
                </div>
                <img id="post-image-preview" class="preview-img">
                <div style="display:flex; justify-content:space-between; margin-top:15px;">
                  <button class="btn-secondary" id="post-cancel" style="width: 45%;">取消</button>
                  <button class="btn-primary" id="post-submit" style="width: 45%; margin-top:0;">发布</button>
                </div>
              </div>
            </div>

            <!-- 加载动画 -->
            <div class="loading-mask" id="loading-mask">
              <div class="spinner"></div>
              <div class="loading-text">正在捕捉时空交汇的电波...</div>
            </div>
          </div>
        `;

        const views = {
          feed: container.querySelector('#view-feed'),
          user: container.querySelector('#view-user'),
          settings: container.querySelector('#view-settings')
        };
        const navBtns = {
          home: container.querySelector('#nav-home'),
          user: container.querySelector('#nav-user-page'),
          settings: container.querySelector('#nav-settings')
        };
        const headerTitle = container.querySelector('#header-title');

        // 页面切换逻辑
        const switchView = (viewName, title) => {
          Object.values(views).forEach(v => v.classList.remove('active'));
          views[viewName].classList.add('active');
          headerTitle.innerText = title;
          
          navBtns.home.classList.toggle('active', viewName === 'feed');
          navBtns.user.classList.toggle('active', viewName === 'user');
        };

        navBtns.home.onclick = () => switchView('feed', 'FORUM');
        navBtns.user.onclick = () => switchView('user', 'MY PROFILE');
        navBtns.settings.onclick = async () => {
          await loadWorldbooks();
          switchView('settings', 'SETTINGS');
        };

        // 文件转 Base64 辅助函数
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });

        // 渲染帖子
        const feedContainer = container.querySelector('#forum-feed-container');
        const renderFeed = () => {
          feedContainer.innerHTML = '';
          if(posts.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center; margin-top:50px; font-weight:bold; color: var(--primary-color);">暂无动态，点击 ↻ 刷新生成，或自己发一条</div>';
            return;
          }
          posts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            
            const commentsHtml = post.comments && post.comments.length > 0 
              ? `<div class="post-comments">` + post.comments.map(c => `<div class="comment-item"><span class="comment-author">@${c.author}:</span>${c.content}</div>`).join('') + `</div>` 
              : '';
              
            const avatarHtml = post.avatar 
              ? `<img src="${post.avatar}" class="post-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'">` 
              : `<div class="post-avatar" style="display:inline-block; background:var(--primary-color);"></div>`;
              
            const imageHtml = post.imageBase64 ? `<img src="${post.imageBase64}" class="post-image">` : '';

            div.innerHTML = `
              <div class="post-actions" data-id="${post.id}">X</div>
              <div class="post-header">
                ${avatarHtml}
                <div class="post-author">@${post.author}</div>
              </div>
              <div class="post-text collapsed">${post.content}</div>
              ${imageHtml}
              ${commentsHtml}
            `;
            
            div.querySelector('.post-text').onclick = (e) => e.target.classList.toggle('collapsed');
            div.querySelector('.post-actions').onclick = async () => {
              const confirm = await roche.ui.confirm({ title: "删除", message: "是否删除这条帖子？" });
              if (confirm) {
                posts = posts.filter(p => p.id !== post.id);
                await roche.storage.set("forum_posts", posts);
                renderFeed();
              }
            };
            feedContainer.appendChild(div);
          });
        };
        renderFeed();

        // 退出与私信
        container.querySelector('#forum-exit').onclick = () => roche.ui.closeApp();
        container.querySelector('#nav-msg').onclick = () => roche.ui.toast("私信功能开发中...");

        // 头像上传预览
        const avatarFileInput = container.querySelector('#user-avatar-file');
        const avatarUrlInput = container.querySelector('#user-avatar-url');
        const avatarPreview = container.querySelector('#user-avatar-preview');
        avatarFileInput.onchange = async (e) => {
          if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            avatarUrlInput.value = base64; // 将 Base64 填入输入框
            avatarPreview.src = base64;
          }
        };
        avatarUrlInput.oninput = (e) => { avatarPreview.src = e.target.value; };

        // 保存用户主页
        container.querySelector('#user-save').onclick = async () => {
          userProfile.forumName = container.querySelector('#user-forum-name').value;
          userProfile.avatarUrl = avatarUrlInput.value;
          userProfile.name = container.querySelector('#user-name').value;
          userProfile.age = container.querySelector('#user-age').value;
          userProfile.appearance = container.querySelector('#user-appearance').value;
          
          settings.themeColor = container.querySelector('#theme-color').value;
          document.documentElement.style.setProperty('--primary-color', settings.themeColor);
          
          await roche.storage.set("forum_user", userProfile);
          await roche.storage.set("forum_settings", settings);
          
          container.querySelector('#feed-user-name').innerText = `@${userProfile.forumName}`;
          roche.ui.toast("主页设定已保存！");
        };

        // 发帖逻辑与图片上传
        const modalPost = container.querySelector('#modal-post');
        let currentPostImage = null;
        
        container.querySelector('#btn-user-post').onclick = () => modalPost.style.display = 'flex';
        container.querySelector('#post-cancel').onclick = () => {
          modalPost.style.display = 'none';
          container.querySelector('#user-post-content').value = '';
          currentPostImage = null;
          container.querySelector('#post-image-preview').style.display = 'none';
        };
        
        container.querySelector('#post-image-file').onchange = async (e) => {
          if (e.target.files && e.target.files[0]) {
            currentPostImage = await fileToBase64(e.target.files[0]);
            const preview = container.querySelector('#post-image-preview');
            preview.src = currentPostImage;
            preview.style.display = 'block';
          }
        };

        container.querySelector('#post-submit').onclick = async () => {
          const content = container.querySelector('#user-post-content').value.trim();
          if(!content && !currentPostImage) { roche.ui.toast("内容或图片不能全空"); return; }
          
          const newPost = {
            id: crypto.randomUUID(),
            author: userProfile.forumName || "未知",
            avatar: userProfile.avatarUrl,
            content: content,
            imageBase64: currentPostImage, // 保存图片
            comments: [],
            timestamp: Date.now()
          };
          posts.unshift(newPost);
          await roche.storage.set("forum_posts", posts);
          
          container.querySelector('#post-cancel').click(); // 复原表单
          switchView('feed', 'FORUM');
          renderFeed();
          roche.ui.toast("发布成功！点 ↻ 让角色来评论你");
        };

        // 世界书加载
        const loadWorldbooks = async () => {
          try {
            const categories = await roche.worldbook.list();
            const wbList = container.querySelector('#wb-list');
            if (!categories || categories.length === 0) { wbList.innerHTML = "暂无世界书分类"; return; }
            wbList.innerHTML = categories.map(cat => `
              <div><label><input type="checkbox" class="wb-check" value="${cat.id}" ${selectedWorldbooks.includes(cat.id) ? 'checked' : ''}> ${cat.name}</label></div>
            `).join('');
          } catch(e) { console.error(e); }
        };

        // API 测试
        container.querySelector('#btn-test-api').onclick = async () => {
          roche.ui.toast("测试连接中...");
          try {
            const res = await fetch(container.querySelector('#set-api-url').value, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${container.querySelector('#set-api-key').value}`
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo", // 使用默认模型测试连通性
                messages: [{role: "user", content: "hi"}],
                max_tokens: 5
              })
            });
            if(res.ok) roche.ui.toast("API 连接成功！");
            else roche.ui.toast(`连接失败：状态码 ${res.status}`);
          } catch(err) {
            roche.ui.toast("连接失败，请检查网络或地址格式");
          }
        };

        // 保存设置
        container.querySelector('#settings-save').onclick = async () => {
          settings.worldView = container.querySelector('#set-worldview').value;
          settings.postCount = parseInt(container.querySelector('#set-post-count').value) || 3;
          settings.commentCount = parseInt(container.querySelector('#set-comment-count').value) || 5;
          settings.apiUrl = container.querySelector('#set-api-url').value;
          settings.apiKey = container.querySelector('#set-api-key').value;
          selectedWorldbooks = Array.from(container.querySelectorAll('.wb-check:checked')).map(cb => cb.value);
          
          await roche.storage.set("forum_settings", settings);
          await roche.storage.set("forum_worldbooks", selectedWorldbooks);
          roche.ui.toast("偏好设置已保存");
        };

        // AI 自动生成帖子逻辑 (支持独立API和内置API)
        const loadingMask = container.querySelector('#loading-mask');
        container.querySelector('#nav-refresh').onclick = async () => {
          switchView('feed', 'FORUM');
          loadingMask.style.display = 'flex';
          try {
            let wbText = "";
            for (let catId of selectedWorldbooks) {
              const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: "global" });
              if (entries && entries.length > 0) {
                wbText += entries.map(e => `${e.keys.join(',')}: ${e.content}`).join('\n') + "\n";
              }
            }

            const recentPostsStr = posts.slice(0, 3).map(p => `[用户:@${p.author}]: ${p.content}${p.imageBase64 ? " (发送了一张图片)" : ""}`).join('\n');
            const prompt = `你现在是一个沉浸式论坛的模拟生成器。请严格按照以下世界观和规则，生成 ${settings.postCount} 篇帖子，每篇带 ${settings.commentCount} 条评论。
【世界观】：\n${settings.worldView}
【用户(你)的情报】：
论坛名字：@${userProfile.forumName}
姓名：${userProfile.name}，年龄：${userProfile.age}，外貌：${userProfile.appearance}
【论坛近期参考】：\n${recentPostsStr}
【世界书背景】：\n${wbText}
请直接输出合法的纯JSON数组：[{"author":"发帖人","content":"内容","comments":[{"author":"评论人","content":"内容"}]}]`;

            let rawText = "";
            
            // 判断是否使用了自定义 API
            if (settings.apiUrl && settings.apiKey) {
              const res = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                  model: "gpt-4o", // 根据你的接口可以修改默认请求模型
                  messages: [{role: "user", content: prompt}],
                  temperature: 0.8
                })
              });
              const data = await res.json();
              rawText = data.choices[0].message.content;
            } else {
              // 使用 Roche 内置 API
              const result = await roche.ai.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.8 });
              rawText = result.text;
            }

            rawText = rawText.trim();
            const startIdx = rawText.indexOf('[');
            const endIdx = rawText.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1) rawText = rawText.substring(startIdx, endIdx + 1);
            
            const generatedData = JSON.parse(rawText);
            if (Array.isArray(generatedData)) {
              const newPosts = generatedData.map(item => ({
                id: crypto.randomUUID(), author: item.author || "未知", content: item.content || "", comments: item.comments || [], timestamp: Date.now()
              }));
              posts = [...newPosts, ...posts];
              await roche.storage.set("forum_posts", posts);
              renderFeed();
              roche.ui.toast("捕捉到新的时空电波！");
            } else throw new Error("解析格式错误");
          } catch(err) {
            console.error(err);
            roche.ui.toast("生成失败，请检查 API 配置或重新刷新");
          } finally {
            loadingMask.style.display = 'none';
          }
        };
      },
      async unmount(container, roche) {
        container.replaceChildren();
        const style = document.getElementById("minimalist-forum-style");
        if (style) style.remove();
      }
    }
  ]
});
