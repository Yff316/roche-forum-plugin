window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.6.0",
  apps: [
    {
      id: "minimalist-forum-app",
      name: "论坛主页",
      icon: "chat",
      async mount(container, roche) {
        // 1. 初始化数据
        const defaultWorldView = `围绕着游戏/动漫发帖人就是角色本人发帖 如: 崩铁、原神、鸣潮、王者、斩神、诡秘之主、排球少年等。
角色会分享近日的日常/对user的心思（暗戳戳或明着表白/吃醋）。帖子可包含符合人设的颜文字和emoji（禁止使用🙄🙃😊😍😘😏😭😒！等过度夸张表情，可偶尔用🥺、♡、♪等）。
角色有概率分享日常生活图片，图片表现为一段文字描述（如[翻开照片：背面写着xxx/照片上是xxx]）。
评论区都是这个世界观里的人物。
$绝对禁止OOC，请严格根据官方人设生成！
$角色全洁从身到心都洁，只喜欢user/“你”一个人。
$绝对代入向禁止出现明确的主角原名，使用代称或最亲密的真名呼唤。`;

        let settings = (await roche.storage.get("forum_settings")) || {
          worldView: defaultWorldView,
          postCount: 3,
          commentCount: 5,
          themeStyle: "line", // "line", "water", "food"
          themeColor: "#000000",
          apiUrl: "https://api.openai.com/v1/chat/completions",
          apiKey: ""
        };

        let userProfile = (await roche.storage.get("forum_user")) || {
          forumName: "旅行者", 
          avatarUrl: "", // 头像废弃，仅用黑白
          name: "真名", 
          age: "未知",
          appearance: "神秘而迷人"
        };

        let selectedWorldbooks = (await roche.storage.get("forum_worldbooks")) || [];
        let posts = (await roche.storage.get("forum_posts")) || [];
        let crossoverPosts = (await roche.storage.get("forum_crossover_posts")) || [];

        // 2. 插入 CSS
        const style = document.createElement('style');
        style.id = "minimalist-forum-style";
        style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Optima&display=swap');
        
        :root {
          --primary-color: ${settings.themeColor};
          --bg-color: #fff;
          --card-bg: #fff;
          --border-radius: 0px;
          --box-shadow: 4px 4px 0 var(--primary-color);
          --border-style: 2px solid var(--primary-color);
          --font-text: 'Optima', 'Cormorant Garamond', 'PingFang SC', 'Microsoft YaHei', serif;
        }

        /* 水色主题 */
        .theme-water {
          --primary-color: #a3b8cc; 
          --bg-color: #f2f7fb;
          --card-bg: #ffffff;
          --border-radius: 16px;
          --box-shadow: 0 4px 15px rgba(163, 184, 204, 0.15);
          --border-style: 1px solid rgba(163, 184, 204, 0.4);
        }

        /* 淡粉食物系主题 */
        .theme-food {
          --primary-color: #fcaebf; 
          --bg-color: #fdf5f7;
          --card-bg: #ffffff;
          --border-radius: 24px;
          --box-shadow: 0 6px 20px rgba(252, 174, 191, 0.2);
          --border-style: 2px dashed #fcaebf;
        }

        .roche-plugin-forum {
          font-family: var(--font-text);
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-color);
          color: #333;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .forum-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-color);
          border-bottom: var(--border-style);
          z-index: 5;
        }
        
        .forum-header button {
          background: none; border: none; font-size: 24px; font-weight: bold; cursor: pointer; color: var(--primary-color); font-family: var(--font-text);
        }

        .page-view {
          flex: 1; overflow-y: auto; padding-bottom: 80px; display: none; background: var(--bg-color);
        }
        .page-view.active { display: block; }
        .forum-content { padding: 16px; }

        /* 帖子卡片 (主页) */
        .forum-post {
          background: var(--card-bg);
          padding: 16px; margin-bottom: 20px; border: var(--border-style); border-radius: var(--border-radius);
          box-shadow: var(--box-shadow); cursor: pointer; transition: transform 0.2s;
        }
        .forum-post:active { transform: scale(0.98); }
        .post-header { display: flex; align-items: center; margin-bottom: 8px; }
        
        /* 黑白无图案头像 */
        .bw-avatar {
          width: 36px; height: 36px; border-radius: 50%; margin-right: 12px; border: 1px solid #ddd;
          flex-shrink: 0;
        }
        .post-author { font-weight: bold; color: var(--primary-color); font-size: 16px; }
        .post-text { line-height: 1.8; white-space: pre-wrap; font-size: 15px; margin-bottom: 10px; }
        .post-text.collapsed { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .post-stats { margin-top: 10px; font-size: 13px; color: #888; font-family: var(--font-text); }

        /* 底部导航 (恢复大小) */
        .forum-bottom-bar {
          display: flex; justify-content: space-around; padding: 12px 10px; background: var(--bg-color);
          border-top: var(--border-style); position: absolute; bottom: 0; width: 100%; z-index: 5;
        }
        .forum-bottom-bar button {
          background: none; border: none; font-size: 16px; font-weight: bold; cursor: pointer; flex: 1; 
          color: var(--primary-color); font-family: var(--font-text); display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .forum-bottom-bar button.active { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }

        /* 表单与输入框 */
        .form-section { border: var(--border-style); padding: 16px; border-radius: var(--border-radius); margin-bottom: 16px; background: var(--card-bg); }
        .form-section h4 { margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid var(--primary-color); padding-bottom: 6px; }
        input[type="text"], input[type="number"], input[type="color"], textarea, select {
          width: 100%; margin: 8px 0; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; font-family: var(--font-text); outline: none; background: #fafafa;
        }
        .theme-water input, .theme-water textarea { border: 1px solid rgba(163,184,204,0.5); }
        .theme-food input, .theme-food textarea { border: 1px dashed #fcaebf; }
        
        .btn-primary {
          background: var(--primary-color); color: #fff; border: none; border-radius: 8px; padding: 12px 16px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px; font-size: 16px;
        }
        .btn-danger { background: #ff4d4f; color: #fff; border: none; border-radius: 8px; padding: 10px; margin-top: 8px; cursor: pointer; width: 100%; font-weight: bold; }

        /* 纯文字骨架详情页 */
        .detail-view {
          position: absolute; top:0; left:0; width:100%; height:100%; background: var(--bg-color); z-index: 10; display: none; flex-direction: column;
        }
        .detail-content { flex: 1; overflow-y: auto; padding: 20px; font-family: var(--font-text); font-size: 15px; line-height: 1.8; color: #333; }
        .skeleton-text { white-space: pre-wrap; word-break: break-all; }
        .skeleton-author { font-weight: bold; color: var(--primary-color); font-size: 16px; }
        .skeleton-stats { color: #888; font-size: 13px; margin: 10px 0; }
        .skeleton-comment { border-left: 2px solid var(--primary-color); padding-left: 10px; margin-top: 5px; margin-left: 10px; }
        
        .comment-input-area {
          display: flex; padding: 12px; background: var(--card-bg); border-top: var(--border-style);
        }
        .comment-input-area input { flex: 1; margin: 0; border-radius: 20px; padding: 10px 16px; border: 1px solid var(--primary-color); }
        .comment-input-area button { background: var(--primary-color); color: #fff; border: none; border-radius: 20px; padding: 0 20px; margin-left: 10px; font-weight: bold; }

        /* 加载动画 */
        .loading-mask { display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.95); z-index: 20; justify-content: center; align-items: center; flex-direction: column; }
        .spinner { width: 50px; height: 50px; border: 4px solid #eee; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
        .theme-food .spinner { border: none; width: auto; height: auto; font-size: 50px; animation: spin 2s linear infinite; }
        .theme-food .spinner::before { content: "🍥"; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* 装饰 */
        .decor { display: none; position: absolute; font-size: 24px; z-index: 0; pointer-events: none; opacity: 0.6; }
        .theme-water .decor-water { display: block; color: rgba(163, 184, 204, 0.4); }
        .theme-food .decor-food { display: block; }
        `;
        document.head.appendChild(style);

        // 3. 渲染主框架
        container.innerHTML = `
        <div class="roche-plugin-forum ${settings.themeStyle ? 'theme-' + settings.themeStyle : ''}" id="main-container">
          <!-- 装饰 -->
          <div class="decor decor-water" style="top:10%; left:5%;">♡</div>
          <div class="decor decor-water" style="top:40%; right:10%;">♪</div>
          <div class="decor decor-food" style="top:15%; left:8%;">🍡</div>
          <div class="decor decor-food" style="top:50%; right:10%;">🍧</div>
          <div class="decor decor-food" style="bottom:20%; left:12%;">🍬</div>

          <!-- 顶部 -->
          <div class="forum-header">
            <button id="forum-exit">&lt;</button>
            <div id="header-title" style="font-weight: bold; font-size: 18px; text-transform: uppercase;">FORUM</div>
            <button id="nav-refresh">↻</button>
          </div>

          <!-- 页面1：论坛流 -->
          <div id="view-feed" class="page-view active">
            <div style="padding: 10px 16px; border-bottom: var(--border-style); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; color: var(--primary-color);" id="feed-user-name">@${userProfile.forumName}</span>
              <button id="btn-user-post" class="btn-primary" style="width:auto; margin:0; padding:6px 12px; font-size:14px;">+ 发布</button>
            </div>
            <div class="forum-content" id="forum-feed-container"></div>
          </div>

          <!-- 页面2：大乱炖板块 -->
          <div id="view-crossover" class="page-view">
            <div style="padding: 10px 16px; border-bottom: var(--border-style); text-align: center; font-weight: bold; color: var(--primary-color);">
              🌌 跨界大乱炖
            </div>
            <div class="forum-content" id="crossover-feed-container"></div>
          </div>

          <!-- 页面3：私信 -->
          <div id="view-msg" class="page-view">
            <div style="padding: 50px; text-align: center; color: var(--primary-color); font-weight: bold;">私信功能开发中...</div>
          </div>

          <!-- 页面4：用户主页 (分区化) -->
          <div id="view-user" class="page-view">
            <div class="forum-content">
              <div class="form-section" style="text-align:center;">
                <!-- 黑白无图案头像 -->
                <div style="width:80px; height:80px; border-radius:50%; background:#333; margin:0 auto 10px;"></div>
                <h3 style="margin: 0; color: var(--primary-color);">@${userProfile.forumName}</h3>
              </div>
              
              <div class="form-section">
                <h4>公开论坛身份</h4>
                <label>网名 (@代号): <input type="text" id="user-forum-name" value="${userProfile.forumName}"></label>
              </div>

              <div class="form-section">
                <h4>私密代入人设 (角色可见)</h4>
                <label>真名/爱称: <input type="text" id="user-name" value="${userProfile.name}"></label>
                <label>年龄: <input type="text" id="user-age" value="${userProfile.age}"></label>
                <label>外貌特征: <textarea id="user-appearance">${userProfile.appearance}</textarea></label>
              </div>

              <button id="user-save" class="btn-primary">保存主页资料</button>
            </div>
          </div>

          <!-- 页面5：偏好设置与清理 -->
          <div id="view-settings" class="page-view">
            <div class="forum-content">
              <div class="form-section">
                <h4>全局主题美化</h4>
                <select id="theme-style">
                  <option value="line" ${settings.themeStyle==='line'?'selected':''}>经典复古：黑白立体线条</option>
                  <option value="water" ${settings.themeStyle==='water'?'selected':''}>唯美纯净：水色 ♡</option>
                  <option value="food" ${settings.themeStyle==='food'?'selected':''}>淡粉食物：少女心 🍥</option>
                </select>
                <div id="color-picker-wrap" style="display:${settings.themeStyle==='line'?'block':'none'};">
                  <label>线条颜色: <input type="color" id="theme-color" value="${settings.themeColor}"></label>
                </div>
              </div>

              <div class="form-section">
                <h4>世界观与API配置</h4>
                <textarea id="set-worldview" style="height:150px;">${settings.worldView}</textarea>
                <label>生成帖子数: <input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                <label>评论数: <input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
                <input type="text" id="set-api-url" value="${settings.apiUrl}" placeholder="API 地址">
                <input type="password" id="set-api-key" value="${settings.apiKey}" placeholder="API 密钥">
              </div>

              <div class="form-section">
                <h4>数据清理</h4>
                <button id="clear-home" class="btn-danger">删除主页所有帖子</button>
                <button id="clear-cross" class="btn-danger">删除板块所有帖子</button>
                <button id="clear-user" class="btn-danger">删除我发布的帖子</button>
              </div>

              <button id="settings-save" class="btn-primary">保存设置</button>
            </div>
          </div>

          <!-- 底部导航 (5个) -->
          <div class="forum-bottom-bar">
            <button id="nav-home" class="active"><span>主页</span></button>
            <button id="nav-crossover"><span>板块</span></button>
            <button id="nav-msg"><span>私信</span></button>
            <button id="nav-user-page"><span>我的</span></button>
            <button id="nav-settings"><span>设置</span></button>
          </div>

          <!-- 帖子详情页 (纯文字骨架风格) -->
          <div class="detail-view" id="view-post-detail">
            <div class="forum-header" style="box-shadow:none;">
              <button id="detail-back">&lt; 返回</button>
              <button id="detail-options" style="font-size:16px;">编辑/删除</button>
            </div>
            <div class="detail-content" id="detail-content-container"></div>
            <!-- 用户评论发送区 -->
            <div class="comment-input-area">
              <input type="text" id="detail-comment-input" placeholder="回复此贴...">
              <button id="detail-comment-send">发送</button>
            </div>
          </div>

          <!-- 发布动态弹窗 -->
          <div class="page-view" id="modal-post" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:15; display:none; flex-direction:column;">
            <div class="forum-header">
              <button id="post-cancel" style="font-size:16px;">取消</button>
              <div style="font-weight:bold;">发布动态</div>
              <button id="post-submit" style="font-size:16px;font-weight:bold;">发送</button>
            </div>
            <div style="padding:16px;">
              <textarea id="user-post-content" placeholder="分享你的日常..." style="height:150px;"></textarea>
            </div>
          </div>

          <!-- 加载动画 -->
          <div class="loading-mask" id="loading-mask">
            <div class="spinner"></div>
            <div style="font-weight:bold; color:var(--primary-color); font-size:16px; margin-top:10px;" id="loading-text">正在捕捉时空交汇的电波...</div>
          </div>
        </div>
        `;

        const mainContainer = container.querySelector('#main-container');
        const views = {
          feed: container.querySelector('#view-feed'),
          crossover: container.querySelector('#view-crossover'),
          msg: container.querySelector('#view-msg'),
          user: container.querySelector('#view-user'),
          settings: container.querySelector('#view-settings')
        };
        const navBtns = {
          home: container.querySelector('#nav-home'),
          crossover: container.querySelector('#nav-crossover'),
          msg: container.querySelector('#nav-msg'),
          user: container.querySelector('#nav-user-page'),
          settings: container.querySelector('#nav-settings')
        };
        const headerTitle = container.querySelector('#header-title');

        let currentMode = 'feed';

        const switchView = (viewName, title) => {
          Object.values(views).forEach(v => v.classList.remove('active'));
          views[viewName].classList.add('active');
          headerTitle.innerText = title;
          Object.values(navBtns).forEach(btn => btn.classList.remove('active'));
          navBtns[viewName === 'msg' ? 'msg' : viewName === 'user' ? 'user' : viewName === 'settings' ? 'settings' : viewName === 'crossover' ? 'crossover' : 'home'].classList.add('active');
          if (viewName === 'feed' || viewName === 'crossover') currentMode = viewName;
        };

        navBtns.home.onclick = () => { switchView('feed', 'FORUM'); renderFeed(); };
        navBtns.crossover.onclick = () => { switchView('crossover', 'CROSSOVER'); renderCrossoverFeed(); };
        navBtns.msg.onclick = () => switchView('msg', 'MESSAGES');
        navBtns.user.onclick = () => switchView('user', 'MY PROFILE');
        navBtns.settings.onclick = () => switchView('settings', 'SETTINGS');

        // 主题切换
        const themeSelect = container.querySelector('#theme-style');
        const colorWrap = container.querySelector('#color-picker-wrap');
        themeSelect.onchange = (e) => {
          mainContainer.className = 'roche-plugin-forum';
          if(e.target.value !== 'line') mainContainer.classList.add('theme-' + e.target.value);
          colorWrap.style.display = e.target.value === 'line' ? 'block' : 'none';
        };

        // 获取黑白颜色 (根据名字长度伪随机)
        const getBWColor = (name) => {
          return name.length % 2 === 0 ? '#333' : '#f5f5f5';
        };

        // 渲染列表
        const renderPostList = (containerEl, postDataList, isCrossover = false) => {
          containerEl.innerHTML = '';
          if(postDataList.length === 0) {
            containerEl.innerHTML = '<div style="text-align:center; margin-top:50px; font-weight:bold; color: var(--primary-color);">暂无动态，点击右上角 ↻ 刷新生成</div>';
            return;
          }
          postDataList.forEach(post => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            const bwColor = getBWColor(post.author);
            const likes = post.likes || Math.floor(Math.random()*1000);
            const stars = post.stars || Math.floor(Math.random()*500);
            const commentsCount = post.comments ? post.comments.length : 0;
            
            div.innerHTML = `
              <div class="post-header">
                <div class="bw-avatar" style="background:${bwColor}"></div>
                <div class="post-author">@${post.author}</div>
              </div>
              <div class="post-text collapsed">${post.content}</div>
              <div class="post-stats">——♡${likes} ★${stars} ＞${commentsCount}</div>
            `;
            div.onclick = () => openPostDetail(post.id, isCrossover);
            containerEl.appendChild(div);
          });
        };

        const feedContainer = container.querySelector('#forum-feed-container');
        const crossoverFeedContainer = container.querySelector('#crossover-feed-container');
        const renderFeed = () => renderPostList(feedContainer, posts, false);
        const renderCrossoverFeed = () => renderPostList(crossoverFeedContainer, crossoverPosts, true);

        // 纯文字骨架详情页
        const detailView = container.querySelector('#view-post-detail');
        const detailContent = container.querySelector('#detail-content-container');
        const commentInput = container.querySelector('#detail-comment-input');
        
        let currentViewingPostId = null;
        let isViewingCrossover = false;

        container.querySelector('#detail-back').onclick = () => { detailView.style.display = 'none'; };

        const openPostDetail = (id, crossover = false) => {
          currentViewingPostId = id;
          isViewingCrossover = crossover;
          const targetPosts = crossover ? crossoverPosts : posts;
          const post = targetPosts.find(p => p.id === id);
          if(!post) return;

          // 生成文字骨架
          const likes = post.likes || 128;
          const stars = post.stars || 45;
          const shares = post.comments ? post.comments.length : 0;
          
          let skeletonHtml = `
            <div class="skeleton-author">@${post.author}</div>
            <div class="skeleton-text" style="margin-top:10px;">${post.content}</div>
            <div class="skeleton-stats">——♡${likes} ★${stars} ＞${shares}</div>
            <div style="color:var(--primary-color);">|<br>|</div>
          `;

          if (post.comments && post.comments.length > 0) {
            post.comments.forEach(c => {
              // 模拟层级
              const indent = c.content.includes('@') ? 'margin-left:20px;' : '';
              skeletonHtml += `
                <div class="skeleton-comment" style="${indent}">
                  <span class="skeleton-author">@${c.author}</span><br>
                  <span class="skeleton-text">${c.content}</span>
                </div>
              `;
            });
          } else {
            skeletonHtml += `<div style="color:#888; margin-left:10px;">暂无评论</div>`;
          }

          detailContent.innerHTML = skeletonHtml;
          detailView.style.display = 'flex';
        };

        // 用户发送评论与 AI 召唤回复
        const loadingMask = container.querySelector('#loading-mask');
        const loadingText = container.querySelector('#loading-text');

        container.querySelector('#detail-comment-send').onclick = async () => {
          const text = commentInput.value.trim();
          if(!text) return;
          const targetPosts = isViewingCrossover ? crossoverPosts : posts;
          const post = targetPosts.find(p => p.id === currentViewingPostId);
          if(!post) return;

          // 用户自己的评论
          if(!post.comments) post.comments = [];
          post.comments.push({ author: userProfile.forumName, content: text });
          
          commentInput.value = '';
          openPostDetail(post.id, isViewingCrossover); // 先更新视图
          await roche.storage.set(isViewingCrossover ? "forum_crossover_posts" : "forum_posts", targetPosts);

          // 触发角色回复 (召唤机制)
          loadingText.innerText = "正在呼唤角色回复...";
          loadingMask.style.display = 'flex';
          try {
            const prompt = `你现在是论坛模拟器。用户（网名@${userProfile.forumName}，真名/爱称[${userProfile.name}]）刚刚在帖子下发表了评论。
原帖作者：@${post.author}
原帖内容：${post.content}
用户评论了：${text}
请扮演原帖作者或相关世界观角色，生成 1 到 2 条回复用户的评论。
要求：严格遵循人设，可以包含适当清冷唯美符号，如果被挑逗可以表现出符合人设的情感。
格式必须为合法 JSON 数组：[{"author":"角色名", "content":"@${userProfile.forumName} 回复内容"}]`;

            let rawText = "";
            if (settings.apiUrl && settings.apiKey) {
              const res = await fetch(settings.apiUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                body: JSON.stringify({ model: "gpt-4o", messages: [{role: "user", content: prompt}], temperature: 0.8 })
              });
              const data = await res.json(); rawText = data.choices[0].message.content;
            } else {
              const result = await roche.ai.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.8 });
              rawText = result.text;
            }

            rawText = rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1);
            const replies = JSON.parse(rawText);
            
            post.comments = post.comments.concat(replies);
            await roche.storage.set(isViewingCrossover ? "forum_crossover_posts" : "forum_posts", targetPosts);
            openPostDetail(post.id, isViewingCrossover);
          } catch(e) {
            roche.ui.toast("角色似乎不在先，未回复。");
          } finally {
            loadingMask.style.display = 'none';
          }
        };

        // 删除与编辑帖子
        const modalPost = container.querySelector('#modal-post');
        let editingPostId = null;

        container.querySelector('#detail-options').onclick = async () => {
          const targetPosts = isViewingCrossover ? crossoverPosts : posts;
          const post = targetPosts.find(p => p.id === currentViewingPostId);
          
          if (post.author === userProfile.forumName) {
            const act = await roche.ui.confirm({ title: "操作", message: "点击确认修改内容，点击取消删除帖子。" });
            if (act) {
              // 编辑
              editingPostId = post.id;
              container.querySelector('#user-post-content').value = post.content;
              modalPost.style.display = 'flex';
            } else {
              // 删除
              if(isViewingCrossover) crossoverPosts = crossoverPosts.filter(p => p.id !== post.id);
              else posts = posts.filter(p => p.id !== post.id);
              await roche.storage.set(isViewingCrossover ? "forum_crossover_posts" : "forum_posts", isViewingCrossover ? crossoverPosts : posts);
              detailView.style.display = 'none';
              if(isViewingCrossover) renderCrossoverFeed(); else renderFeed();
            }
          } else {
            const del = await roche.ui.confirm({ title: "删除", message: "确认删除这条角色帖子？" });
            if(del) {
              if(isViewingCrossover) crossoverPosts = crossoverPosts.filter(p => p.id !== post.id);
              else posts = posts.filter(p => p.id !== post.id);
              await roche.storage.set(isViewingCrossover ? "forum_crossover_posts" : "forum_posts", isViewingCrossover ? crossoverPosts : posts);
              detailView.style.display = 'none';
              if(isViewingCrossover) renderCrossoverFeed(); else renderFeed();
            }
          }
        };

        container.querySelector('#forum-exit').onclick = () => roche.ui.closeApp();

        // 发布动态
        container.querySelector('#btn-user-post').onclick = () => {
          editingPostId = null;
          container.querySelector('#user-post-content').value = '';
          modalPost.style.display = 'flex';
        };
        container.querySelector('#post-cancel').onclick = () => modalPost.style.display = 'none';
        container.querySelector('#post-submit').onclick = async () => {
          const content = container.querySelector('#user-post-content').value.trim();
          if(!content) return roche.ui.toast("内容不能为空");

          if (editingPostId) {
            const targetPosts = isViewingCrossover ? crossoverPosts : posts;
            const p = targetPosts.find(x => x.id === editingPostId);
            p.content = content;
            openPostDetail(p.id, isViewingCrossover);
          } else {
            const newPost = {
              id: crypto.randomUUID(), author: userProfile.forumName, content: content, comments: [], likes: 0, stars: 0
            };
            if(currentMode === 'feed') posts.unshift(newPost); else crossoverPosts.unshift(newPost);
          }
          
          await roche.storage.set("forum_posts", posts);
          await roche.storage.set("forum_crossover_posts", crossoverPosts);
          modalPost.style.display = 'none';
          if(currentMode === 'feed') renderFeed(); else renderCrossoverFeed();
          roche.ui.toast("发布成功！");
        };

        // 设置与清理数据
        container.querySelector('#settings-save').onclick = async () => {
          settings.themeStyle = themeSelect.value;
          settings.themeColor = container.querySelector('#theme-color').value;
          settings.worldView = container.querySelector('#set-worldview').value;
          settings.postCount = parseInt(container.querySelector('#set-post-count').value) || 3;
          settings.commentCount = parseInt(container.querySelector('#set-comment-count').value) || 5;
          settings.apiUrl = container.querySelector('#set-api-url').value;
          settings.apiKey = container.querySelector('#set-api-key').value;
          if(settings.themeStyle === 'line') document.documentElement.style.setProperty('--primary-color', settings.themeColor);
          await roche.storage.set("forum_settings", settings);
          roche.ui.toast("偏好设置已保存");
        };

        container.querySelector('#clear-home').onclick = async () => { posts = []; await roche.storage.set("forum_posts", posts); roche.ui.toast("主页已清空"); };
        container.querySelector('#clear-cross').onclick = async () => { crossoverPosts = []; await roche.storage.set("forum_crossover_posts", crossoverPosts); roche.ui.toast("板块已清空"); };
        container.querySelector('#clear-user').onclick = async () => {
          posts = posts.filter(p => p.author !== userProfile.forumName);
          crossoverPosts = crossoverPosts.filter(p => p.author !== userProfile.forumName);
          await roche.storage.set("forum_posts", posts); await roche.storage.set("forum_crossover_posts", crossoverPosts);
          roche.ui.toast("你的帖子已清空");
        };

        container.querySelector('#user-save').onclick = async () => {
          userProfile.forumName = container.querySelector('#user-forum-name').value;
          userProfile.name = container.querySelector('#user-name').value;
          userProfile.age = container.querySelector('#user-age').value;
          userProfile.appearance = container.querySelector('#user-appearance').value;
          await roche.storage.set("forum_user", userProfile);
          container.querySelector('#feed-user-name').innerText = `@${userProfile.forumName}`;
          roche.ui.toast("主页资料已保存！");
        };

        // 核心：刷新与生成
        container.querySelector('#nav-refresh').onclick = async () => {
          if (currentMode !== 'feed' && currentMode !== 'crossover') switchView('feed', 'FORUM');
          loadingText.innerText = "正在捕捉时空交汇的电波...";
          loadingMask.style.display = 'flex';
          try {
            let prompt = currentMode === 'feed' 
              ? `你现在是沉浸式论坛模拟器。生成 ${settings.postCount} 篇帖子，每篇带 ${settings.commentCount} 条评论。
【世界观】：\n${settings.worldView}
【用户情报】：网名 @${userProfile.forumName}。真名/爱称：[${userProfile.name}]。
【要求】：角色发帖有概率分享照片（用文字描述，如[翻开照片：背面写着...]）。禁止OOC，严禁夸张emoji，可用少量唯美符号。
请直接输出纯JSON数组：[{"author":"角色名", "content":"正文", "likes": 120, "stars": 45, "comments":[{"author":"评论人","content":"内容"}]}]`
              : `你现在是【世界观大乱炖】论坛模拟器。生成 ${settings.postCount} 篇帖子，每篇带 ${settings.commentCount} 条评论。
【世界观】：打破次元壁！崩铁、原神、动漫等角色跨界互动，会惊叹用户在各界都有马甲。
【用户】：网名 @${userProfile.forumName}。真名：[${userProfile.name}]。
【要求】：对话有趣，可带文字描述的照片卡片。输出格式同上纯JSON数组。`;

            let rawText = "";
            if (settings.apiUrl && settings.apiKey) {
              const res = await fetch(settings.apiUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                body: JSON.stringify({ model: "gpt-4o", messages: [{role: "user", content: prompt}], temperature: 0.85 })
              });
              const data = await res.json(); rawText = data.choices[0].message.content;
            } else {
              const result = await roche.ai.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.85 });
              rawText = result.text;
            }

            rawText = rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1);
            const generatedData = JSON.parse(rawText);
            const newPosts = generatedData.map(item => ({
              id: crypto.randomUUID(), author: item.author, content: item.content, 
              likes: item.likes || Math.floor(Math.random()*500), stars: item.stars || Math.floor(Math.random()*200),
              comments: item.comments || []
            }));
            
            if (currentMode === 'feed') { posts = [...newPosts, ...posts]; await roche.storage.set("forum_posts", posts); renderFeed(); }
            else { crossoverPosts = [...newPosts, ...crossoverPosts]; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCrossoverFeed(); }
            roche.ui.toast("捕捉到新的时空电波！");
          } catch(err) {
            roche.ui.toast("生成失败，请检查API或重试");
          } finally {
            loadingMask.style.display = 'none';
          }
        };

        renderFeed();
      },
      async unmount(container) {
        container.replaceChildren();
        const style = document.getElementById("minimalist-forum-style");
        if (style) style.remove();
      }
    }
  ]
});
