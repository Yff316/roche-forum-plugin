window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.1.0",
  apps: [
    {
      id: "minimalist-forum-app",
      name: "论坛主页",
      icon: "chat",
      async mount(container, roche) {
        // 1. 初始化并读取数据
        const defaultWorldView = `围绕着游戏/动漫发帖人就是角色本人发帖
如: 崩铁、原神、鸣潮、王者、斩神、诡秘之主、排球少年等（不需要恋与深空）。
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
          themeColor: "#000000"
        };

        let userProfile = (await roche.storage.get("forum_user")) || {
          name: "旅行者/开拓者",
          age: "未知",
          appearance: "神秘而迷人"
        };
        
        let selectedWorldbooks = (await roche.storage.get("forum_worldbooks")) || [];
        let posts = (await roche.storage.get("forum_posts")) || [];

        // 2. 插入黑白立体线条风格的 CSS
        const style = document.createElement('style');
        style.id = "minimalist-forum-style";
        // 使用 CSS 变量方便后续更改主题颜色
        style.innerHTML = `
          :root {
            --primary-color: ${settings.themeColor};
          }
          .roche-plugin-forum { font-family: monospace, sans-serif; display: flex; flex-direction: column; height: 100%; background: #fff; color: #000; position: relative; }
          .forum-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fff; border-bottom: 2px solid var(--primary-color); box-shadow: 0 4px 0 var(--primary-color); z-index: 5; position: relative;}
          .forum-header button { background: none; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: var(--primary-color); }
          .forum-content { flex: 1; overflow-y: auto; padding: 16px; padding-bottom: 80px; background: #fff; }
          
          .forum-post { background: #fff; padding: 16px; margin-bottom: 20px; border: 2px solid var(--primary-color); border-radius: 0px; box-shadow: 4px 4px 0 var(--primary-color); position: relative; }
          .post-author { font-weight: bold; margin-bottom: 8px; color: var(--primary-color); font-size: 18px; }
          .post-text { line-height: 1.6; white-space: pre-wrap; font-size: 15px; }
          .post-text.collapsed { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; }
          .post-actions { position: absolute; top: 16px; right: 16px; font-size: 14px; color: var(--primary-color); cursor: pointer; font-weight: bold; }
          
          .post-comments { margin-top: 16px; padding-top: 12px; border-top: 2px dashed var(--primary-color); }
          .comment-item { margin-bottom: 8px; font-size: 14px; }
          .comment-author { font-weight: bold; margin-right: 8px; }
          
          .forum-bottom-bar { display: flex; justify-content: space-around; padding: 12px; background: #fff; border-top: 2px solid var(--primary-color); position: absolute; bottom: 0; width: 100%; box-sizing: border-box; box-shadow: 0 -4px 0 var(--primary-color); z-index: 5;}
          .forum-bottom-bar button { background: none; border: none; font-size: 16px; font-weight: bold; cursor: pointer; flex: 1; color: var(--primary-color); }
          .forum-bottom-bar button.add-btn { font-size: 24px; }

          /* 模态框立体风格 */
          .forum-modal { display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.8); z-index: 10; flex-direction: column; justify-content: center; align-items: center; backdrop-filter: blur(2px); }
          .forum-modal-content { background: #fff; padding: 20px; border: 2px solid var(--primary-color); box-shadow: 8px 8px 0 var(--primary-color); width: 85%; max-height: 80%; overflow-y: auto; }
          .forum-modal textarea, .forum-modal input[type="text"], .forum-modal input[type="number"], .forum-modal input[type="color"] { width: 100%; margin: 8px 0; padding: 10px; border: 2px solid var(--primary-color); box-sizing: border-box; font-family: monospace; outline: none; }
          .forum-modal textarea { height: 120px; resize: vertical; }
          .btn-primary { background: var(--primary-color); color: #fff; border: 2px solid var(--primary-color); padding: 10px 16px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
          .btn-cancel { background: #fff; color: var(--primary-color); border: 2px solid var(--primary-color); padding: 10px 16px; font-weight: bold; cursor: pointer; margin-left: 10px; }
          
          .setting-group { margin-bottom: 20px; }
          .setting-group h4 { margin-bottom: 8px; border-bottom: 2px solid var(--primary-color); display: inline-block; }
          
          /* 加载动画 */
          .loading-mask { display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.9); z-index: 20; justify-content: center; align-items: center; font-weight: bold; font-size: 18px; color: var(--primary-color); flex-direction: column; }
        `;
        document.head.appendChild(style);

        // 3. 渲染主框架
        container.innerHTML = `
          <div class="roche-plugin-forum">
            <div class="forum-header">
              <button id="forum-exit">&lt;</button>
              <div style="font-weight: bold; font-size: 18px; text-transform: uppercase;">FORUM</div>
              <button id="forum-menu">...</button>
            </div>
            
            <div class="forum-content" id="forum-feed">
              <!-- 帖子流 -->
            </div>
            
            <div class="forum-bottom-bar">
              <button id="nav-home">主页</button>
              <button id="nav-refresh" class="add-btn">↻</button>
              <button id="nav-user">主页(User)</button>
              <button id="nav-msg">私信</button>
            </div>

            <!-- 加载提示 -->
            <div class="loading-mask" id="loading-mask">
              <div>正在通过 API 生成时空交汇的电波...</div>
            </div>

            <!-- 设置模态框 -->
            <div class="forum-modal" id="modal-settings">
              <div class="forum-modal-content">
                <h3>设置项</h3>
                <div class="setting-group">
                  <h4>世界观设定</h4>
                  <textarea id="set-worldview">${settings.worldView}</textarea>
                </div>
                <div class="setting-group">
                  <h4>挂载世界书</h4>
                  <div id="wb-list" style="max-height: 100px; overflow-y: auto; border: 2px solid var(--primary-color); padding: 5px;">加载中...</div>
                </div>
                <div class="setting-group">
                  <h4>API 生成数量</h4>
                  <label>帖子数: <input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                  <label>评论数(每帖): <input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
                </div>
                <div style="text-align: right; margin-top: 10px;">
                  <button class="btn-cancel" id="settings-cancel">取消</button>
                  <button class="btn-primary" id="settings-save">保存</button>
                </div>
              </div>
            </div>

            <!-- 用户主页模态框 -->
            <div class="forum-modal" id="modal-user">
              <div class="forum-modal-content">
                <h3>用户主页 (User Profile)</h3>
                <div class="setting-group">
                  <h4>你的设定（角色可见）</h4>
                  <label>姓名: <input type="text" id="user-name" value="${userProfile.name}"></label>
                  <label>年龄: <input type="text" id="user-age" value="${userProfile.age}"></label>
                  <label>外貌特征: <textarea id="user-appearance" style="height: 60px;">${userProfile.appearance}</textarea></label>
                </div>
                <div class="setting-group">
                  <h4>界面美化</h4>
                  <label>主题线条颜色: <input type="color" id="theme-color" value="${settings.themeColor}"></label>
                </div>
                <div style="text-align: right; margin-top: 10px;">
                  <button class="btn-cancel" id="user-cancel">取消</button>
                  <button class="btn-primary" id="user-save">保存设定</button>
                </div>
              </div>
            </div>
            
          </div>
        `;

        const feedContainer = container.querySelector('#forum-feed');
        const loadingMask = container.querySelector('#loading-mask');

        // 渲染帖子
        const renderFeed = () => {
          feedContainer.innerHTML = '';
          if(posts.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center; margin-top:50px; font-weight:bold;">暂无电波，点击下方 ↻ 刷新生成</div>';
            return;
          }

          posts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            
            const commentsHtml = post.comments && post.comments.length > 0 
              ? `<div class="post-comments">` + post.comments.map(c => `<div class="comment-item"><span class="comment-author">@${c.author}:</span>${c.content}</div>`).join('') + `</div>`
              : '';

            div.innerHTML = `
              <div class="post-actions" data-id="${post.id}">X</div>
              <div class="post-author">@${post.author}</div>
              <div class="post-text collapsed">${post.content}</div>
              ${commentsHtml}
            `;
            
            // 点击展开/折叠全文
            div.querySelector('.post-text').onclick = (e) => {
              e.target.classList.toggle('collapsed');
            };

            // 删除帖子
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

        // 退出插件
        container.querySelector('#forum-exit').onclick = () => roche.ui.closeApp();

        // 私信占位
        container.querySelector('#nav-msg').onclick = () => roche.ui.toast("私信功能（仿 iMessage）开发中...");
        container.querySelector('#nav-home').onclick = () => renderFeed();

        // 加载世界书列表
        const loadWorldbooks = async () => {
          try {
            const categories = await roche.worldbook.list();
            const wbList = container.querySelector('#wb-list');
            if (!categories || categories.length === 0) {
              wbList.innerHTML = "暂无世界书分类";
              return;
            }
            wbList.innerHTML = categories.map(cat => `
              <div>
                <label>
                  <input type="checkbox" class="wb-check" value="${cat.id}" ${selectedWorldbooks.includes(cat.id) ? 'checked' : ''}> 
                  ${cat.name}
                </label>
              </div>
            `).join('');
          } catch(e) {
            console.error(e);
          }
        };

        // 设置菜单逻辑
        const modalSettings = container.querySelector('#modal-settings');
        container.querySelector('#forum-menu').onclick = async () => {
          await loadWorldbooks();
          modalSettings.style.display = 'flex';
        };

        container.querySelector('#settings-cancel').onclick = () => modalSettings.style.display = 'none';
        container.querySelector('#settings-save').onclick = async () => {
          settings.worldView = container.querySelector('#set-worldview').value;
          settings.postCount = parseInt(container.querySelector('#set-post-count').value) || 3;
          settings.commentCount = parseInt(container.querySelector('#set-comment-count').value) || 5;
          
          // 获取勾选的世界书
          selectedWorldbooks = Array.from(container.querySelectorAll('.wb-check:checked')).map(cb => cb.value);
          
          await roche.storage.set("forum_settings", settings);
          await roche.storage.set("forum_worldbooks", selectedWorldbooks);
          
          modalSettings.style.display = 'none';
          roche.ui.toast("设置已保存");
        };

        // 用户主页逻辑
        const modalUser = container.querySelector('#modal-user');
        container.querySelector('#nav-user').onclick = () => modalUser.style.display = 'flex';
        
        container.querySelector('#user-cancel').onclick = () => modalUser.style.display = 'none';
        container.querySelector('#user-save').onclick = async () => {
          userProfile.name = container.querySelector('#user-name').value;
          userProfile.age = container.querySelector('#user-age').value;
          userProfile.appearance = container.querySelector('#user-appearance').value;
          
          const newColor = container.querySelector('#theme-color').value;
          settings.themeColor = newColor;
          document.documentElement.style.setProperty('--primary-color', newColor);
          
          await roche.storage.set("forum_user", userProfile);
          await roche.storage.set("forum_settings", settings);
          
          modalUser.style.display = 'none';
          roche.ui.toast("用户主页设定已保存");
        };

        // ==========================
        // AI 自动生成帖子逻辑
        // ==========================
        container.querySelector('#nav-refresh').onclick = async () => {
          loadingMask.style.display = 'flex';
          
          try {
            // 1. 读取选中的世界书内容作为背景
            let wbText = "";
            for (let catId of selectedWorldbooks) {
              const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: "global" });
              if (entries && entries.length > 0) {
                wbText += entries.map(e => `${e.keys.join(',')}: ${e.content}`).join('\n') + "\n";
              }
            }

            // 2. 组装 AI Prompt
            const prompt = `
你现在是一个沉浸式论坛的模拟生成器。请严格按照以下世界观和规则，生成 ${settings.postCount} 篇帖子，每篇帖子带有 ${settings.commentCount} 条评论。

【规则与世界观】：
${settings.worldView}

【用户(User/“你”)的情报】(所有发帖人和评论区角色都可以认识该用户)：
姓名：${userProfile.name}
年龄：${userProfile.age}
外貌/特征：${userProfile.appearance}
(注：绝不能有角色扮演用户本人发帖，所有内容必须是其他角色发帖，围绕着用户或他们自己的日常)

【挂载的额外世界书背景】：
${wbText}

请直接输出一段合法的 JSON 数组，格式如下，不要包含任何 markdown 格式如 \`\`\`json，只要纯数组：
[
  {
    "author": "发帖角色名",
    "content": "帖子的正文内容（支持超长文字，请尽情展现角色对 user 的情感或者日常碎碎念，字数尽量多一点，展现情感细节）",
    "comments": [
      { "author": "评论角色名", "content": "评论内容" }
    ]
  }
]
`;

            const result = await roche.ai.chat({
              messages: [{ role: "user", content: prompt }],
              temperature: 0.8
            });

            // 尝试解析 JSON
            let rawText = result.text.trim();
            if (rawText.startsWith("```json")) rawText = rawText.replace(/```json/g, "");
            if (rawText.endsWith("```")) rawText = rawText.replace(/```/g, "");
            
            const generatedData = JSON.parse(rawText);

            if (Array.isArray(generatedData)) {
              // 将新生成的帖子加入最前面
              const newPosts = generatedData.map(item => ({
                id: crypto.randomUUID(),
                author: item.author || "未知角色",
                content: item.content || "",
                comments: item.comments || [],
                timestamp: Date.now()
              }));
              
              posts = [...newPosts, ...posts];
              await roche.storage.set("forum_posts", posts);
              renderFeed();
              roche.ui.toast("刷新成功，收到新的时空电波");
            } else {
              throw new Error("解析格式错误");
            }

          } catch(err) {
            console.error(err);
            roche.ui.toast("生成失败，请重试或检查 API 配置");
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
