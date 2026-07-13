window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.5.0",
  apps: [
    {
      id: "minimalist-forum-app",
      name: "论坛主页",
      icon: "chat",
      async mount(container, roche) {
        // 1. 初始化数据
        const defaultWorldView = `围绕着游戏/动漫发帖人就是角色本人发帖 如: 崩铁、原神、鸣潮、王者、斩神、诡秘之主、排球少年等（不需要恋与深空）。
角色会分享近日的日常/对user的心思（暗戳戳表白和明着表白/吃醋）。帖子可包含符合人设的颜文字和emoji（禁止使用🙄🙃😊😍😘😏😭😒！等过度夸张的表情，多使用清冷或唯美的符号如♡、★、♪）。偶尔会分享生活照片。
评论区都是这个角色世界观里的人物会根据角色分享评论。
$禁止ooc，根据官方人设发帖
$角色全洁从身到心都洁，只喜欢user/“你”一个人，不论男女。
$绝对代入向禁止出现明确的主角原名，使用代称或最亲密的真名呼唤。`;

        let settings = (await roche.storage.get("forum_settings")) || {
          worldView: defaultWorldView,
          postCount: 3,
          commentCount: 5,
          themeStyle: "line", // "line" 或 "water"
          themeColor: "#000000",
          apiUrl: "https://api.openai.com/v1/chat/completions",
          apiKey: ""
        };

        let userProfile = (await roche.storage.get("forum_user")) || {
          forumName: "旅行者", // 论坛代号
          avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
          name: "真名", // 私密真名
          age: "未知",
          appearance: "神秘而迷人"
        };

        let selectedWorldbooks = (await roche.storage.get("forum_worldbooks")) || [];
        let posts = (await roche.storage.get("forum_posts")) || [];
        // 新增大乱炖板块的帖子存储
        let crossoverPosts = (await roche.storage.get("forum_crossover_posts")) || [];

        // 2. 插入 CSS (双主题支持与唯美字体)
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

          /* 水色主题变量覆盖 */
          .theme-water {
            --primary-color: #a3b8cc; /* 水色 */
            --bg-color: #f2f7fb;
            --card-bg: #ffffff;
            --border-radius: 16px;
            --box-shadow: 0 4px 15px rgba(163, 184, 204, 0.15);
            --border-style: 1px solid rgba(163, 184, 204, 0.4);
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

          /* 顶部导航统一字体 */
          .forum-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: var(--bg-color);
            border-bottom: var(--border-style);
            box-shadow: 0 2px 10px rgba(0,0,0,0.02);
            z-index: 5;
            font-family: var(--font-text);
          }

          .forum-header button {
            background: none;
            border: none;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            color: var(--primary-color);
            font-family: var(--font-text);
          }

          .page-view {
            flex: 1;
            overflow-y: auto;
            padding-bottom: 70px;
            display: none;
            background: var(--bg-color);
          }

          .page-view.active {
            display: block;
          }

          .forum-content {
            padding: 16px;
          }

          /* 帖子卡片 */
          .forum-post {
            background: var(--card-bg);
            padding: 16px;
            margin-bottom: 20px;
            border: var(--border-style);
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            position: relative;
            cursor: pointer;
            transition: transform 0.2s;
          }

          .forum-post:active {
            transform: scale(0.98);
          }

          .post-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }

          .post-avatar {
            width: 40px;
            height: 40px;
            border: var(--border-style);
            border-radius: 50%;
            margin-right: 12px;
            object-fit: cover;
          }

          .post-author {
            font-weight: bold;
            color: var(--primary-color);
            font-size: 16px;
            font-family: var(--font-text);
          }

          .post-text {
            line-height: 1.8;
            white-space: pre-wrap;
            font-size: 15px;
            margin-bottom: 10px;
          }

          .post-text.collapsed {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .post-image {
            max-width: 100%;
            border-radius: var(--border-radius);
            border: var(--border-style);
            margin-top: 10px;
            display: block;
          }

          .post-comment-count {
            margin-top: 10px;
            font-size: 13px;
            color: #888;
            text-align: right;
            font-family: var(--font-text);
          }

          /* 底部导航统一字体 */
          .forum-bottom-bar {
            display: flex;
            justify-content: space-around;
            padding: 10px;
            background: var(--bg-color);
            border-top: var(--border-style);
            position: absolute;
            bottom: 0;
            width: 100%;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
            z-index: 5;
            font-family: var(--font-text);
          }

          .forum-bottom-bar button {
            background: none;
            border: none;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            flex: 1;
            color: var(--primary-color);
            font-family: var(--font-text);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }

          .forum-bottom-bar button.active {
            text-decoration: underline;
            text-decoration-thickness: 2px;
            text-underline-offset: 4px;
          }

          /* 表单与输入框 */
          .form-group {
            margin-bottom: 16px;
            padding: 0 16px;
          }

          .form-group h4 {
            margin-bottom: 8px;
            border-bottom: 1px solid var(--primary-color);
            display: inline-block;
            font-family: var(--font-text);
            padding-bottom: 4px;
          }

          input[type="text"], input[type="number"], input[type="color"], textarea, select {
            width: 100%;
            margin: 8px 0;
            padding: 12px;
            border: var(--border-style);
            border-radius: var(--border-radius);
            box-sizing: border-box;
            font-family: var(--font-text);
            outline: none;
            background: var(--card-bg);
          }

          textarea {
            height: 90px;
            resize: vertical;
          }

          .btn-primary {
            background: var(--primary-color);
            color: #fff;
            border: var(--border-style);
            border-radius: var(--border-radius);
            padding: 12px 16px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
            font-family: var(--font-text);
            text-transform: uppercase;
          }

          .theme-water .btn-primary {
            background: #a3b8cc;
            color: #fff;
            border: none;
          }

          .btn-secondary {
            background: var(--bg-color);
            color: var(--primary-color);
            border: var(--border-style);
            border-radius: var(--border-radius);
            padding: 8px 12px;
            font-weight: bold;
            cursor: pointer;
            font-size: 14px;
            font-family: var(--font-text);
          }

          /* 仿 Telegram 详情页 */
          .detail-view {
            position: absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            background: #e5e5ea; /* Telegram 聊天背景色 */
            z-index: 10;
            display: none;
            flex-direction: column;
          }

          .theme-water .detail-view {
            background: #f2f7fb;
          }

          .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: var(--bg-color);
            border-bottom: var(--border-style);
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }

          .detail-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          /* TG 风格主帖（气泡左侧/居中偏大） */
          .tg-main-post {
            background: #fff;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            align-self: center;
            width: 95%;
            max-width: 400px;
          }

          .tg-main-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }

          .tg-avatar {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            margin-right: 12px;
            object-fit: cover;
          }

          .tg-author {
            font-weight: bold;
            color: var(--primary-color);
            font-size: 16px;
          }

          .tg-text {
            font-size: 15px;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          /* TG 风格评论气泡 */
          .tg-comment {
            display: flex;
            gap: 10px;
            align-self: flex-start;
            max-width: 85%;
          }

          .tg-comment-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
          }

          .tg-comment-bubble {
            background: #fff;
            padding: 10px 14px;
            border-radius: 18px;
            border-top-left-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            position: relative;
          }

          .tg-comment-author {
            font-weight: bold;
            color: var(--primary-color);
            font-size: 13px;
            margin-bottom: 4px;
            display: block;
          }

          .tg-comment-text {
            font-size: 15px;
            line-height: 1.4;
            color: #000;
          }

          /* 加载动画 */
          .loading-mask {
            display: none;
            position: absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            background: rgba(255,255,255,0.9);
            z-index: 20;
            justify-content: center;
            align-items: center;
            flex-direction: column;
          }

          .theme-water .loading-mask {
            background: rgba(242,247,251,0.9);
          }

          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #eee;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-text {
            font-weight: bold;
            font-size: 16px;
            font-family: var(--font-text);
            color: var(--primary-color);
          }

          /* 装饰 */
          .water-decor {
            display: none;
            position: absolute;
            font-size: 24px;
            color: rgba(163, 184, 204, 0.4);
            z-index: 0;
            pointer-events: none;
          }

          .theme-water .water-decor {
            display: block;
          }
        `;
        document.head.appendChild(style);

        // 3. 渲染主框架
        container.innerHTML = `
          <div class="roche-plugin-forum ${settings.themeStyle === 'water' ? 'theme-water' : ''}" id="main-container">
            <div class="water-decor" style="top:10%; left:5%;">♡</div>
            <div class="water-decor" style="top:40%; right:10%;">♡</div>
            <div class="water-decor" style="bottom:20%; left:15%;">♪</div>

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
                <button id="btn-user-post" class="btn-secondary">+ 发布动态</button>
              </div>
              <div class="forum-content" id="forum-feed-container"></div>
            </div>

            <!-- 页面2：大乱炖板块 -->
            <div id="view-crossover" class="page-view">
              <div style="padding: 10px 16px; border-bottom: var(--border-style); text-align: center; font-weight: bold; color: var(--primary-color);">
                🔥 跨界大乱炖专区
              </div>
              <div class="forum-content" id="crossover-feed-container"></div>
            </div>

            <!-- 页面3：私信 (暂位) -->
            <div id="view-msg" class="page-view">
              <div style="padding: 50px; text-align: center; color: var(--primary-color); font-weight: bold;">
                私信功能开发中...
              </div>
            </div>

            <!-- 页面4：用户主页 -->
            <div id="view-user" class="page-view">
              <div style="padding: 20px 16px; text-align: center; border-bottom: var(--border-style);">
                <img id="user-avatar-preview" src="${userProfile.avatarUrl}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--primary-color); object-fit: cover; margin-bottom: 10px;">
                <h3 style="margin: 0; color: var(--primary-color); font-family: var(--font-text);">@${userProfile.forumName}</h3>
              </div>
              <div class="form-group" style="margin-top: 20px;">
                <h4>公开身份 (论坛代号)</h4>
                <label>论坛网名 (@代号): <input type="text" id="user-forum-name" value="${userProfile.forumName}"></label>
                <label>头像链接: <input type="text" id="user-avatar-url" value="${userProfile.avatarUrl}"></label>
                <input type="file" id="user-avatar-file" accept="image/*" style="font-size:12px;">
              </div>
              <div class="form-group">
                <h4>私密人设 (角色对你的爱称与真名)</h4>
                <label>真名/亲密称呼: <input type="text" id="user-name" value="${userProfile.name}" placeholder="如：宝宝、小X"></label>
                <label>年龄: <input type="text" id="user-age" value="${userProfile.age}"></label>
                <label>外貌特征: <textarea id="user-appearance">${userProfile.appearance}</textarea></label>
              </div>
              <div class="form-group">
                <button id="user-save" class="btn-primary">保存人设</button>
              </div>
            </div>

            <!-- 页面5：偏好设置 (移到最右边) -->
            <div id="view-settings" class="page-view">
              <div class="form-group" style="margin-top: 16px;">
                <h4>全局主题美化</h4>
                <select id="theme-style">
                  <option value="line" ${settings.themeStyle==='line'?'selected':''}>经典复古：黑白立体线条</option>
                  <option value="water" ${settings.themeStyle==='water'?'selected':''}>唯美纯净：水色 ♡</option>
                </select>
                <div id="color-picker-wrap" style="display:${settings.themeStyle==='line'?'block':'none'};">
                  <label>线条颜色: <input type="color" id="theme-color" value="${settings.themeColor}"></label>
                </div>
              </div>
              <div class="form-group">
                <h4>世界观设定</h4>
                <textarea id="set-worldview">${settings.worldView}</textarea>
              </div>
              <div class="form-group">
                <h4>挂载世界书</h4>
                <div id="wb-list" style="max-height: 120px; overflow-y: auto; border: var(--border-style); padding: 10px; border-radius: var(--border-radius);">加载中...</div>
              </div>
              <div class="form-group">
                <h4>API 生成配置</h4>
                <label>每次生成帖子数: <input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                <label>每帖默认评论数: <input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
              </div>
              <div class="form-group">
                <h4>独立 API 设置</h4>
                <label>API 地址: <input type="text" id="set-api-url" value="${settings.apiUrl}"></label>
                <label>API 密钥: <input type="text" id="set-api-key" value="${settings.apiKey}"></label>
                <button id="btn-test-api" class="btn-secondary" style="width: 100%; margin-top: 5px;">测试连接</button>
              </div>
              <div class="form-group">
                <button id="settings-save" class="btn-primary">保存设置</button>
              </div>
            </div>

            <!-- 新版底部导航 (5个按钮) -->
            <div class="forum-bottom-bar">
              <button id="nav-home" class="active"><span>主页</span></button>
              <button id="nav-crossover"><span>板块</span></button>
              <button id="nav-msg"><span>私信</span></button>
              <button id="nav-user-page"><span>我的</span></button>
              <button id="nav-settings"><span>设置</span></button>
            </div>

            <!-- 帖子详情页 (仿 Telegram 风格) -->
            <div class="detail-view" id="view-post-detail">
              <div class="detail-header">
                <button id="detail-back" style="background:none;border:none;font-size:24px;color:var(--primary-color);cursor:pointer;font-family:var(--font-text);">&lt; 返回</button>
                <div style="font-weight:bold; font-family:var(--font-text); color:var(--primary-color);">Replies</div>
                <button id="detail-options" style="background:none;border:none;font-size:20px;color:var(--primary-color);cursor:pointer;font-family:var(--font-text);">...</button>
              </div>
              <div class="detail-content" id="detail-content-container"></div>
            </div>

            <!-- 发布动态弹窗 -->
            <div class="page-view" id="modal-post" style="position:absolute; top:0; left:0; width:100%; height:100%; background:var(--bg-color); z-index:15; display:none; flex-direction:column;">
              <div class="detail-header">
                <button id="post-cancel" style="background:none;border:none;font-size:16px;color:var(--primary-color);font-family:var(--font-text);">取消</button>
                <div style="font-weight:bold;font-family:var(--font-text);">发布动态</div>
                <button id="post-submit" style="background:none;border:none;font-size:16px;font-weight:bold;color:var(--primary-color);font-family:var(--font-text);">发送</button>
              </div>
              <div style="padding:16px;">
                <textarea id="user-post-content" placeholder="分享你的日常..."></textarea>
                <input type="file" id="post-image-file" accept="image/*" style="margin-top:10px;">
                <img id="post-image-preview" style="max-width:100%; margin-top:10px; display:none; border-radius:var(--border-radius);">
              </div>
            </div>

            <!-- 加载动画 -->
            <div class="loading-mask" id="loading-mask">
              <div class="spinner"></div>
              <div class="loading-text">正在捕捉时空交汇的电波...</div>
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

        // 当前所处的主页面（feed 或 crossover），用于刷新时判断调用哪个 Prompt
        let currentMode = 'feed'; 

        const switchView = (viewName, title) => {
          Object.values(views).forEach(v => v.classList.remove('active'));
          views[viewName].classList.add('active');
          headerTitle.innerText = title;
          Object.values(navBtns).forEach(btn => btn.classList.remove('active'));
          navBtns[viewName === 'msg' ? 'msg' : viewName === 'user' ? 'user' : viewName === 'settings' ? 'settings' : viewName === 'crossover' ? 'crossover' : 'home'].classList.add('active');
          
          if (viewName === 'feed' || viewName === 'crossover') {
            currentMode = viewName;
          }
        };

        navBtns.home.onclick = () => { switchView('feed', 'FORUM'); renderFeed(); };
        navBtns.crossover.onclick = () => { switchView('crossover', 'CROSSOVER'); renderCrossoverFeed(); };
        navBtns.msg.onclick = () => switchView('msg', 'MESSAGES');
        navBtns.user.onclick = () => switchView('user', 'MY PROFILE');
        navBtns.settings.onclick = async () => { await loadWorldbooks(); switchView('settings', 'SETTINGS'); };

        // 主题切换
        const themeSelect = container.querySelector('#theme-style');
        const colorWrap = container.querySelector('#color-picker-wrap');
        themeSelect.onchange = (e) => {
          if(e.target.value === 'water') {
            mainContainer.classList.add('theme-water');
            colorWrap.style.display = 'none';
          } else {
            mainContainer.classList.remove('theme-water');
            colorWrap.style.display = 'block';
          }
        };

        const fileToBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = e => reject(e);
        });

        // 通用渲染帖子列表函数
        const renderPostList = (containerEl, postDataList, isCrossover = false) => {
          containerEl.innerHTML = '';
          if(postDataList.length === 0) {
            containerEl.innerHTML = '<div style="text-align:center; margin-top:50px; font-weight:bold; color: var(--primary-color);">暂无动态，点击右上角 ↻ 刷新生成</div>';
            return;
          }
          postDataList.forEach(post => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            const avatarHtml = post.avatar ? `<img src="${post.avatar}" class="post-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'">` : `<div class="post-avatar" style="display:inline-block; background:var(--primary-color);"></div>`;
            const imageHtml = post.imageBase64 ? `<img src="${post.imageBase64}" class="post-image">` : '';
            const commentCount = post.comments ? post.comments.length : 0;
            div.innerHTML = `
              <div class="post-header">
                ${avatarHtml}
                <div class="post-author">@${post.author}</div>
              </div>
              <div class="post-text collapsed">${post.content}</div>
              ${imageHtml}
              <div class="post-comment-count">♡ ${commentCount} 条回复</div>
            `;
            div.onclick = () => openPostDetail(post.id, isCrossover);
            containerEl.appendChild(div);
          });
        };

        const feedContainer = container.querySelector('#forum-feed-container');
        const crossoverFeedContainer = container.querySelector('#crossover-feed-container');

        const renderFeed = () => renderPostList(feedContainer, posts, false);
        const renderCrossoverFeed = () => renderPostList(crossoverFeedContainer, crossoverPosts, true);

        // Telegram 风格帖子详情页
        const detailView = container.querySelector('#view-post-detail');
        const detailContent = container.querySelector('#detail-content-container');
        let currentViewingPostId = null;
        let isViewingCrossover = false;

        container.querySelector('#detail-back').onclick = () => {
          detailView.style.display = 'none';
        };

        const openPostDetail = (id, crossover = false) => {
          currentViewingPostId = id;
          isViewingCrossover = crossover;
          const targetPosts = crossover ? crossoverPosts : posts;
          const post = targetPosts.find(p => p.id === id);
          if(!post) return;

          const avatarHtml = post.avatar ? `<img src="${post.avatar}" class="tg-avatar">` : `<div class="tg-avatar" style="background:var(--primary-color);"></div>`;
          const imageHtml = post.imageBase64 ? `<img src="${post.imageBase64}" class="post-image" style="margin-top:10px;">` : '';
          
          let commentsHtml = '';
          if (post.comments && post.comments.length > 0) {
            commentsHtml = post.comments.map(c => {
              const cAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.author}`;
              return `
                <div class="tg-comment">
                  <img src="${cAvatar}" class="tg-comment-avatar">
                  <div class="tg-comment-bubble">
                    <span class="tg-comment-author">${c.author}</span>
                    <span class="tg-comment-text">${c.content}</span>
                  </div>
                </div>
              `;
            }).join('');
          } else {
            commentsHtml = '<div style="text-align:center; color:#888; margin-top:20px;">暂无回复</div>';
          }

          detailContent.innerHTML = `
            <!-- 主帖 -->
            <div class="tg-main-post">
              <div class="tg-main-header">
                ${avatarHtml}
                <div class="tg-author">${post.author}</div>
              </div>
              <div class="tg-text">${post.content}</div>
              ${imageHtml}
            </div>
            <!-- 评论区 -->
            <div style="font-weight:bold; color:var(--primary-color); margin-top:10px;">Replies</div>
            ${commentsHtml}
          `;
          detailView.style.display = 'flex';
        };

        // 删除选项
        container.querySelector('#detail-options').onclick = async () => {
          const confirmDel = await roche.ui.confirm({ title: "操作", message: "确认删除这条帖子吗？" });
          if(confirmDel) {
            if (isViewingCrossover) {
              crossoverPosts = crossoverPosts.filter(p => p.id !== currentViewingPostId);
              await roche.storage.set("forum_crossover_posts", crossoverPosts);
              renderCrossoverFeed();
            } else {
              posts = posts.filter(p => p.id !== currentViewingPostId);
              await roche.storage.set("forum_posts", posts);
              renderFeed();
            }
            detailView.style.display = 'none';
          }
        };

        renderFeed();

        container.querySelector('#forum-exit').onclick = () => roche.ui.closeApp();

        // 用户自己发帖
        const modalPost = container.querySelector('#modal-post');
        let currentPostImage = null;
        container.querySelector('#btn-user-post').onclick = () => {
          container.querySelector('#user-post-content').value = '';
          currentPostImage = null;
          container.querySelector('#post-image-preview').style.display = 'none';
          modalPost.style.display = 'flex';
        };
        container.querySelector('#post-cancel').onclick = () => modalPost.style.display = 'none';
        container.querySelector('#post-image-file').onchange = async (e) => {
          if (e.target.files && e.target.files[0]) {
            currentPostImage = await fileToBase64(e.target.files[0]);
            container.querySelector('#post-image-preview').src = currentPostImage;
            container.querySelector('#post-image-preview').style.display = 'block';
          }
        };
        container.querySelector('#post-submit').onclick = async () => {
          const content = container.querySelector('#user-post-content').value.trim();
          if(!content && !currentPostImage) { roche.ui.toast("内容不能为空"); return; }
          
          const newPost = {
            id: crypto.randomUUID(),
            author: userProfile.forumName || "未知",
            avatar: userProfile.avatarUrl,
            content: content,
            imageBase64: currentPostImage,
            comments: [],
            timestamp: Date.now()
          };
          
          posts.unshift(newPost);
          await roche.storage.set("forum_posts", posts);
          modalPost.style.display = 'none';
          renderFeed();
          roche.ui.toast("发布成功！");
        };

        // 设置保存
        container.querySelector('#settings-save').onclick = async () => {
          settings.themeStyle = themeSelect.value;
          settings.themeColor = container.querySelector('#theme-color').value;
          settings.worldView = container.querySelector('#set-worldview').value;
          settings.postCount = parseInt(container.querySelector('#set-post-count').value) || 3;
          settings.commentCount = parseInt(container.querySelector('#set-comment-count').value) || 5;
          settings.apiUrl = container.querySelector('#set-api-url').value;
          settings.apiKey = container.querySelector('#set-api-key').value;
          selectedWorldbooks = Array.from(container.querySelectorAll('.wb-check:checked')).map(cb => cb.value);
          
          if(settings.themeStyle === 'line') {
            document.documentElement.style.setProperty('--primary-color', settings.themeColor);
          }
          await roche.storage.set("forum_settings", settings);
          await roche.storage.set("forum_worldbooks", selectedWorldbooks);
          roche.ui.toast("偏好设置已保存");
        };

        container.querySelector('#user-avatar-file').onchange = async (e) => {
          if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            container.querySelector('#user-avatar-url').value = base64;
            container.querySelector('#user-avatar-preview').src = base64;
          }
        };

        container.querySelector('#user-save').onclick = async () => {
          userProfile.forumName = container.querySelector('#user-forum-name').value;
          userProfile.avatarUrl = container.querySelector('#user-avatar-url').value;
          userProfile.name = container.querySelector('#user-name').value;
          userProfile.age = container.querySelector('#user-age').value;
          userProfile.appearance = container.querySelector('#user-appearance').value;
          await roche.storage.set("forum_user", userProfile);
          container.querySelector('#feed-user-name').innerText = `@${userProfile.forumName}`;
          container.querySelector('#user-avatar-preview').src = userProfile.avatarUrl;
          roche.ui.toast("人设设定已保存！");
        };

        const loadWorldbooks = async () => {
          try {
            const categories = await roche.worldbook.list();
            const wbList = container.querySelector('#wb-list');
            if (!categories || categories.length === 0) {
              wbList.innerHTML = "暂无数据"; return;
            }
            wbList.innerHTML = categories.map(cat => `
              <div><label><input type="checkbox" class="wb-check" value="${cat.id}" ${selectedWorldbooks.includes(cat.id)?'checked':''}> ${cat.name}</label></div>
            `).join('');
          } catch(e) {}
        };

        container.querySelector('#btn-test-api').onclick = async () => {
          roche.ui.toast("测试中...");
          try {
            const res = await fetch(container.querySelector('#set-api-url').value, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${container.querySelector('#set-api-key').value}` },
              body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{role: "user", content: "hi"}], max_tokens: 5 })
            });
            if(res.ok) roche.ui.toast("连接成功！");
            else roche.ui.toast("连接失败");
          } catch(e) { roche.ui.toast("网络错误"); }
        };

        // 核心：AI 自动生成帖子
        const loadingMask = container.querySelector('#loading-mask');
        container.querySelector('#nav-refresh').onclick = async () => {
          if (currentMode !== 'feed' && currentMode !== 'crossover') {
            switchView('feed', 'FORUM');
          }
          
          loadingMask.style.display = 'flex';
          try {
            let wbText = "";
            for (let catId of selectedWorldbooks) {
              const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: "global" });
              if (entries && entries.length > 0) wbText += entries.map(e => `${e.keys.join(',')}: ${e.content}`).join('\\n') + "\\n";
            }

            // 根据当前模式区分 Prompt
            let prompt = "";
            if (currentMode === 'feed') {
              prompt = `你现在是一个沉浸式论坛的模拟生成器。生成 ${settings.postCount} 篇帖子，每篇带 ${settings.commentCount} 条评论。
【规则与世界观】：\n${settings.worldView}
【用户情报】：公开网名 @${userProfile.forumName}。发帖角色可以根据关系亲密程度，喊用户的真名/爱称：[${userProfile.name}]。年龄：${userProfile.age}，外貌：${userProfile.appearance}。
【要求】：角色可以加入清冷唯美的符号或颜文字(如♡、♪)。若发照片则 imageBase64 填 "https://picsum.photos/400/300?random="加随机数，否则留空。
【世界书背景】：\n${wbText}
请直接输出纯JSON数组：[{"author":"角色名", "avatar":"", "content":"正文", "imageBase64":"", "comments":[{"author":"评论人","content":"回复内容"}]}]`;
            } else {
              prompt = `你现在是一个【世界观大乱炖】论坛的模拟器。生成 ${settings.postCount} 篇跨界帖子，每篇带 ${settings.commentCount} 条评论。
【世界观设定】：打破次元壁！如崩铁角色与原神、动漫角色在同一个板块交流。他们会互相串门，产生奇妙对话。
【关于用户】：公开网名 @${userProfile.forumName}。用户在不同世界有不同“马甲”，角色们聊天时会惊叹“原来你在那里也有马甲！”，或者因此吃醋争宠。他们会提及对用户的特殊情感。真名/爱称：[${userProfile.name}]。
【要求】：对话有趣、跨界碰撞。可带唯美符号。照片同上。
【世界书背景】：\n${wbText}
请直接输出纯JSON数组：[{"author":"角色名", "avatar":"", "content":"跨界正文", "imageBase64":"", "comments":[{"author":"其他世界的评论人","content":"跨界回复"}]}]`;
            }

            let rawText = "";
            if (settings.apiUrl && settings.apiKey) {
              const res = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                body: JSON.stringify({ model: "gpt-4o", messages: [{role: "user", content: prompt}], temperature: 0.85 })
              });
              const data = await res.json();
              rawText = data.choices[0].message.content;
            } else {
              const result = await roche.ai.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.85 });
              rawText = result.text;
            }

            rawText = rawText.trim();
            const startIdx = rawText.indexOf('[');
            const endIdx = rawText.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1) rawText = rawText.substring(startIdx, endIdx + 1);
            
            const generatedData = JSON.parse(rawText);
            if (Array.isArray(generatedData)) {
              const newPosts = generatedData.map(item => ({
                id: crypto.randomUUID(),
                author: item.author || "未知",
                avatar: item.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.author}`,
                content: item.content || "",
                imageBase64: item.imageBase64 || "",
                comments: item.comments || [],
                timestamp: Date.now()
              }));
              
              if (currentMode === 'feed') {
                posts = [...newPosts, ...posts];
                await roche.storage.set("forum_posts", posts);
                renderFeed();
              } else {
                crossoverPosts = [...newPosts, ...crossoverPosts];
                await roche.storage.set("forum_crossover_posts", crossoverPosts);
                renderCrossoverFeed();
              }
              roche.ui.toast("捕捉到新的时空电波！");
            } else throw new Error("解析格式错误");
          } catch(err) {
            console.error(err);
            roche.ui.toast("生成失败，请检查API或重试");
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
