window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.9.2",
  apps: [{
    id: "minimalist-forum-app",
    name: "论坛主页",
    icon: "chat",
    async mount(container, roche) {
      const SYSTEM_WORLDVIEW = `这是一个乙女向论坛，发帖角色都是游戏、动漫、小说（禁耽美小说）的人物角色。
发帖主题随机，请根据角色本身的人设、性格、日常来自由决定帖子主题（可以参考：日常生活、小烦恼、工作、小幸运、对user暗戳戳的思念/表白/吃醋，但不限于此，可以发任何符合角色人设的内容，要有活人感）。
$禁止OOC，严格遵循官方人设。
$角色全洁，从身到心，只喜欢user一人，不论男女。
$绝对代入向，禁止出现明确的主角原名，使用代称或亲密称呼。
$评论区禁止出现user本人，user就是主角本人。
$禁止发图片，禁止使用[翻开照片：xxx]这种描述。
要有活人感，emoji由你根据角色人设自行判断是否使用（🤤😂🙄🤣😭😉都允许，但不要每帖都加）。`;

      const defaultWorldView = `围绕着游戏/动漫发帖人就是角色本人发帖
如: 崩铁、原神、鸣潮、王者、排球少年、蓝色监狱、咒术回战、夏目友人帐、银魂、鬼灭之刃等不是作者设定为耽美的高热度游戏动漫角色。
角色会分享近日的日常/对user的心思（暗戳戳表白和明着表白/吃醋）。
评论区都是这个角色世界观里的人物会根据角色分享评论。
$禁止ooc，根据官方人设发帖。
$角色全洁从身到心都洁，只喜欢user/"你"一个人，不论男女角色。
$绝对代入向禁止出现明确的主角原名，使用"开拓者""旅行者"或更亲密的称呼。
$评论禁止出现开拓者本人/旅行者本人！user就是开拓者/旅行者！`;

      let settings = (await roche.storage.get("forum_settings")) || {
        worldView: defaultWorldView,
        postCount: 3,
        commentCount: 5,
        themeStyle: "line",
        themeColor: "#000000",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "",
        apiModel: "gpt-4o",
        useRocheAI: true,
        memoryReadCount: 5,
        recentPostReadCount: 5
      };

      let userProfile = (await roche.storage.get("forum_user")) || {
        forumName: "旅行者",
        avatarUrl: "",
        name: "真名",
        age: "未知",
        appearance: "神秘而迷人"
      };

      let selectedWorldbooks = (await roche.storage.get("forum_worldbooks")) || [];
      let posts = (await roche.storage.get("forum_posts")) || [];
      let crossoverPosts = (await roche.storage.get("forum_crossover_posts")) || [];
      let ifPosts = (await roche.storage.get("forum_if_posts")) || [];
      let memoryFeed = (await roche.storage.get("forum_memory_feed")) || [];
      let memoryCross = (await roche.storage.get("forum_memory_cross")) || [];
      let memoryIf = (await roche.storage.get("forum_memory_if")) || [];
      let favorites = (await roche.storage.get("forum_favorites")) || [];

      const style = document.createElement('style');
      style.id = "minimalist-forum-style";
      style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap');
        :root {
          --primary-color: ${settings.themeColor};
          --bg-color: #fff;
          --card-bg: #fff;
          --border-radius: 0;
          --border-style: 2px solid var(--primary-color);
          --box-shadow: 4px 4px 0 var(--primary-color);
          --avatar-color: #000;
          --font-text: 'Optima','Cormorant Garamond','PingFang SC','Microsoft YaHei',serif;
        }
        .theme-water {
          --primary-color: #a3b8cc;
          --bg-color: #f2f7fb;
          --border-radius: 16px;
          --border-style: 1px solid rgba(163,184,204,0.4);
          --box-shadow: 0 4px 15px rgba(163,184,204,0.15);
          --avatar-color: #fff;
        }
        .theme-food {
          --primary-color: #fcaebf;
          --bg-color: #fdf5f7;
          --border-radius: 24px;
          --border-style: 2px dashed #fcaebf;
          --box-shadow: 0 6px 20px rgba(252,174,191,0.2);
          --avatar-color: #fff;
        }
        .theme-green {
          --primary-color: #7daa7d;
          --bg-color: #f3f9f3;
          --border-radius: 16px;
          --border-style: 1px solid rgba(125,170,125,0.45);
          --box-shadow: 0 4px 15px rgba(125,170,125,0.18);
          --avatar-color: #fff;
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
          padding-bottom: 90px;
          display: none;
          background: var(--bg-color);
        }
        .page-view.active { display: block; }
        .forum-content { padding: 16px; }
        .forum-post {
          background: var(--card-bg);
          padding: 16px;
          margin-bottom: 20px;
          border: var(--border-style);
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          cursor: pointer;
        }
        .post-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .post-author {
          font-weight: bold;
          color: var(--primary-color);
          font-size: 16px;
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
        .post-stats { margin-top: 10px; font-size: 13px; color: #888; }
        .forum-bottom-bar {
          display: flex;
          justify-content: space-around;
          padding: 18px 10px;
          background: var(--bg-color);
          border-top: var(--border-style);
          position: absolute;
          bottom: 0;
          width: 100%;
          z-index: 5;
        }
        .forum-bottom-bar button {
          background: none;
          border: none;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          flex: 1;
          color: var(--primary-color);
          font-family: var(--font-text);
        }
        .forum-bottom-bar button.active {
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .form-section {
          border: var(--border-style);
          padding: 16px;
          border-radius: var(--border-radius);
          margin-bottom: 16px;
          background: var(--card-bg);
        }
        .form-section h4 {
          margin: 0 0 12px;
          border-bottom: 1px solid var(--primary-color);
          padding-bottom: 6px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        }
        .collapsible-body { display: none; margin-top: 12px; }
        .collapsible-body.open { display: block; }
        input, textarea, select {
          width: 100%;
          margin: 8px 0;
          padding: 12px;
          border: 1px solid #ccc;
          border-radius: 8px;
          box-sizing: border-box;
          font-family: var(--font-text);
          outline: none;
          background: #fafafa;
        }
        textarea { height: 90px; resize: vertical; }
        .btn-primary {
          background: var(--primary-color);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
        }
        .btn-danger {
          background: #ff4d4f;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px;
          margin-top: 8px;
          cursor: pointer;
          width: 100%;
          font-weight: bold;
        }
        .btn-secondary {
          background: var(--bg-color);
          color: var(--primary-color);
          border: var(--border-style);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        }
        .detail-view {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: var(--bg-color);
          z-index: 10;
          display: none;
          flex-direction: column;
        }
        .detail-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          font-size: 15px;
          line-height: 1.8;
        }
        .skeleton-author { font-weight: bold; color: var(--primary-color); font-size: 16px; }
        .skeleton-stats { color: #888; font-size: 13px; margin: 10px 0; }
        .skeleton-comment {
          border-left: 2px solid var(--primary-color);
          padding-left: 10px;
          margin-top: 8px;
          margin-left: 10px;
        }
        .skeleton-comment-inner { display: flex; gap: 8px; align-items: flex-start; }
        .reply-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          font-size: 12px;
          cursor: pointer;
          margin-left: 8px;
          opacity: 0.7;
          font-family: var(--font-text);
        }
        .comment-input-area {
          display: flex;
          flex-direction: column;
          padding: 12px;
          background: var(--card-bg);
          border-top: var(--border-style);
          gap: 6px;
        }
        .comment-input-row { display: flex; gap: 6px; align-items: center; }
        .reply-hint { font-size: 12px; color: var(--primary-color); padding: 4px 0; display: none; }
        .comment-input-area input {
          flex: 1;
          margin: 0;
          border-radius: 20px;
          padding: 10px 16px;
          border: 1px solid var(--primary-color);
        }
        .comment-input-area button {
          background: var(--primary-color);
          color: #fff;
          border: none;
          border-radius: 20px;
          padding: 0 14px;
          font-weight: bold;
          cursor: pointer;
          white-space: nowrap;
          height: 40px;
        }
        .my-tabs { display: flex; border-bottom: var(--border-style); }
        .my-tabs button {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          font-family: var(--font-text);
          font-weight: bold;
          color: var(--primary-color);
          cursor: pointer;
          font-size: 14px;
        }
        .my-tabs button.active {
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .my-tab-content { display: none; padding: 16px; }
        .my-tab-content.active { display: block; }
        /* 加载动画 */
        .loading-mask {
          display: none;
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(255,255,255,0.95);
          z-index: 20;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }
        /* 默认黑白线条主题：🍘 */
        .spinner {
          font-size: 50px;
          animation: spin 2s linear infinite;
          margin-bottom: 20px;
        }
        .spinner::before { content: "🍘"; }
        /* 水色主题：🍙 */
        .theme-water .spinner::before { content: "🍙"; }
        /* 淡粉食物主题：🍥 */
        .theme-food .spinner::before { content: "🍥"; }
        /* 清新绿主题：🍡 */
        .theme-green .spinner::before { content: "🍡"; }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* API状态 */
        .api-status {
          font-size: 12px;
          margin-top: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: bold;
        }
        .api-status.ok { background: #e6ffe6; color: #2d7a2d; }
        .api-status.fail { background: #ffe6e6; color: #c0392b; }
        /* 刷新弹窗 */
        .modal-overlay {
          display: none;
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(0,0,0,0.4);
          z-index: 30;
          justify-content: center;
          align-items: flex-end;
        }
        .modal-overlay.active { display: flex; }
        .modal-sheet {
          background: var(--bg-color);
          border-radius: 20px 20px 0 0;
          padding: 24px 20px;
          width: 100%;
          max-height: 80%;
          overflow-y: auto;
        }
        .modal-sheet h3 { margin: 0 0 16px; color: var(--primary-color); }
        /* 装饰 */
        .decor {
          display: none;
          position: absolute;
          font-size: 24px;
          opacity: 0.5;
          pointer-events: none;
        }
        .theme-water .decor-water { display: block; color: rgba(163,184,204,0.4); }
        .theme-food .decor-food { display: block; }
        .theme-green .decor-green { display: block; color: rgba(125,170,125,0.4); }
      `;
      document.head.appendChild(style);

      container.innerHTML = `
        <div class="roche-plugin-forum ${settings.themeStyle !== 'line' ? 'theme-' + settings.themeStyle : ''}" id="main-container">
          <div class="decor decor-water" style="top:10%;left:5%">♡</div>
          <div class="decor decor-food" style="top:15%;left:8%">🍡</div>
          <div class="decor decor-food" style="top:50%;right:10%">🍧</div>
          <div class="decor decor-food" style="bottom:20%;left:12%">🍬</div>
          <div class="decor decor-green" style="top:20%;right:8%">🍡</div>
          <div class="decor decor-green" style="bottom:30%;left:5%">🍵</div>

          <div class="forum-header">
            <button id="forum-exit">&lt;</button>
            <div id="header-title" style="font-weight:bold;font-size:18px;text-transform:uppercase;">FORUM</div>
            <button id="nav-refresh">↻</button>
          </div>

          <!-- 主页 -->
          <div id="view-feed" class="page-view active">
            <div style="padding:10px 16px;border-bottom:var(--border-style);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:bold;color:var(--primary-color);" id="feed-user-name">@${userProfile.forumName}</span>
              <button id="btn-user-post" class="btn-secondary">+ 发布</button>
            </div>
            <div class="forum-content" id="forum-feed-container"></div>
          </div>

          <!-- 板块 -->
          <div id="view-crossover" class="page-view">
            <div class="my-tabs" style="border-bottom:var(--border-style);">
              <button data-bk="cross" class="active">🌌 跨界大乱炖</button>
              <button data-bk="if">💕 if 线</button>
            </div>
            <div class="forum-content" id="crossover-feed-container"></div>
            <div class="forum-content" id="if-feed-container" style="display:none;"></div>
          </div>

          <!-- 私信 -->
          <div id="view-msg" class="page-view">
            <div style="padding:50px;text-align:center;color:var(--primary-color);font-weight:bold;">私信功能开发中...</div>
          </div>

          <!-- 我的 -->
          <div id="view-user" class="page-view">
            <div style="text-align:center;padding:20px;border-bottom:var(--border-style);">
              <div id="user-avatar-display" style="width:80px;height:80px;border-radius:50%;background:var(--avatar-color);border:2px solid var(--primary-color);margin:0 auto 10px;background-size:cover;background-position:center;${userProfile.avatarUrl ? `background-image:url(${userProfile.avatarUrl});` : ''}"></div>
              <h3 style="margin:0;color:var(--primary-color);" id="user-display-name">@${userProfile.forumName}</h3>
            </div>
            <div class="my-tabs">
              <button data-tab="profile" class="active">资料</button>
              <button data-tab="mine">我的动态</button>
              <button data-tab="fav">收藏</button>
              <button data-tab="more">更多</button>
            </div>
            <div class="my-tab-content active" data-tab="profile">
              <div class="form-section"><h4>头像</h4>
                <label>头像链接:<input type="text" id="user-avatar-url" value="${userProfile.avatarUrl}"></label>
                <label>或上传本地图片:<input type="file" id="user-avatar-file" accept="image/*"></label>
              </div>
              <div class="form-section"><h4>公开论坛身份</h4>
                <label>网名 (@代号):<input type="text" id="user-forum-name" value="${userProfile.forumName}"></label>
              </div>
              <div class="form-section"><h4>私密代入人设</h4>
                <label>真名/爱称:<input type="text" id="user-name" value="${userProfile.name}"></label>
                <label>年龄:<input type="text" id="user-age" value="${userProfile.age}"></label>
                <label>外貌:<textarea id="user-appearance">${userProfile.appearance}</textarea></label>
              </div>
              <button id="user-save" class="btn-primary">保存资料</button>
            </div>
            <div class="my-tab-content" data-tab="mine"><div id="mine-container"></div></div>
            <div class="my-tab-content" data-tab="fav"><div id="fav-container"></div></div>
            <div class="my-tab-content" data-tab="more"><div style="text-align:center;color:#888;padding:40px;">占位·敬请期待</div></div>
          </div>

          <!-- 设置 -->
          <div id="view-settings" class="page-view">
            <div class="forum-content">
              <div class="form-section">
                <h4 data-toggle="theme">全局主题美化 <span>▾</span></h4>
                <div class="collapsible-body open" data-body="theme">
                  <select id="theme-style">
                    <option value="line" ${settings.themeStyle==='line'?'selected':''}>经典复古：黑白立体线条</option>
                    <option value="water" ${settings.themeStyle==='water'?'selected':''}>唯美纯净：水色 ♡</option>
                    <option value="food" ${settings.themeStyle==='food'?'selected':''}>淡粉食物：少女心 🍥</option>
                    <option value="green" ${settings.themeStyle==='green'?'selected':''}>清新绿意：自然系 🍡</option>
                  </select>
                  <div id="color-picker-wrap" style="display:${settings.themeStyle==='line'?'block':'none'};">
                    <label>线条颜色:<input type="color" id="theme-color" value="${settings.themeColor}"></label>
                  </div>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="world">世界观设定 <span>▾</span></h4>
                <div class="collapsible-body" data-body="world">
                  <p style="font-size:12px;color:#888;margin:0 0 8px;">留空则使用系统随机世界观，不限定具体作品。</p>
                  <textarea id="set-worldview" style="height:180px;">${settings.worldView}</textarea>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="wb">世界书挂载 <span>▾</span></h4>
                <div class="collapsible-body" data-body="wb">
                  <div id="wb-list" style="max-height:150px;overflow-y:auto;border:var(--border-style);padding:10px;border-radius:var(--border-radius);">加载中...</div>
                  <button class="btn-secondary" id="btn-load-wb" style="width:100%;margin-top:8px;">刷新世界书列表</button>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="api">API 与生成配置 <span>▾</span></h4>
                <div class="collapsible-body" data-body="api">
                  <div style="margin-bottom:12px;">
                    <label style="display:flex;align-items:center;gap:8px;">
                      <input type="checkbox" id="use-roche-ai" ${settings.useRocheAI?'checked':''} style="width:auto;margin:0;">
                      <span>优先使用 Roche 内置 AI（推荐）</span>
                    </label>
                  </div>
                  <label>帖子数:<input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                  <label>评论数:<input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
                  <label>读取最近帖子条数:<input type="number" id="set-recent-count" value="${settings.recentPostReadCount}" min="0" max="30"></label>
                  <label>读取记忆条数:<input type="number" id="set-memory-count" value="${settings.memoryReadCount}" min="0" max="30"></label>
                  <label>自定义 API 地址:<input type="text" id="set-api-url" value="${settings.apiUrl}"></label>
                  <label>自定义 API 密钥:<input type="password" id="set-api-key" value="${settings.apiKey}"></label>
                  <label>模型名称:
                    <select id="set-api-model">
                      <option value="gpt-4o" ${settings.apiModel==='gpt-4o'?'selected':''}>gpt-4o</option>
                      <option value="gpt-4o-mini" ${settings.apiModel==='gpt-4o-mini'?'selected':''}>gpt-4o-mini</option>
                      <option value="gpt-3.5-turbo" ${settings.apiModel==='gpt-3.5-turbo'?'selected':''}>gpt-3.5-turbo</option>
                      <option value="claude-3-5-sonnet-20241022" ${settings.apiModel==='claude-3-5-sonnet-20241022'?'selected':''}>claude-3-5-sonnet</option>
                      <option value="custom" ${!['gpt-4o','gpt-4o-mini','gpt-3.5-turbo','claude-3-5-sonnet-20241022'].includes(settings.apiModel)?'selected':''}>自定义...</option>
                    </select>
                  </label>
                  <div id="custom-model-wrap" style="display:${!['gpt-4o','gpt-4o-mini','gpt-3.5-turbo','claude-3-5-sonnet-20241022'].includes(settings.apiModel)?'block':'none'};">
                    <input type="text" id="set-custom-model" value="${settings.apiModel}" placeholder="输入模型名称">
                  </div>
                  <button class="btn-secondary" id="btn-test-api" style="width:100%;margin-top:8px;">🔗 测试自定义 API 连接</button>
                  <div id="api-test-result"></div>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="memory">论坛记忆 <span>▾</span></h4>
                <div class="collapsible-body" data-body="memory">
                  <div style="font-weight:bold;margin-top:8px;">主页记忆</div>
                  <div id="memory-feed-list" style="max-height:80px;overflow-y:auto;font-size:13px;color:#666;padding:8px;border:1px solid #eee;border-radius:8px;"></div>
                  <button class="btn-secondary" id="btn-mem-feed" style="width:100%;margin-top:8px;">立刻总结主页</button>
                  <div style="font-weight:bold;margin-top:12px;">跨界记忆</div>
                  <div id="memory-cross-list" style="max-height:80px;overflow-y:auto;font-size:13px;color:#666;padding:8px;border:1px solid #eee;border-radius:8px;"></div>
                  <button class="btn-secondary" id="btn-mem-cross" style="width:100%;margin-top:8px;">立刻总结跨界</button>
                  <div style="font-weight:bold;margin-top:12px;">if 线记忆</div>
                  <div id="memory-if-list" style="max-height:80px;overflow-y:auto;font-size:13px;color:#666;padding:8px;border:1px solid #eee;border-radius:8px;"></div>
                  <button class="btn-secondary" id="btn-mem-if" style="width:100%;margin-top:8px;">立刻总结 if 线</button>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="clean">数据清理 <span>▾</span></h4>
                <div class="collapsible-body" data-body="clean">
                  <button class="btn-danger" id="clear-home">删除主页所有帖子</button>
                  <button class="btn-danger" id="clear-cross">删除跨界所有帖子</button>
                  <button class="btn-danger" id="clear-if">删除 if 线所有帖子</button>
                  <button class="btn-danger" id="clear-user">删除我发布的帖子</button>
                  <button class="btn-danger" id="clear-mem">清空所有记忆</button>
                </div>
              </div>
              <button id="settings-save" class="btn-primary">保存设置</button>
            </div>
          </div>

          <div class="forum-bottom-bar">
            <button id="nav-home" class="active">主页</button>
            <button id="nav-crossover">板块</button>
            <button id="nav-msg">私信</button>
            <button id="nav-user-page">我的</button>
            <button id="nav-settings">设置</button>
          </div>

          <!-- 详情页 -->
          <div class="detail-view" id="view-post-detail">
            <div class="forum-header" style="box-shadow:none;">
              <button id="detail-back">&lt;</button>
              <div style="display:flex;gap:8px;">
                <button id="detail-edit" style="font-size:14px;">编辑</button>
                <button id="detail-delete" style="font-size:14px;color:#ff4d4f;">删除</button>
                <button id="detail-fav" style="font-size:14px;">☆</button>
              </div>
            </div>
            <div class="detail-content" id="detail-content-container"></div>
            <div class="comment-input-area">
              <div class="reply-hint" id="reply-hint"></div>
              <div class="comment-input-row">
                <input type="text" id="detail-comment-input" placeholder="回复此贴...">
                <button id="detail-comment-send">发送</button>
                <button id="detail-comment-summon" style="background:#fff;color:var(--primary-color);border:2px solid var(--primary-color);">召唤</button>
              </div>
            </div>
          </div>

          <!-- 发帖弹窗 -->
          <div class="page-view" id="modal-post" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:15;display:none;flex-direction:column;">
            <div class="forum-header">
              <button id="post-cancel" style="font-size:16px;">取消</button>
              <div style="font-weight:bold;" id="post-modal-title">发布动态</div>
              <button id="post-submit" style="font-size:16px;font-weight:bold;">发送</button>
            </div>
            <div style="padding:16px;">
              <textarea id="user-post-content" placeholder="分享你的日常..." style="height:200px;"></textarea>
            </div>
          </div>

          <!-- 刷新前弹窗 -->
          <div class="modal-overlay" id="modal-refresh-overlay">
            <div class="modal-sheet">
              <h3>本次刷新设定</h3>
              <p style="font-size:13px;color:#888;margin:0 0 12px;">留空则使用设置里的默认世界观。你可以在此指定本次要生成哪个角色或世界观。</p>
              <textarea id="refresh-custom-world" style="height:100px;" placeholder="例如：只生成崩铁的黑塔相关的帖子，或留空使用默认"></textarea>
              <div style="display:flex;gap:10px;margin-top:12px;">
                <button id="refresh-cancel" class="btn-secondary" style="flex:1;">取消</button>
                <button id="refresh-go" class="btn-primary" style="flex:2;margin-top:0;">开始生成</button>
              </div>
            </div>
          </div>

          <div class="loading-mask" id="loading-mask">
            <div class="spinner"></div>
            <div style="font-weight:bold;color:var(--primary-color);font-size:16px;margin-top:10px;" id="loading-text">正在捕捉时空交汇的电波...</div>
          </div>
        </div>
      `;

      const $ = (s) => container.querySelector(s);
      const $$ = (s) => container.querySelectorAll(s);
      const mainContainer = $('#main-container');
      const loadingMask = $('#loading-mask');
      const loadingText = $('#loading-text');

      // ===== 页面切换 =====
      const views = {
        feed: $('#view-feed'),
        crossover: $('#view-crossover'),
        msg: $('#view-msg'),
        user: $('#view-user'),
        settings: $('#view-settings')
      };
      const navBtns = {
        feed: $('#nav-home'),
        crossover: $('#nav-crossover'),
        msg: $('#nav-msg'),
        user: $('#nav-user-page'),
        settings: $('#nav-settings')
      };
      const header = $('#header-title');
      let currentMode = 'feed';
      let boardSub = 'cross';

      const switchView = (name, title) => {
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[name].classList.add('active');
        header.innerText = title;
        Object.values(navBtns).forEach(b => b.classList.remove('active'));
        navBtns[name].classList.add('active');
        if (name === 'feed' || name === 'crossover') currentMode = name;
      };

      navBtns.feed.onclick = () => { switchView('feed', 'FORUM'); renderFeed(); };
      navBtns.crossover.onclick = () => { switchView('crossover', 'BOARD'); boardSub === 'cross' ? renderCross() : renderIf(); };
      navBtns.msg.onclick = () => switchView('msg', 'MESSAGES');
      navBtns.user.onclick = () => { switchView('user', 'MY PROFILE'); renderMine(); renderFav(); };
      navBtns.settings.onclick = () => { switchView('settings', 'SETTINGS'); renderMemoryLists(); loadWorldbooks(); };

      // 板块子导航
      $$('[data-bk]').forEach(b => {
        b.onclick = () => {
          $$('[data-bk]').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          boardSub = b.dataset.bk;
          $('#crossover-feed-container').style.display = boardSub === 'cross' ? 'block' : 'none';
          $('#if-feed-container').style.display = boardSub === 'if' ? 'block' : 'none';
          boardSub === 'cross' ? renderCross() : renderIf();
        };
      });

      // 主题切换
      $('#theme-style').onchange = (e) => {
        mainContainer.className = 'roche-plugin-forum';
        if (e.target.value !== 'line') mainContainer.classList.add('theme-' + e.target.value);
        $('#color-picker-wrap').style.display = e.target.value === 'line' ? 'block' : 'none';
      };

      // 折叠面板
      $$('[data-toggle]').forEach(h => {
        h.onclick = () => $(`[data-body="${h.dataset.toggle}"]`).classList.toggle('open');
      });

      // 我的主页 tabs
      $$('.my-tabs button[data-tab]').forEach(b => {
        b.onclick = () => {
          $$('.my-tabs button[data-tab]').forEach(x => x.classList.remove('active'));
          $$('.my-tab-content').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          $(`.my-tab-content[data-tab="${b.dataset.tab}"]`).classList.add('active');
        };
      });

      // 模型选择
      $('#set-api-model').onchange = (e) => {
        $('#custom-model-wrap').style.display = e.target.value === 'custom' ? 'block' : 'none';
      };

      // ===== 工具函数 =====
      const fileToBase64 = (file) => new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(file);
        r.onload = () => res(r.result);
        r.onerror = rej;
      });
      const nowStr = () => new Date().toLocaleString('zh-CN', { hour12: false });
      const moodPool = ["有点困", "心情愉悦", "略有烦躁", "突然想念你", "小雀跃", "静静发呆", "被工作烦到", "突然想撒娇", "有点吃醋", "心跳加速"];
      const currentMood = () => moodPool[new Date().getMinutes() % moodPool.length];
      const locatePost = (id) => {
        if (posts.find(x => x.id === id)) return { arr: posts, key: 'forum_posts', kind: 'feed' };
        if (crossoverPosts.find(x => x.id === id)) return { arr: crossoverPosts, key: 'forum_crossover_posts', kind: 'cross' };
        if (ifPosts.find(x => x.id === id)) return { arr: ifPosts, key: 'forum_if_posts', kind: 'if' };
        return null;
      };
      const getModel = () => {
        const sel = $('#set-api-model') ? $('#set-api-model').value : settings.apiModel;
        if (sel === 'custom') return ($('#set-custom-model') ? $('#set-custom-model').value : settings.apiModel) || 'gpt-4o';
        return sel || settings.apiModel || 'gpt-4o';
      };

      // ===== AI 调用 =====
      const callAI = async (prompt) => {
        const useRoche = $('#use-roche-ai') ? $('#use-roche-ai').checked : settings.useRocheAI;
        if (useRoche) {
          try {
            const r = await roche.ai.chat({ messages: [{ role: 'user', content: prompt }], temperature: 0.85 });
            if (r && r.text) return r.text.trim();
          } catch(e) { console.warn('Roche AI 失败，切换自定义 API', e); }
        }
        if (settings.apiUrl && settings.apiKey) {
          const res = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
            body: JSON.stringify({ model: getModel(), messages: [{ role: 'user', content: prompt }], temperature: 0.85 })
          });
          const data = await res.json();
          return data.choices[0].message.content.trim();
        }
        throw new Error('Roche 内置 AI 和自定义 API 均不可用，请检查配置。');
      };

      // ===== 世界书 =====
      const loadWorldbooks = async () => {
        try {
          const categories = await roche.worldbook.list();
          const wbList = $('#wb-list');
          if (!categories || categories.length === 0) { wbList.innerHTML = '暂无世界书分类'; return; }
          wbList.innerHTML = categories.map(cat => `
            <div><label><input type="checkbox" class="wb-check" value="${cat.id}" ${selectedWorldbooks.includes(cat.id) ? 'checked' : ''}> ${cat.name}</label></div>
          `).join('');
        } catch(e) { console.error(e); }
      };
      $('#btn-load-wb').onclick = loadWorldbooks;

      const getWbText = async () => {
        let wbText = '';
        const checkedIds = Array.from(container.querySelectorAll('.wb-check:checked')).map(cb => cb.value);
        for (let catId of checkedIds) {
          try {
            const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: 'global' });
            if (entries && entries.length > 0) wbText += entries.map(e => `${e.keys.join(',')}: ${e.content}`).join('\n') + '\n';
          } catch(e) {}
        }
        return wbText;
      };

      // ===== 头像渲染 =====
      const avatarHtml = (post, small = false) => {
        const sz = small ? 'width:28px;height:28px;margin-right:8px;' : 'width:36px;height:36px;margin-right:12px;';
        if (post.avatar) {
          return `<img src="${post.avatar}" style="${sz}border-radius:50%;object-fit:cover;border:1px solid var(--primary-color);flex-shrink:0;" onerror="this.style.display='none'">`;
        }
        return `<div style="${sz}border-radius:50%;background:var(--avatar-color);border:1px solid var(--primary-color);flex-shrink:0;"></div>`;
      };

      // ===== 渲染列表 =====
      const renderList = (el, data) => {
        el.innerHTML = '';
        if (data.length === 0) {
          el.innerHTML = '<div style="text-align:center;margin-top:50px;font-weight:bold;color:var(--primary-color);">暂无动态，点击右上角 ↻ 刷新生成</div>';
          return;
        }
        data.forEach(post => {
          const d = document.createElement('div');
          d.className = 'forum-post';
          const likes = post.likes ?? 0, stars = post.stars ?? 0, cc = post.comments?.length || 0;
          d.innerHTML = `
            <div class="post-header">${avatarHtml(post)}<div class="post-author">@${post.author}</div></div>
            <div class="post-text collapsed">${post.content}</div>
            <div class="post-stats">——♡${likes} ★${stars} ＞${cc}</div>
          `;
          d.onclick = () => openDetail(post.id);
          el.appendChild(d);
        });
      };

      const renderFeed = () => renderList($('#forum-feed-container'), posts);
      const renderCross = () => renderList($('#crossover-feed-container'), crossoverPosts);
      const renderIf = () => renderList($('#if-feed-container'), ifPosts);

      const renderMine = () => {
        const mineC = $('#mine-container');
        const mine = [...posts, ...crossoverPosts, ...ifPosts].filter(p => p.author === userProfile.forumName);
        if (mine.length === 0) { mineC.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">你还没有发过帖子</div>'; return; }
        mineC.innerHTML = '';
        mine.forEach(p => {
          const d = document.createElement('div');
          d.className = 'forum-post';
          d.innerHTML = `<div class="post-header">${avatarHtml(p)}<div class="post-author">@${p.author}</div></div><div class="post-text collapsed">${p.content}</div><div class="post-stats">${p.comments?.length || 0} 条回复</div>`;
          d.onclick = () => openDetail(p.id);
          mineC.appendChild(d);
        });
      };

      const renderFav = () => {
        const favC = $('#fav-container');
        if (favorites.length === 0) { favC.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">暂无收藏</div>'; return; }
        favC.innerHTML = '';
        favorites.forEach(f => {
          const d = document.createElement('div');
          d.className = 'forum-post';
          d.innerHTML = `<div class="post-header"><div style="width:36px;height:36px;border-radius:50%;background:var(--avatar-color);border:1px solid var(--primary-color);margin-right:12px;flex-shrink:0;"></div><div class="post-author">@${f.author}</div></div><div class="post-text collapsed">${f.content}</div><div class="post-stats" style="color:#ff4d4f;cursor:pointer;">✕ 取消收藏</div>`;
          d.querySelector('.post-stats').onclick = async (e) => {
            e.stopPropagation();
            favorites = favorites.filter(x => x.id !== f.id);
            await roche.storage.set("forum_favorites", favorites);
            renderFav();
            roche.ui.toast("已取消收藏");
          };
          d.onclick = () => { if (locatePost(f.id)) openDetail(f.id); else roche.ui.toast("原帖已被删除"); };
          favC.appendChild(d);
        });
      };

      // ===== 详情页 =====
      const detailView = $('#view-post-detail');
      const detailC = $('#detail-content-container');
      const replyHint = $('#reply-hint');
      const commentInput = $('#detail-comment-input');
      let curPostId = null;
      let replyToAuthor = null;

      const resetReplyState = () => {
        replyToAuthor = null;
        replyHint.style.display = 'none';
        replyHint.innerText = '';
        commentInput.placeholder = '回复此贴...';
      };

      $('#detail-back').onclick = () => { detailView.style.display = 'none'; resetReplyState(); };

      const openDetail = (id) => {
        const loc = locatePost(id);
        if (!loc) return;
        curPostId = id;
        resetReplyState();
        const p = loc.arr.find(x => x.id === id);
        const likes = p.likes ?? 0, stars = p.stars ?? 0, cc = p.comments?.length || 0;
        let html = `
          <div style="display:flex;align-items:center;margin-bottom:8px;">${avatarHtml(p)}<div class="skeleton-author">@${p.author}</div></div>
          <div style="white-space:pre-wrap;">${p.content}</div>
          <div class="skeleton-stats">——♡${likes} ★${stars} ＞${cc}</div>
          <div style="color:var(--primary-color);">|<br>|</div>
        `;
        if (p.comments?.length) {
          p.comments.forEach(c => {
            const isNested = c.content.startsWith('@') && c.content.indexOf(' ') > 1;
            const indent = isNested ? 'margin-left:20px;' : '';
            html += `
              <div class="skeleton-comment" style="${indent}">
                <div class="skeleton-comment-inner">
                  <div style="width:28px;height:28px;border-radius:50%;background:var(--avatar-color);border:1px solid var(--primary-color);flex-shrink:0;"></div>
                  <div style="flex:1;">
                    <span class="skeleton-author">@${c.author}</span>
                    <button class="reply-btn" data-author="${c.author}">回复</button>
                    <br><span>${c.content}</span>
                  </div>
                </div>
              </div>
            `;
          });
        } else {
          html += `<div style="color:#888;margin-left:10px;">暂无评论</div>`;
        }
        detailC.innerHTML = html;
        detailC.querySelectorAll('.reply-btn').forEach(btn => {
          btn.onclick = () => {
            replyToAuthor = btn.dataset.author;
            replyHint.innerText = `正在回复 @${replyToAuthor}`;
            replyHint.style.display = 'block';
            commentInput.placeholder = `回复 @${replyToAuthor}...`;
            commentInput.focus();
          };
        });
        $('#detail-fav').innerText = favorites.some(f => f.id === p.id) ? '★' : '☆';
        detailView.style.display = 'flex';
      };

      let editingId = null;
      $('#detail-edit').onclick = () => {
        const loc = locatePost(curPostId);
        if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        editingId = p.id;
        $('#user-post-content').value = p.content;
        $('#post-modal-title').innerText = p.author === userProfile.forumName ? '编辑动态' : `编辑 @${p.author} 的帖子`;
        $('#modal-post').style.display = 'flex';
      };

      $('#detail-delete').onclick = async () => {
        const ok = await roche.ui.confirm({ title: "删除", message: "确认删除这条帖子？" });
        if (!ok) return;
        const loc = locatePost(curPostId);
        if (!loc) return;
        const filtered = loc.arr.filter(x => x.id !== curPostId);
        if (loc.kind === 'feed') posts = filtered;
        else if (loc.kind === 'cross') crossoverPosts = filtered;
        else ifPosts = filtered;
        await roche.storage.set(loc.key, filtered);
        detailView.style.display = 'none';
        if (loc.kind === 'feed') renderFeed();
        else if (loc.kind === 'cross') renderCross();
        else renderIf();
      };

      $('#detail-fav').onclick = async () => {
        const loc = locatePost(curPostId);
        if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        const idx = favorites.findIndex(f => f.id === p.id);
        if (idx >= 0) {
          favorites.splice(idx, 1);
          $('#detail-fav').innerText = '☆';
          roche.ui.toast("已取消收藏");
        } else {
          favorites.unshift({ id: p.id, author: p.author, content: p.content });
          $('#detail-fav').innerText = '★';
          roche.ui.toast("已收藏 ★");
        }
        await roche.storage.set("forum_favorites", favorites);
      };

      // ===== 发送评论 =====
      $('#detail-comment-send').onclick = async () => {
        const t = commentInput.value.trim();
        if (!t) return;
        const loc = locatePost(curPostId);
        if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        p.comments = p.comments || [];
        let content = t;
        if (replyToAuthor && !t.startsWith(`@${replyToAuthor}`)) {
          content = `@${replyToAuthor} ${t}`;
        }
        p.comments.push({ author: userProfile.forumName, content });
        commentInput.value = '';
        resetReplyState();
        openDetail(p.id);
        await roche.storage.set(loc.key, loc.arr);

        loadingText.innerText = "正在呼唤角色回复...";
        loadingMask.style.display = 'flex';
        try {
          const wbText = await getWbText();
          const baseWorldView = settings.worldView.trim() || SYSTEM_WORLDVIEW;
          const memArr = loc.kind === 'feed' ? memoryFeed : (loc.kind === 'if' ? memoryIf : memoryCross);
          const recentSrc = loc.kind === 'feed' ? posts : (loc.kind === 'if' ? ifPosts : crossoverPosts);
          const memText = memArr.slice(0, settings.memoryReadCount || 5).map(m => `[${m.time}] ${m.summary}`).join('\n') || '（无）';
          const recentText = recentSrc.slice(0, settings.recentPostReadCount || 5).map(p => `@${p.author}: ${p.content.slice(0, 60)}`).join('\n') || '（无）';
          const scopeHint = loc.kind === 'feed' ? '请扮演原帖作者本人，或同世界观其他角色回复。禁止其他世界观角色出现。' :
            loc.kind === 'cross' ? '这是【跨界大乱炖】板块，允许不同世界观角色跨界串门评论。' :
            '这是【if 线】板块，评论区必须是与帖主同一个世界观的角色。';
          const prompt = `【世界观】：\n${baseWorldView}
${wbText ? `【世界书背景】：\n${wbText}` : ''}
【用户】：@${userProfile.forumName}，真名/爱称[${userProfile.name}]
【论坛记忆】：\n${memText}
【最近帖子参考】：\n${recentText}
你是论坛模拟器。用户（@${userProfile.forumName}）刚刚评论了。
原帖作者：@${p.author}
原帖内容：${p.content}
用户评论：${content}
${scopeHint}
生成 1~2 条角色回复。严格遵循官方人设，禁止OOC，禁止图片描述。@格式使用@名字。emoji按人设自行判断。角色当前心情:${currentMood()}。
输出纯JSON数组:[{"author":"角色名","content":"@${userProfile.forumName} 回复内容"}]`;
          const raw = await callAI(prompt);
          const replies = JSON.parse(raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1));
          p.comments = p.comments.concat(replies);
          await roche.storage.set(loc.key, loc.arr);
          openDetail(p.id);
        } catch(e) {
          roche.ui.toast("角色暂时没回复");
        } finally {
          loadingMask.style.display = 'none';
        }
      };

      // ===== 召唤角色 =====
      $('#detail-comment-summon').onclick = async () => {
        const loc = locatePost(curPostId);
        if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        loadingText.innerText = "正在召唤角色...";
        loadingMask.style.display = 'flex';
        try {
          const wbText = await getWbText();
          const baseWorldView = settings.worldView.trim() || SYSTEM_WORLDVIEW;
          const memArr = loc.kind === 'feed' ? memoryFeed : (loc.kind === 'if' ? memoryIf : memoryCross);
          const recentSrc = loc.kind === 'feed' ? posts : (loc.kind === 'if' ? ifPosts : crossoverPosts);
          const memText = memArr.slice(0, settings.memoryReadCount || 5).map(m => `[${m.time}] ${m.summary}`).join('\n') || '（无）';
          const recentText = recentSrc.slice(0, settings.recentPostReadCount || 5).map(p => `@${p.author}: ${p.content.slice(0, 60)}`).join('\n') || '（无）';
          const existing = (p.comments || []).map(c => `@${c.author}: ${c.content}`).join('\n') || '（无）';
          const scopeHint = loc.kind === 'feed' ? '只允许同世界观角色出现。' :
            loc.kind === 'cross' ? '【跨界大乱炖】板块，允许跨界角色出现。' :
            '【if 线】板块，评论必须来自帖主同一个世界观的角色。';
          const prompt = `【世界观】：\n${baseWorldView}
${wbText ? `【世界书背景】：\n${wbText}` : ''}
【用户】：@${userProfile.forumName}，真名/爱称[${userProfile.name}]
【论坛记忆】：\n${memText}
【最近帖子参考】：\n${recentText}
请为下列帖子生成 1~2 条新的角色评论/回复（可回复贴主或已有评论）。
【帖子作者】@${p.author}
【帖子内容】${p.content}
【已有评论】\n${existing}
${scopeHint}
角色当前心情:${currentMood()}。严格遵循官方人设，禁止OOC，禁止图片描述。@格式使用@名字。
输出纯JSON数组:[{"author":"角色名","content":"@某人 回复内容"}]`;
          const raw = await callAI(prompt);
          const replies = JSON.parse(raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1));
          p.comments = (p.comments || []).concat(replies);
          await roche.storage.set(loc.key, loc.arr);
          openDetail(p.id);
          roche.ui.toast("角色赶来了");
        } catch(e) {
          roche.ui.toast("召唤失败，请重试");
        } finally {
          loadingMask.style.display = 'none';
        }
      };

      // ===== 发帖 =====
      const modalPost = $('#modal-post');
      $('#btn-user-post').onclick = () => {
        editingId = null;
        $('#user-post-content').value = '';
        $('#post-modal-title').innerText = '发布动态';
        modalPost.style.display = 'flex';
      };
      $('#post-cancel').onclick = () => modalPost.style.display = 'none';
      $('#post-submit').onclick = async () => {
        const c = $('#user-post-content').value.trim();
        if (!c) return roche.ui.toast("内容不能为空");
        if (editingId) {
          const loc = locatePost(editingId);
          if (loc) {
            const p = loc.arr.find(x => x.id === editingId);
            p.content = c;
            await roche.storage.set(loc.key, loc.arr);
            openDetail(p.id);
          }
        } else {
          const np = { id: crypto.randomUUID(), author: userProfile.forumName, avatar: userProfile.avatarUrl || '', content: c, comments: [], likes: 0, stars: 0 };
          if (currentMode === 'feed') { posts.unshift(np); await roche.storage.set("forum_posts", posts); renderFeed(); }
          else if (boardSub === 'cross') { crossoverPosts.unshift(np); await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); }
          else { ifPosts.unshift(np); await roche.storage.set("forum_if_posts", ifPosts); renderIf(); }
        }
        modalPost.style.display = 'none';
        roche.ui.toast("已保存");
      };

      // ===== 用户资料 =====
      $('#user-avatar-file').onchange = async (e) => {
        if (e.target.files?.[0]) {
          const b64 = await fileToBase64(e.target.files[0]);
          $('#user-avatar-url').value = b64;
        }
      };
      $('#user-save').onclick = async () => {
        userProfile.forumName = $('#user-forum-name').value;
        userProfile.avatarUrl = $('#user-avatar-url').value;
        userProfile.name = $('#user-name').value;
        userProfile.age = $('#user-age').value;
        userProfile.appearance = $('#user-appearance').value;
        await roche.storage.set("forum_user", userProfile);
        $('#feed-user-name').innerText = `@${userProfile.forumName}`;
        $('#user-display-name').innerText = `@${userProfile.forumName}`;
        if (userProfile.avatarUrl) $('#user-avatar-display').style.backgroundImage = `url(${userProfile.avatarUrl})`;
        roche.ui.toast("资料已保存");
      };

      // ===== 测试 API =====
      $('#btn-test-api').onclick = async () => {
        const resultEl = $('#api-test-result');
        resultEl.innerHTML = '<div class="api-status" style="background:#fff3cd;color:#856404;">测试中...</div>';
        try {
          const url = $('#set-api-url').value, key = $('#set-api-key').value;
          if (!url || !key) { resultEl.innerHTML = '<div class="api-status fail">请先填写 API 地址和密钥</div>'; return; }
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ model: getModel(), messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }) });
          if (res.ok) resultEl.innerHTML = '<div class="api-status ok">✅ 自定义 API 连接成功！</div>';
          else resultEl.innerHTML = `<div class="api-status fail">❌ 连接失败，状态码：${res.status}</div>`;
        } catch(e) {
          resultEl.innerHTML = '<div class="api-status fail">❌ 网络错误，请检查地址格式</div>';
        }
      };

      // ===== 设置保存 =====
      $('#settings-save').onclick = async () => {
        settings.themeStyle = $('#theme-style').value;
        settings.themeColor = $('#theme-color').value;
        settings.worldView = $('#set-worldview').value;
        settings.postCount = parseInt($('#set-post-count').value) || 3;
        settings.commentCount = parseInt($('#set-comment-count').value) || 5;
        settings.recentPostReadCount = parseInt($('#set-recent-count').value) || 5;
        settings.memoryReadCount = parseInt($('#set-memory-count').value) || 5;
        settings.apiUrl = $('#set-api-url').value;
        settings.apiKey = $('#set-api-key').value;
        const modelSel = $('#set-api-model').value;
        settings.apiModel = modelSel === 'custom' ? ($('#set-custom-model').value || 'gpt-4o') : modelSel;
        settings.useRocheAI = $('#use-roche-ai').checked;
        selectedWorldbooks = Array.from(container.querySelectorAll('.wb-check:checked')).map(cb => cb.value);
        await roche.storage.set("forum_settings", settings);
        await roche.storage.set("forum_worldbooks", selectedWorldbooks);
        roche.ui.toast("设置已保存");
      };

      // ===== 清理 =====
      $('#clear-home').onclick = async () => { posts = []; await roche.storage.set("forum_posts", posts); renderFeed(); roche.ui.toast("主页已清空"); };
      $('#clear-cross').onclick = async () => { crossoverPosts = []; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); roche.ui.toast("跨界已清空"); };
      $('#clear-if').onclick = async () => { ifPosts = []; await roche.storage.set("forum_if_posts", ifPosts); renderIf(); roche.ui.toast("if 线已清空"); };
      $('#clear-user').onclick = async () => {
        posts = posts.filter(p => p.author !== userProfile.forumName);
        crossoverPosts = crossoverPosts.filter(p => p.author !== userProfile.forumName);
        ifPosts = ifPosts.filter(p => p.author !== userProfile.forumName);
        await roche.storage.set("forum_posts", posts);
        await roche.storage.set("forum_crossover_posts", crossoverPosts);
        await roche.storage.set("forum_if_posts", ifPosts);
        roche.ui.toast("你的帖子已清空");
      };
      $('#clear-mem').onclick = async () => {
        memoryFeed = []; memoryCross = []; memoryIf = [];
        await roche.storage.set("forum_memory_feed", memoryFeed);
        await roche.storage.set("forum_memory_cross", memoryCross);
        await roche.storage.set("forum_memory_if", memoryIf);
        renderMemoryLists();
        roche.ui.toast("记忆已清空");
      };

      // ===== 记忆 =====
      const renderMemoryLists = () => {
        const fmt = (arr) => arr.length ? arr.map(m => `<div>· [${m.time}] ${m.summary}</div>`).join('') : '<div style="color:#aaa;">暂无</div>';
        $('#memory-feed-list').innerHTML = fmt(memoryFeed);
        $('#memory-cross-list').innerHTML = fmt(memoryCross);
        $('#memory-if-list').innerHTML = fmt(memoryIf);
      };
      const summarize = async (which) => {
        const src = which === 'feed' ? posts : which === 'cross' ? crossoverPosts : ifPosts;
        if (src.length === 0) return roche.ui.toast("没有可总结的帖子");
        loadingText.innerText = "正在总结...";
        loadingMask.style.display = 'flex';
        try {
          const text = src.slice(0, 10).map(p => `@${p.author}: ${p.content}`).join('\n');
          const raw = await callAI(`请用一句简短的中文总结以下论坛帖子的整体情况和主要事件（时间线清晰，不超过80字）：\n${text}`);
          const mem = { time: nowStr(), summary: raw.trim().slice(0, 120) };
          if (which === 'feed') { memoryFeed.unshift(mem); memoryFeed = memoryFeed.slice(0, 30); await roche.storage.set("forum_memory_feed", memoryFeed); }
          else if (which === 'cross') { memoryCross.unshift(mem); memoryCross = memoryCross.slice(0, 30); await roche.storage.set("forum_memory_cross", memoryCross); }
          else { memoryIf.unshift(mem); memoryIf = memoryIf.slice(0, 30); await roche.storage.set("forum_memory_if", memoryIf); }
          renderMemoryLists();
          roche.ui.toast("已生成记忆");
        } catch(e) {
          roche.ui.toast("总结失败");
        } finally {
          loadingMask.style.display = 'none';
        }
      };
      $('#btn-mem-feed').onclick = () => summarize('feed');
      $('#btn-mem-cross').onclick = () => summarize('cross');
      $('#btn-mem-if').onclick = () => summarize('if');

      // ===== 刷新前弹窗 =====
      const refreshOverlay = $('#modal-refresh-overlay');
      $('#nav-refresh').onclick = () => { refreshOverlay.classList.add('active'); $('#refresh-custom-world').value = ''; };
      $('#refresh-cancel').onclick = () => refreshOverlay.classList.remove('active');
      $('#refresh-go').onclick = async () => {
        const customWorld = $('#refresh-custom-world').value.trim();
        refreshOverlay.classList.remove('active');
        await doRefresh(customWorld);
      };

      // ===== 核心刷新 =====
      const doRefresh = async (customWorld = '') => {
        loadingText.innerText = "正在捕捉时空交汇的电波...";
        loadingMask.style.display = 'flex';
        try {
          const wbText = await getWbText();
          const baseWorldView = customWorld || settings.worldView.trim() || SYSTEM_WORLDVIEW;
          const memArr = currentMode === 'feed' ? memoryFeed : (boardSub === 'if' ? memoryIf : memoryCross);
          const recentSrc = currentMode === 'feed' ? posts : (boardSub === 'if' ? ifPosts : crossoverPosts);
          const recentPosts = recentSrc.slice(0, settings.recentPostReadCount || 5);
          const memText = memArr.slice(0, settings.memoryReadCount || 5).map(m => `[${m.time}] ${m.summary}`).join('\n') || '（无）';
          const recentText = recentPosts.map(p => `@${p.author}: ${p.content.slice(0, 60)}`).join('\n') || '（无）';
          const basePrompt = `【世界观】：\n${baseWorldView}
${wbText ? `【世界书背景】：\n${wbText}` : ''}
【用户情报】：网名 @${userProfile.forumName}，真名/爱称[${userProfile.name}]，年龄${userProfile.age}，外貌：${userProfile.appearance}。
【论坛记忆（最近${settings.memoryReadCount || 5}条）】：\n${memText}
【最近${recentPosts.length}条帖子参考】：\n${recentText}
【硬性规则】：
- 严格遵循官方人设，禁止OOC。
- 禁止图片描述，禁止使用[翻开照片:xxx]。
- 每个角色发帖时假设有当前心情（如${currentMood()}），要有活人感。
- emoji（🤤😂🙄🤣😭😉）根据人设自行判断，不强制不禁止，不要每帖都加。
- @格式使用@名字。`;

          let prompt;
          if (currentMode === 'feed') {
            prompt = `${basePrompt}
生成 ${settings.postCount} 篇帖子，每篇 ${settings.commentCount} 条评论。评论区必须是同世界观角色。
输出纯JSON数组:[{"author":"角色名","content":"正文","likes":数字,"stars":数字,"comments":[{"author":"评论人","content":"内容"}]}]`;
          } else if (boardSub === 'cross') {
            prompt = `${basePrompt}
这是【跨界大乱炖】板块。围绕以下三种反应生成帖子（三选一或混合）：
① 各世界观角色发现 user 在他们那边也有"马甲"的震惊反应——拉群对质、发帖吐槽、追问细节；
② 各世界观里暗恋 user 的角色聚在一起时的反应——互相试探、吃醋、抱团发疯；
③ 某个世界观的角色发帖描述 user 在他们那边干过的具体事情，评论区是其他角色的追问、羡慕反应。
生成 ${settings.postCount} 篇，每篇 ${settings.commentCount} 条跨界评论。输出格式同上。`;
          } else {
            prompt = `${basePrompt}
这是【if 线】板块——平行时空里，帖主已经和 user 在一起了（帖主是 user 的男朋友/女朋友/老公/老婆）。
帖主发帖围绕【恋爱日常/婚后甜蜜/被 user 撒娇/小吵架和好】等主题，字里行间掩不住的秀恩爱。
⚠️ 世界观必须一致：帖主和评论区角色来自同一个世界观。
⚠️ 评论区里的其他角色是【暗恋 user】的，看到帖主秀恩爱时会——酸到冒泡、破防、追问 user 的细节、幻想自己在 if 线取而代之。
甜度拉满，严格保持人设不 OOC。
生成 ${settings.postCount} 篇 if 帖子，每篇 ${settings.commentCount} 条评论。输出格式同上。`;
          }

          const raw = await callAI(prompt);
          const json = raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1);
          const arr = JSON.parse(json);
          const newPosts = arr.map(it => ({
            id: crypto.randomUUID(),
            author: it.author || "未知",
            content: it.content || "",
            likes: it.likes ?? Math.floor(Math.random() * 500),
            stars: it.stars ?? Math.floor(Math.random() * 200),
            comments: it.comments || []
          }));

          if (currentMode === 'feed') { posts = [...newPosts, ...posts]; await roche.storage.set("forum_posts", posts); renderFeed(); }
          else if (boardSub === 'cross') { crossoverPosts = [...newPosts, ...crossoverPosts]; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); }
          else { ifPosts = [...newPosts, ...ifPosts]; await roche.storage.set("forum_if_posts", ifPosts); renderIf(); }
          roche.ui.toast("捕捉到新的时空电波");
        } catch(err) {
          console.error(err);
          roche.ui.toast("生成失败：" + (err.message || "请检查API配置"));
        } finally {
          loadingMask.style.display = 'none';
        }
      };

      $('#forum-exit').onclick = () => roche.ui.closeApp();
      renderFeed();
      renderMemoryLists();
      loadWorldbooks();
    },
    async unmount(container) {
      container.replaceChildren();
      const s = document.getElementById("minimalist-forum-style");
      if (s) s.remove();
    }
  }]
});
