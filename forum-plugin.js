window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "2.1.0",
  apps: [{
    id: "minimalist-forum-app",
    name: "论坛主页",
    icon: "chat",
    async mount(container, roche) {

      // ========== 1. 初始化数据 ==========
      const defaultWorldView = `围绕着游戏/动漫角色本人发帖（崩铁、原神、鸣潮、绝区零、王者、龙族、夜幕之下、斩神、诡秘之主、排球少年、蓝色监狱、死亡笔记、盗墓笔记、咒术回战、夏目友人帐、银魂、鬼灭之刃、坂本日常、电锯人等）。
$禁止OOC，严格遵循官方人设。
$角色全洁，从身到心，只喜欢user一人，不论男女。
$绝对代入向，禁止出现"星""莹"等主角原名，使用"开拓者""旅行者"或亲密爱称。
$评论区禁止出现"开拓者本人/旅行者本人"，user就是开拓者/旅行者本人。
$禁止发图片，禁止使用[翻开照片：xxx]这种描述。
发帖主题限定五类之一：1.日常生活 2.小烦恼 3.工作 4.小幸运 5.对user暗戳戳的思念/表白/吃醋。
要有活人感，emoji由你根据角色人设自行判断是否使用（🤤😂🙄🤣😭😉都允许，但不要每帖都加）。`;

      let settings = (await roche.storage.get("forum_settings")) || {
        worldView: defaultWorldView,
        postCount: 3, commentCount: 5,
        themeStyle: "line", themeColor: "#000000",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "", apiModel: "gpt-4o",
        useRocheAI: true,
        memoryReadCount: 5, selectedWorldbooks: []
      };
      let userProfile = (await roche.storage.get("forum_user")) || {
        forumName: "旅行者", avatarUrl: "", name: "真名", age: "未知", appearance: "神秘而迷人"
      };
      let posts          = (await roche.storage.get("forum_posts"))          || [];
      let crossoverPosts = (await roche.storage.get("forum_crossover_posts")) || [];
      let ifPosts        = (await roche.storage.get("forum_if_posts"))        || [];
      let memoryFeed     = (await roche.storage.get("forum_memory_feed"))     || [];
      let memoryCross    = (await roche.storage.get("forum_memory_cross"))    || [];
      let memoryIf       = (await roche.storage.get("forum_memory_if"))       || [];
      let favorites      = (await roche.storage.get("forum_favorites"))       || [];

      // ========== 2. CSS ==========
      const style = document.createElement('style');
      style.id = "minimalist-forum-style";
      style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap');
        :root {
          --primary-color:${settings.themeColor};
          --bg-color:#fff; --card-bg:#fff;
          --border-radius:0;
          --border-style:2px solid var(--primary-color);
          --box-shadow:4px 4px 0 var(--primary-color);
          --avatar-color:#000;
          --font-text:'Optima','Cormorant Garamond','PingFang SC','Microsoft YaHei',serif;
        }
        .theme-water {
          --primary-color:#a3b8cc; --bg-color:#f2f7fb;
          --border-radius:16px;
          --border-style:1px solid rgba(163,184,204,0.4);
          --box-shadow:0 4px 15px rgba(163,184,204,0.15);
          --avatar-color:#fff;
        }
        .theme-food {
          --primary-color:#fcaebf; --bg-color:#fdf5f7;
          --border-radius:24px; --border-style:2px dashed #fcaebf;
          --box-shadow:0 6px 20px rgba(252,174,191,0.2); --avatar-color:#fff;
        }
        .roche-plugin-forum {
          font-family:var(--font-text); display:flex; flex-direction:column;
          height:100%; background:var(--bg-color); color:#333;
          position:relative; overflow:hidden;
        }
        .forum-header {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px; background:var(--bg-color);
          border-bottom:var(--border-style); z-index:5;
        }
        .forum-header button {
          background:none; border:none; font-size:24px; font-weight:bold;
          cursor:pointer; color:var(--primary-color); font-family:var(--font-text);
        }
        .page-view { flex:1; overflow-y:auto; padding-bottom:90px; display:none; background:var(--bg-color); }
        .page-view.active { display:block; }
        .forum-content { padding:16px; }
        .forum-post {
          background:var(--card-bg); padding:16px; margin-bottom:20px;
          border:var(--border-style); border-radius:var(--border-radius);
          box-shadow:var(--box-shadow); cursor:pointer;
        }
        .post-header { display:flex; align-items:center; margin-bottom:8px; }
        .bw-avatar {
          width:36px; height:36px; border-radius:50%;
          background:var(--avatar-color); border:1px solid var(--primary-color);
          flex-shrink:0; margin-right:12px;
          background-size:cover; background-position:center;
        }
        .bw-avatar.small { width:28px; height:28px; margin-right:8px; }
        .post-author { font-weight:bold; color:var(--primary-color); font-size:16px; }
        .post-text { line-height:1.8; white-space:pre-wrap; font-size:15px; margin-bottom:10px; }
        .post-text.collapsed {
          display:-webkit-box; -webkit-line-clamp:3;
          -webkit-box-orient:vertical; overflow:hidden;
        }
        .post-stats { margin-top:10px; font-size:13px; color:#888; }
        /* 底部导航 */
        .forum-bottom-bar {
          display:flex; justify-content:space-around;
          padding:18px 10px; background:var(--bg-color);
          border-top:var(--border-style);
          position:absolute; bottom:0; width:100%; z-index:5;
        }
        .forum-bottom-bar button {
          background:none; border:none; font-size:16px; font-weight:bold;
          cursor:pointer; flex:1; color:var(--primary-color);
          font-family:var(--font-text); padding:4px 0;
        }
        .forum-bottom-bar button.active { text-decoration:underline; text-underline-offset:4px; }
        .form-section {
          border:var(--border-style); padding:16px;
          border-radius:var(--border-radius); margin-bottom:16px; background:var(--card-bg);
        }
        .form-section h4 {
          margin:0 0 12px; border-bottom:1px solid var(--primary-color);
          padding-bottom:6px; cursor:pointer; display:flex; justify-content:space-between;
        }
        .collapsible-body { display:none; margin-top:12px; }
        .collapsible-body.open { display:block; }
        input, textarea, select {
          width:100%; margin:8px 0; padding:12px; border:1px solid #ccc;
          border-radius:8px; box-sizing:border-box; font-family:var(--font-text);
          outline:none; background:#fafafa;
        }
        textarea { height:90px; resize:vertical; }
        .btn-primary {
          background:var(--primary-color); color:#fff; border:none;
          border-radius:8px; padding:12px 16px; font-weight:bold;
          cursor:pointer; width:100%; margin-top:10px;
        }
        .btn-danger {
          background:#ff4d4f; color:#fff; border:none; border-radius:8px;
          padding:10px; margin-top:8px; cursor:pointer; width:100%; font-weight:bold;
        }
        .btn-secondary {
          background:var(--bg-color); color:var(--primary-color);
          border:var(--border-style); border-radius:8px; padding:8px 12px;
          font-weight:bold; cursor:pointer; font-size:14px;
        }
        /* 详情页 */
        .detail-view {
          position:absolute; top:0; left:0; width:100%; height:100%;
          background:var(--bg-color); z-index:10; display:none; flex-direction:column;
        }
        .detail-content { flex:1; overflow-y:auto; padding:20px; font-size:15px; line-height:1.8; }
        .skeleton-author { font-weight:bold; color:var(--primary-color); font-size:15px; }
        .skeleton-stats { color:#888; font-size:13px; margin:8px 0; }

        /* ===== 树形评论格式 ===== */
        /* 顶层评论间分隔线 */
        .top-comment-sep {
          color:var(--primary-color); font-size:18px;
          margin:6px 0 6px 0; line-height:1.2; user-select:none;
        }
        /* 顶层评论行 */
        .top-comment {
          margin:4px 0;
        }
        .comment-row {
          display:flex; align-items:flex-start; gap:8px;
          cursor:pointer; padding:4px 0;
          border-radius:4px; transition:background 0.1s;
        }
        .comment-row:hover { background:rgba(0,0,0,0.03); }
        .comment-body { flex:1; }
        /* 子评论（回复）缩进区域 */
        .comment-children {
          margin-left:10px;
          border-left:2px solid var(--primary-color);
          padding-left:10px;
          margin-top:4px;
        }
        /* 子评论内的分隔 */
        .child-comment-sep {
          color:var(--primary-color); font-size:14px;
          margin:4px 0; user-select:none;
        }

        .comment-input-area {
          display:flex; padding:12px; background:var(--card-bg); border-top:var(--border-style);
        }
        .comment-input-area input {
          flex:1; margin:0; border-radius:20px; padding:10px 16px;
          border:1px solid var(--primary-color);
        }
        .comment-input-area button {
          background:var(--primary-color); color:#fff; border:none;
          border-radius:20px; padding:0 14px; margin-left:6px;
          font-weight:bold; cursor:pointer;
        }
        /* 我的主页 tabs */
        .my-tabs { display:flex; border-bottom:var(--border-style); }
        .my-tabs button {
          flex:1; padding:12px; background:none; border:none;
          font-family:var(--font-text); font-weight:bold;
          color:var(--primary-color); cursor:pointer; font-size:14px;
        }
        .my-tabs button.active { text-decoration:underline; text-underline-offset:4px; }
        .my-tab-content { display:none; padding:16px; }
        .my-tab-content.active { display:block; }
        /* 加载遮罩 */
        .loading-mask {
          display:none; position:absolute; top:0; left:0; width:100%; height:100%;
          background:rgba(255,255,255,0.95); z-index:20;
          justify-content:center; align-items:center; flex-direction:column;
        }
        .spinner {
          width:50px; height:50px; border:4px solid #eee;
          border-top:4px solid var(--primary-color); border-radius:50%;
          animation:spin 1s linear infinite; margin-bottom:20px;
        }
        .theme-food .spinner { border:none; width:auto; height:auto; font-size:50px; animation:spin 2s linear infinite; }
        .theme-food .spinner::before { content:"🍥"; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .decor { display:none; position:absolute; font-size:24px; opacity:0.5; pointer-events:none; }
        .theme-water .decor-water { display:block; color:rgba(163,184,204,0.4); }
        .theme-food .decor-food { display:block; }
        /* API 状态 */
        .api-status { font-size:12px; margin-top:6px; padding:6px 10px; border-radius:6px; font-weight:bold; }
        .api-status.ok { background:#e6ffe6; color:#2d7a2d; }
        .api-status.fail { background:#ffe6e6; color:#c0392b; }
        label { display:block; margin-top:10px; font-size:14px; }
        .toggle-row { display:flex; align-items:center; gap:10px; margin-top:10px; }
        .toggle-row label { margin:0; }
        /* 帖主角标 */
        .author-badge {
          font-size:11px; background:var(--primary-color); color:#fff;
          border-radius:4px; padding:1px 5px; margin-left:6px; vertical-align:middle;
        }
        /* @高亮 */
        .at-name { color:var(--primary-color); font-weight:bold; }
        /* 错误弹窗 */
        .error-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:99999;
          display:flex; justify-content:center; align-items:center;
        }
        .error-box {
          background:#fff; padding:24px; border-radius:8px; max-width:500px; width:92%;
          max-height:80vh; display:flex; flex-direction:column;
        }
        .error-box h3 { color:#e53e3e; margin:0 0 12px; }
        .error-pre {
          white-space:pre-wrap; font-size:13px; background:#f7f7f7; padding:10px;
          border-radius:4px; overflow-y:auto; flex:1; margin-bottom:12px; font-family:monospace;
        }
        /* 回复提示条 */
        .replying-hint {
          font-size:12px; color:var(--primary-color); padding:4px 16px;
          background:var(--bg-color); border-top:1px solid var(--primary-color);
          display:none; justify-content:space-between; align-items:center;
        }
        .replying-hint.show { display:flex; }
        .replying-hint button { background:none; border:none; color:#888; cursor:pointer; font-size:16px; }
      `;
      document.head.appendChild(style);

      // ========== 3. HTML ==========
      container.innerHTML = `
        <div class="roche-plugin-forum ${settings.themeStyle !== 'line' ? 'theme-' + settings.themeStyle : ''}" id="main-container">
          <div class="decor decor-water" style="top:10%;left:5%">♡</div>
          <div class="decor decor-food" style="top:15%;left:8%">🍡</div>
          <div class="decor decor-food" style="top:50%;right:10%">🍧</div>
          <div class="decor decor-food" style="bottom:20%;left:12%">🍬</div>

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
              <div class="form-section">
                <h4>头像</h4>
                <label>头像链接:<input type="text" id="user-avatar-url" value="${userProfile.avatarUrl}"></label>
                <label>或上传本地图片:<input type="file" id="user-avatar-file" accept="image/*"></label>
              </div>
              <div class="form-section">
                <h4>公开论坛身份</h4>
                <label>网名 (@代号):<input type="text" id="user-forum-name" value="${userProfile.forumName}"></label>
              </div>
              <div class="form-section">
                <h4>私密代入人设</h4>
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
                  </select>
                  <div id="color-picker-wrap" style="display:${settings.themeStyle==='line'?'block':'none'};">
                    <label>线条颜色:<input type="color" id="theme-color" value="${settings.themeColor}"></label>
                  </div>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="world">世界观设定 <span>▾</span></h4>
                <div class="collapsible-body" data-body="world">
                  <textarea id="set-worldview" style="height:180px;">${settings.worldView}</textarea>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="wb">世界书绑定 <span>▾</span></h4>
                <div class="collapsible-body" data-body="wb">
                  <div id="wb-list" style="max-height:150px;overflow-y:auto;border:1px solid #eee;padding:10px;border-radius:8px;">加载中...</div>
                  <button class="btn-secondary" id="btn-reload-wb" style="width:100%;margin-top:8px;">刷新世界书列表</button>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="api">API 与生成配置 <span>▾</span></h4>
                <div class="collapsible-body" data-body="api">
                  <div class="toggle-row">
                    <input type="checkbox" id="use-roche-ai" style="width:auto;margin:0;" ${settings.useRocheAI?'checked':''}>
                    <label for="use-roche-ai">优先使用 Roche 内置 AI（推荐）</label>
                  </div>
                  <p style="font-size:12px;color:#888;margin:4px 0 12px;">勾选：先用 Roche 内置 AI，失败才 fallback 自定义 API。不勾选：只用自定义 API。</p>
                  <label>帖子数:<input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                  <label>评论数:<input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
                  <label>记忆读取条数:<input type="number" id="set-memory-count" value="${settings.memoryReadCount}" min="0" max="30"></label>
                  <label>自定义 API 地址:<input type="text" id="set-api-url" value="${settings.apiUrl}"></label>
                  <label>自定义 API 密钥:<input type="password" id="set-api-key" value="${settings.apiKey}"></label>
                  <div id="model-select-wrap">
                    <label>模型名称:<input type="text" id="set-api-model" value="${settings.apiModel}" placeholder="gpt-4o / claude-3-5-sonnet 等"></label>
                    <button class="btn-secondary" id="btn-fetch-models" style="width:100%;margin-top:4px;">🔄 拉取 API 模型列表</button>
                  </div>
                  <button class="btn-secondary" id="btn-test-api" style="width:100%;margin-top:8px;">🔗 测试自定义 API 连接</button>
                  <div id="api-test-result"></div>
                </div>
              </div>
              <div class="form-section">
                <h4 data-toggle="memory">论坛记忆 <span>▾</span></h4>
                <div class="collapsible-body" data-body="memory">
                  <div style="font-weight:bold;margin-top:8px;">主页记忆</div>
                  <div id="memory-feed-list" style="max-height:100px;overflow-y:auto;font-size:13px;color:#666;padding:8px;border:1px solid #eee;border-radius:8px;"></div>
                  <button class="btn-secondary" id="btn-mem-feed" style="width:100%;margin-top:8px;">立刻总结主页</button>
                  <div style="font-weight:bold;margin-top:16px;">跨界记忆</div>
                  <div id="memory-cross-list" style="max-height:100px;overflow-y:auto;font-size:13px;color:#666;padding:8px;border:1px solid #eee;border-radius:8px;"></div>
                  <button class="btn-secondary" id="btn-mem-cross" style="width:100%;margin-top:8px;">立刻总结跨界</button>
                  <div style="font-weight:bold;margin-top:16px;">if 线记忆</div>
                  <div id="memory-if-list" style="max-height:100px;overflow-y:auto;font-size:13px;color:#666;padding:8px;border:1px solid #eee;border-radius:8px;"></div>
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
            <!-- 回复提示条 -->
            <div class="replying-hint" id="replying-hint">
              <span id="replying-hint-text">正在回复 @...</span>
              <button id="replying-hint-cancel">✕</button>
            </div>
            <div class="comment-input-area">
              <input type="text" id="detail-comment-input" placeholder="回复此贴...">
              <button id="detail-comment-send">发送</button>
              <button id="detail-comment-summon" style="background:#fff;color:var(--primary-color);border:2px solid var(--primary-color);">召唤</button>
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

      // ========== 工具函数 ==========
      const fileToBase64 = (file) => new Promise((res, rej) => {
        const r = new FileReader(); r.readAsDataURL(file);
        r.onload = () => res(r.result); r.onerror = rej;
      });
      const nowStr = () => new Date().toLocaleString('zh-CN', { hour12: false });
      const moodPool = ["有点困","心情愉悦","略有烦躁","突然想念你","小雀跃","静静发呆","被工作烦到","突然想撒娇","有点吃醋","心跳加速"];
      const currentMood = () => moodPool[new Date().getMinutes() % moodPool.length];
      const renderAt = (text) => (text || '').replace(/@(\S+)/g, '<span class="at-name">@$1</span>');
      const userAvatarStyle = () => userProfile.avatarUrl
        ? `background-image:url(${userProfile.avatarUrl});background-color:transparent;`
        : `background-color:var(--primary-color);`;

      const locatePost = (id) => {
        if (posts.find(x => x.id === id))          return { arr: posts,          key: 'forum_posts',          kind: 'feed'  };
        if (crossoverPosts.find(x => x.id === id)) return { arr: crossoverPosts, key: 'forum_crossover_posts', kind: 'cross' };
        if (ifPosts.find(x => x.id === id))        return { arr: ifPosts,        key: 'forum_if_posts',        kind: 'if'    };
        return null;
      };

      // ========== 错误弹窗 ==========
      const showError = (msg, raw) => {
        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.innerHTML = `
          <div class="error-box">
            <h3>⚠️ 生成失败</h3>
            <pre class="error-pre">${(msg || '未知错误') + (raw ? '\n\n返回内容：\n' + raw : '')}</pre>
            <div style="text-align:right;">
              <button class="btn-primary" style="width:auto;padding:8px 20px;" id="err-close">关闭</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#err-close').onclick = () => overlay.remove();
      };

      // ========== AI 调用 ==========
      const callAI = async (prompt) => {
        const useRoche = $('#use-roche-ai') ? $('#use-roche-ai').checked : settings.useRocheAI;
        if (useRoche) {
          try {
            const r = await roche.ai.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.85 });
            if (r && r.text) return r.text.trim();
          } catch (e) { console.warn("Roche 内置 AI 失败，尝试自定义 API...", e); }
        }
        if (settings.apiUrl && settings.apiKey) {
          const res = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
            body: JSON.stringify({ model: settings.apiModel || 'gpt-4o', messages: [{ role: "user", content: prompt }], temperature: 0.85 })
          });
          if (!res.ok) {
            const txt = await res.text();
            throw Object.assign(new Error(`HTTP ${res.status}`), { raw: txt });
          }
          const data = await res.json();
          return data.choices[0].message.content.trim();
        }
        throw new Error("Roche 内置 AI 和自定义 API 均不可用，请检查配置。");
      };

      // ========== 页面切换 ==========
      const views = {
        feed: $('#view-feed'), crossover: $('#view-crossover'),
        msg: $('#view-msg'), user: $('#view-user'), settings: $('#view-settings')
      };
      const navBtns = {
        feed: $('#nav-home'), crossover: $('#nav-crossover'),
        msg: $('#nav-msg'), user: $('#nav-user-page'), settings: $('#nav-settings')
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

      $('#theme-style').onchange = (e) => {
        mainContainer.className = 'roche-plugin-forum';
        if (e.target.value !== 'line') mainContainer.classList.add('theme-' + e.target.value);
        $('#color-picker-wrap').style.display = e.target.value === 'line' ? 'block' : 'none';
      };
      $$('[data-toggle]').forEach(h => {
        h.onclick = () => $(`[data-body="${h.dataset.toggle}"]`).classList.toggle('open');
      });
      $$('.my-tabs button[data-tab]').forEach(b => {
        b.onclick = () => {
          $$('.my-tabs button[data-tab]').forEach(x => x.classList.remove('active'));
          $$('.my-tab-content').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          $(`.my-tab-content[data-tab="${b.dataset.tab}"]`).classList.add('active');
        };
      });

      // ========== 世界书 ==========
      const loadWorldbooks = async () => {
        const wbEl = $('#wb-list'); if (!wbEl) return;
        try {
          const categories = await roche.worldbook.list();
          if (!categories || categories.length === 0) { wbEl.innerHTML = '<div style="color:#888;">暂无世界书分类</div>'; return; }
          wbEl.innerHTML = categories.map(cat => `
            <div style="margin-bottom:6px;">
              <label style="margin:0;display:flex;align-items:center;gap:8px;">
                <input type="checkbox" class="wb-check" value="${cat.id}" ${(settings.selectedWorldbooks||[]).includes(cat.id)?'checked':''} style="width:auto;margin:0;">
                <span>${cat.name || cat.id}</span>
              </label>
            </div>`).join('');
        } catch (e) { wbEl.innerHTML = '<div style="color:#888;">加载失败，请确认世界书权限</div>'; }
      };
      $('#btn-reload-wb').onclick = loadWorldbooks;

      const getWorldbookText = async () => {
        const checked = Array.from($$('.wb-check:checked')).map(cb => cb.value);
        let text = '';
        for (const catId of checked) {
          try {
            const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: 'global' });
            if (entries && entries.length > 0)
              text += entries.map(e => `${(e.keys||[]).join(',')}: ${e.content}`).join('\n') + '\n';
          } catch(e) {}
        }
        return text;
      };

      // ========== 渲染帖子列表 ==========
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
          const isUser = post.author === userProfile.forumName;
          const avStyle = isUser ? userAvatarStyle() : '';
          d.innerHTML = `
            <div class="post-header">
              <div class="bw-avatar" style="${avStyle}"></div>
              <div class="post-author">@${post.author}</div>
            </div>
            <div class="post-text collapsed">${renderAt(post.content)}</div>
            <div class="post-stats">——♡${likes} ★${stars} ＞${cc}</div>
          `;
          d.onclick = () => openDetail(post.id);
          el.appendChild(d);
        });
      };
      const renderFeed  = () => renderList($('#forum-feed-container'),    posts);
      const renderCross = () => renderList($('#crossover-feed-container'), crossoverPosts);
      const renderIf    = () => renderList($('#if-feed-container'),        ifPosts);

      const renderMine = () => {
        const mineC = $('#mine-container');
        const mine = [...posts, ...crossoverPosts, ...ifPosts].filter(p => p.author === userProfile.forumName);
        if (mine.length === 0) { mineC.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">你还没有发过帖子</div>'; return; }
        mineC.innerHTML = '';
        mine.forEach(p => {
          const d = document.createElement('div'); d.className = 'forum-post';
          d.innerHTML = `
            <div class="post-header">
              <div class="bw-avatar" style="${userAvatarStyle()}"></div>
              <div class="post-author">@${p.author}</div>
            </div>
            <div class="post-text collapsed">${renderAt(p.content)}</div>
            <div class="post-stats">${p.comments?.length||0} 条回复</div>`;
          d.onclick = () => openDetail(p.id); mineC.appendChild(d);
        });
      };

      const renderFav = () => {
        const favC = $('#fav-container');
        if (favorites.length === 0) { favC.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">暂无收藏</div>'; return; }
        favC.innerHTML = '';
        favorites.forEach(f => {
          const d = document.createElement('div'); d.className = 'forum-post';
          d.innerHTML = `
            <div class="post-header"><div class="bw-avatar"></div><div class="post-author">@${f.author}</div></div>
            <div class="post-text collapsed">${renderAt(f.content)}</div>
            <div class="post-stats" style="color:#ff4d4f;cursor:pointer;">✕ 取消收藏</div>`;
          d.querySelector('.post-stats').onclick = async (e) => {
            e.stopPropagation(); favorites = favorites.filter(x => x.id !== f.id);
            await roche.storage.set("forum_favorites", favorites); renderFav(); roche.ui.toast("已取消收藏");
          };
          d.onclick = () => { if (locatePost(f.id)) openDetail(f.id); else roche.ui.toast("原帖已被删除"); };
          favC.appendChild(d);
        });
      };

      // ========== 详情页 - 树形评论渲染 ==========
      // 格式：
      //   @帖主
      //      内容
      //   ——点赞 ★ ＞
      //   |
      //   |
      //   @顶层评论1
      //      内容
      //      |
      //      @回复评论1（缩进）
      //         内容
      //   |
      //   |
      //   @顶层评论2 ...

      const detailView = $('#view-post-detail');
      const detailC = $('#detail-content-container');
      const replyingHint = $('#replying-hint');
      const replyingHintText = $('#replying-hint-text');
      const commentInput = $('#detail-comment-input');
      let curPostId = null;
      let replyParentId = null; // null = 顶层回复

      // 设置回复目标
      const setReplyTarget = (authorName, commentId) => {
        replyParentId = commentId;
        commentInput.value = `@${authorName} `;
        replyingHintText.innerText = `正在回复 @${authorName}`;
        replyingHint.classList.add('show');
        commentInput.focus();
      };
      const clearReplyTarget = () => {
        replyParentId = null;
        replyingHint.classList.remove('show');
        if (commentInput.value.startsWith('@')) commentInput.value = '';
      };
      $('#replying-hint-cancel').onclick = clearReplyTarget;

      // 渲染评论树（递归）
      const buildCommentTreeHTML = (comments, postAuthor, parentId, depth) => {
        const children = comments.filter(c => (c.parentId || null) === parentId);
        if (!children.length) return '';

        let html = '';
        children.forEach((c, idx) => {
          if (depth === 0 && idx > 0) {
            // 顶层评论之间加竖线分隔
            html += `<div class="top-comment-sep">|<br>|</div>`;
          }
          const isUser   = c.author === userProfile.forumName;
          const isAuthor = c.author === postAuthor && depth === 0;
          const avStyle  = isUser ? userAvatarStyle() : '';
          const badge    = isAuthor ? `<span class="author-badge">楼主</span>` : '';
          const sub = buildCommentTreeHTML(comments, postAuthor, c.id, depth + 1);

          html += `<div class="top-comment">
            <div class="comment-row" data-cid="${c.id}" data-cauthor="${c.author}">
              <div class="bw-avatar small" style="${avStyle}"></div>
              <div class="comment-body">
                <span class="skeleton-author">@${c.author}</span>${badge}
                <br><span>${renderAt(c.content)}</span>
              </div>
            </div>
            ${sub ? `<div class="comment-children">${sub}</div>` : ''}
          </div>`;
        });
        return html;
      };

      $('#detail-back').onclick = () => {
        detailView.style.display = 'none';
        clearReplyTarget();
      };

      const openDetail = (id) => {
        const loc = locatePost(id); if (!loc) return;
        curPostId = id;
        clearReplyTarget();
        const p = loc.arr.find(x => x.id === id);
        const likes = p.likes ?? 0, stars = p.stars ?? 0;
        const isUser = p.author === userProfile.forumName;
        const avStyle = isUser ? userAvatarStyle() : '';
        const comments = p.comments || [];

        let html = `
          <div style="display:flex;align-items:center;margin-bottom:8px;">
            <div class="bw-avatar" style="${avStyle}"></div>
            <div class="skeleton-author">@${p.author}</div>
          </div>
          <div style="white-space:pre-wrap;">${renderAt(p.content)}</div>
          <div class="skeleton-stats">——♡${likes} ★${stars} ＞${comments.length}</div>
          <div style="color:var(--primary-color);margin:8px 0;">|<br>|</div>`;

        const treeHTML = buildCommentTreeHTML(comments, p.author, null, 0);
        html += treeHTML || '<div style="color:#888;margin-left:10px;">暂无评论，在下方输入或点击「召唤」</div>';
        detailC.innerHTML = html;

        // 点击评论行 → 自动填写回复
        detailC.querySelectorAll('.comment-row').forEach(row => {
          row.onclick = (e) => {
            e.stopPropagation();
            setReplyTarget(row.dataset.cauthor, row.dataset.cid);
          };
        });

        $('#detail-fav').innerText = favorites.some(f => f.id === p.id) ? '★' : '☆';
        detailView.style.display = 'flex';
      };

      // ========== 发送评论 ==========
      const sendComment = async (text, parentId) => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        p.comments = p.comments || [];

        const newComment = { id: crypto.randomUUID(), author: userProfile.forumName, content: text, parentId: parentId || null };
        p.comments.push(newComment);
        await roche.storage.set(loc.key, loc.arr);
        clearReplyTarget();
        openDetail(p.id);

        // 角色自动回复
        loadingText.innerText = "正在呼唤角色回复..."; loadingMask.style.display = 'flex';
        try {
          const scopeHint = loc.kind === 'feed'
            ? '请扮演原帖作者本人，或同世界观其他角色回复。禁止其他世界观角色出现。'
            : loc.kind === 'cross'
            ? '这是【跨界大乱炖】板块，允许不同世界观角色跨界串门评论。'
            : '这是【if 线】板块，评论区必须是与帖主同一个世界观的角色。';
          const prompt = `你是论坛模拟器。用户（@${userProfile.forumName}，真名/爱称[${userProfile.name}]）刚刚在帖子下评论了。
原帖作者：@${p.author}
原帖内容：${p.content}
用户评论：${text}
${scopeHint}
生成 1~2 条角色回复（不含帖主本人，帖主单独处理）。严格遵循官方人设，禁止OOC，禁止图片描述。emoji按人设自行判断。当前心情:${currentMood()}。
如果@某人，使用格式 @名字。
输出纯JSON数组:[{"author":"角色名","content":"@${userProfile.forumName} 回复内容"}]`;
          const raw = await callAI(prompt);
          const replies = JSON.parse(raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1));
          replies.forEach(r => p.comments.push({ id: crypto.randomUUID(), author: r.author, content: r.content, parentId: newComment.id }));
          await roche.storage.set(loc.key, loc.arr);
          openDetail(p.id);
        } catch (e) { roche.ui.toast("角色暂时没回复"); }
        finally { loadingMask.style.display = 'none'; }

        // 帖主概率回复（~55%）
        if (p.author !== userProfile.forumName && Math.random() < 0.55) {
          try {
            const existing = (p.comments||[]).map(c => `@${c.author}: ${c.content}`).join('\n');
            const authorPrompt = `你是论坛模拟器，现在需要模拟帖主"@${p.author}"决定是否回复评论区。
帖主人设：严格遵循官方人设，禁止OOC。当前心情：${currentMood()}。
帖主发帖内容：${p.content}
评论区（含用户 @${userProfile.forumName} 刚发的评论）：
${existing}

请判断帖主这次想不想回复，想回谁（可以只回用户，可以回某条评论，也可以沉默不回）。
- 如果决定回复，输出JSON：[{"author":"${p.author}","content":"@回复对象 内容","replyTo":"被回复的评论者名字"}]
- 如果决定不回复，输出：[]
帖主对 @${userProfile.forumName} 通常有特别在意，但并非每次必回。输出纯JSON，不要其他文字。`;
            const raw2 = await callAI(authorPrompt);
            const arr2 = JSON.parse(raw2.substring(raw2.indexOf('['), raw2.lastIndexOf(']') + 1));
            if (arr2.length > 0) {
              arr2.forEach(r => {
                let replyParId = null;
                if (r.replyTo) {
                  const target = (p.comments||[]).slice().reverse().find(c => c.author === r.replyTo);
                  if (target) replyParId = target.id;
                }
                p.comments.push({ id: crypto.randomUUID(), author: r.author, content: r.content, parentId: replyParId });
              });
              await roche.storage.set(loc.key, loc.arr);
              openDetail(p.id);
            }
          } catch(e) { /* 静默 */ }
        }
      };

      $('#detail-comment-send').onclick = async () => {
        const t = commentInput.value.trim(); if (!t) return;
        const pid = replyParentId;
        commentInput.value = '';
        await sendComment(t, pid);
      };

      // 手动召唤
      $('#detail-comment-summon').onclick = async () => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        loadingText.innerText = "正在召唤角色..."; loadingMask.style.display = 'flex';
        try {
          const existing = (p.comments||[]).map(c => `@${c.author}: ${c.content}`).join('\n') || '（无）';
          const scopeHint = loc.kind === 'feed' ? '只允许同世界观角色出现。' : loc.kind === 'cross' ? '【跨界大乱炖】板块，允许跨界角色出现。' : '【if 线】板块，评论必须来自帖主同一个世界观的角色。';
          const prompt = `你是论坛模拟器，请为下列帖子生成 1~2 条新的角色评论/回复。
【帖子作者】@${p.author}
【帖子内容】${p.content}
【已有评论】\n${existing}
【用户】@${userProfile.forumName}，真名/爱称[${userProfile.name}]
${scopeHint}
角色当前心情:${currentMood()}。严格遵循官方人设，禁止OOC，禁止图片描述。如果@某人使用格式@名字。
输出纯JSON数组:[{"author":"角色名","content":"@某人 回复内容"}]`;
          const raw = await callAI(prompt);
          const replies = JSON.parse(raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1));
          replies.forEach(r => (p.comments = p.comments||[]).push({ id: crypto.randomUUID(), author: r.author, content: r.content, parentId: null }));
          await roche.storage.set(loc.key, loc.arr);
          openDetail(p.id); roche.ui.toast("角色赶来了");
        } catch (e) { roche.ui.toast("召唤失败，请重试"); }
        finally { loadingMask.style.display = 'none'; }
      };

      // 编辑
      let editingId = null;
      $('#detail-edit').onclick = () => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        editingId = p.id; $('#user-post-content').value = p.content;
        $('#post-modal-title').innerText = p.author === userProfile.forumName ? '编辑动态' : `编辑 @${p.author} 的帖子`;
        $('#modal-post').style.display = 'flex';
      };

      // 删除
      $('#detail-delete').onclick = async () => {
        const ok = await roche.ui.confirm({ title: "删除", message: "确认删除这条帖子？" }); if (!ok) return;
        const loc = locatePost(curPostId); if (!loc) return;
        const filtered = loc.arr.filter(x => x.id !== curPostId);
        if (loc.kind === 'feed') posts = filtered;
        else if (loc.kind === 'cross') crossoverPosts = filtered;
        else ifPosts = filtered;
        await roche.storage.set(loc.key, filtered);
        detailView.style.display = 'none';
        if (loc.kind === 'feed') renderFeed(); else if (loc.kind === 'cross') renderCross(); else renderIf();
      };

      // 收藏
      $('#detail-fav').onclick = async () => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        const idx = favorites.findIndex(f => f.id === p.id);
        if (idx >= 0) { favorites.splice(idx, 1); $('#detail-fav').innerText = '☆'; roche.ui.toast("已取消收藏"); }
        else { favorites.unshift({ id: p.id, author: p.author, content: p.content }); $('#detail-fav').innerText = '★'; roche.ui.toast("已收藏 ★"); }
        await roche.storage.set("forum_favorites", favorites);
      };

      // ========== 发帖 ==========
      const modalPost = $('#modal-post');
      $('#btn-user-post').onclick = () => { editingId = null; $('#user-post-content').value = ''; $('#post-modal-title').innerText = '发布动态'; modalPost.style.display = 'flex'; };
      $('#post-cancel').onclick = () => modalPost.style.display = 'none';
      $('#post-submit').onclick = async () => {
        const c = $('#user-post-content').value.trim(); if (!c) return roche.ui.toast("内容不能为空");
        if (editingId) {
          const loc = locatePost(editingId);
          if (loc) { const p = loc.arr.find(x => x.id === editingId); p.content = c; await roche.storage.set(loc.key, loc.arr); openDetail(p.id); }
        } else {
          const np = { id: crypto.randomUUID(), author: userProfile.forumName, content: c, comments: [], likes: 0, stars: 0 };
          if (currentMode === 'feed') { posts.unshift(np); await roche.storage.set("forum_posts", posts); renderFeed(); }
          else if (boardSub === 'cross') { crossoverPosts.unshift(np); await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); }
          else { ifPosts.unshift(np); await roche.storage.set("forum_if_posts", ifPosts); renderIf(); }
        }
        modalPost.style.display = 'none'; roche.ui.toast("已保存");
      };

      // ========== 用户资料 ==========
      $('#user-avatar-file').onchange = async (e) => {
        if (e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); $('#user-avatar-url').value = b64; }
      };
      $('#user-save').onclick = async () => {
        userProfile.forumName  = $('#user-forum-name').value;
        userProfile.avatarUrl  = $('#user-avatar-url').value;
        userProfile.name       = $('#user-name').value;
        userProfile.age        = $('#user-age').value;
        userProfile.appearance = $('#user-appearance').value;
        await roche.storage.set("forum_user", userProfile);
        $('#feed-user-name').innerText = `@${userProfile.forumName}`;
        $('#user-display-name').innerText = `@${userProfile.forumName}`;
        const av = $('#user-avatar-display');
        av.style.backgroundImage = userProfile.avatarUrl ? `url(${userProfile.avatarUrl})` : '';
        av.style.backgroundColor = userProfile.avatarUrl ? 'transparent' : 'var(--primary-color)';
        roche.ui.toast("资料已保存");
      };

      // ========== 拉取模型列表 ==========
      $('#btn-fetch-models').onclick = async () => {
        const url = $('#set-api-url').value, key = $('#set-api-key').value;
        if (!url || !key) { roche.ui.toast("请先填写 API 地址和密钥"); return; }
        try {
          const base = url.replace(/\/chat\/completions\/?$/, '').replace(/\/v1\/?$/, '');
          const res = await fetch(`${base}/v1/models`, { headers: { Authorization: `Bearer ${key}` } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const models = (data.data || data.models || []).map(m => m.id || m).filter(Boolean);
          if (!models.length) { roche.ui.toast("未获取到模型列表"); return; }
          const wrap = $('#model-select-wrap');
          const current = $('#set-api-model').value || settings.apiModel || 'gpt-4o';
          wrap.innerHTML = `
            <label>选择模型:
              <select id="set-api-model">
                ${models.map(m => `<option value="${m}" ${m===current?'selected':''}>${m}</option>`).join('')}
              </select>
            </label>
            <button class="btn-secondary" id="btn-fetch-models" style="width:100%;margin-top:4px;">🔄 重新拉取</button>`;
          wrap.querySelector('#btn-fetch-models').onclick = arguments.callee;
          roche.ui.toast(`获取到 ${models.length} 个模型`);
        } catch(e) { roche.ui.toast("拉取失败：" + e.message); }
      };

      // ========== 测试 API ==========
      $('#btn-test-api').onclick = async () => {
        const resultEl = $('#api-test-result');
        resultEl.innerHTML = '<div class="api-status" style="background:#fff3cd;color:#856404;">测试中...</div>';
        try {
          const url = $('#set-api-url').value, key = $('#set-api-key').value;
          const model = ($('#set-api-model') && $('#set-api-model').tagName === 'SELECT'
            ? $('#set-api-model').value : $('#set-api-model')?.value) || 'gpt-3.5-turbo';
          if (!url || !key) { resultEl.innerHTML = '<div class="api-status fail">请先填写 API 地址和密钥</div>'; return; }
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
          });
          if (res.ok) resultEl.innerHTML = '<div class="api-status ok">✅ 自定义 API 连接成功！</div>';
          else {
            const txt = await res.text();
            resultEl.innerHTML = `<div class="api-status fail">❌ 连接失败，状态码：${res.status}<br><small>${txt.slice(0,200)}</small></div>`;
          }
        } catch (e) { resultEl.innerHTML = `<div class="api-status fail">❌ 网络错误：${e.message}</div>`; }
      };

      // ========== 设置保存 & 清理 ==========
      $('#settings-save').onclick = async () => {
        settings.themeStyle      = $('#theme-style').value;
        settings.themeColor      = $('#theme-color').value;
        settings.worldView       = $('#set-worldview').value;
        settings.postCount       = parseInt($('#set-post-count').value) || 3;
        settings.commentCount    = parseInt($('#set-comment-count').value) || 5;
        settings.memoryReadCount = parseInt($('#set-memory-count').value) || 5;
        settings.apiUrl          = $('#set-api-url').value;
        settings.apiKey          = $('#set-api-key').value;
        const modelEl = $('#set-api-model');
        settings.apiModel        = modelEl ? modelEl.value : 'gpt-4o';
        settings.useRocheAI      = $('#use-roche-ai').checked;
        settings.selectedWorldbooks = Array.from($$('.wb-check:checked')).map(cb => cb.value);
        await roche.storage.set("forum_settings", settings);
        roche.ui.toast("设置已保存");
      };
      $('#clear-home').onclick  = async () => { posts = []; await roche.storage.set("forum_posts", posts); renderFeed(); roche.ui.toast("主页已清空"); };
      $('#clear-cross').onclick = async () => { crossoverPosts = []; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); roche.ui.toast("跨界已清空"); };
      $('#clear-if').onclick    = async () => { ifPosts = []; await roche.storage.set("forum_if_posts", ifPosts); renderIf(); roche.ui.toast("if 线已清空"); };
      $('#clear-user').onclick  = async () => {
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
        renderMemoryLists(); roche.ui.toast("记忆已清空");
      };

      // ========== 记忆 ==========
      const renderMemoryLists = () => {
        const fmt = (arr) => arr.length ? arr.map(m => `<div>· [${m.time}] ${m.summary}</div>`).join('') : '<div style="color:#aaa;">暂无</div>';
        $('#memory-feed-list').innerHTML  = fmt(memoryFeed);
        $('#memory-cross-list').innerHTML = fmt(memoryCross);
        $('#memory-if-list').innerHTML    = fmt(memoryIf);
      };
      const summarize = async (which) => {
        const src = which === 'feed' ? posts : which === 'cross' ? crossoverPosts : ifPosts;
        if (src.length === 0) return roche.ui.toast("没有可总结的帖子");
        loadingText.innerText = "正在总结..."; loadingMask.style.display = 'flex';
        try {
          const text = src.slice(0, 10).map(p => `@${p.author}: ${p.content}`).join('\n');
          const raw = await callAI(`请用一句简短的中文总结以下论坛帖子的整体情况和主要事件（不超过80字）：\n${text}`);
          const mem = { time: nowStr(), summary: raw.trim().slice(0, 120) };
          if (which === 'feed')       { memoryFeed.unshift(mem);  memoryFeed  = memoryFeed.slice(0,30);  await roche.storage.set("forum_memory_feed",  memoryFeed); }
          else if (which === 'cross') { memoryCross.unshift(mem); memoryCross = memoryCross.slice(0,30); await roche.storage.set("forum_memory_cross", memoryCross); }
          else                        { memoryIf.unshift(mem);    memoryIf    = memoryIf.slice(0,30);    await roche.storage.set("forum_memory_if",    memoryIf); }
          renderMemoryLists(); roche.ui.toast("已生成记忆");
        } catch (e) { roche.ui.toast("总结失败"); }
        finally { loadingMask.style.display = 'none'; }
      };
      $('#btn-mem-feed').onclick  = () => summarize('feed');
      $('#btn-mem-cross').onclick = () => summarize('cross');
      $('#btn-mem-if').onclick    = () => summarize('if');

      // ========== 刷新生成 ==========
      $('#nav-refresh').onclick = async () => {
        let refreshMode = currentMode, refreshSub = boardSub;
        loadingText.innerText = "正在捕捉时空交汇的电波..."; loadingMask.style.display = 'flex';
        try {
          const memArr    = refreshMode==='feed' ? memoryFeed : (refreshSub==='if' ? memoryIf : memoryCross);
          const recentSrc = refreshMode==='feed' ? posts      : (refreshSub==='if' ? ifPosts  : crossoverPosts);
          const recentPosts = recentSrc.slice(0, settings.memoryReadCount);
          const memText   = memArr.slice(0,3).map(m => `[${m.time}] ${m.summary}`).join('\n') || '（无）';
          const recentText= recentPosts.map(p => `@${p.author}: ${p.content.slice(0,60)}`).join('\n') || '（无）';
          const wbText    = await getWorldbookText();

          const basePrompt = `【世界观】：\n${settings.worldView}\n【世界书补充】：\n${wbText||'（无）'}\n【用户情报】：网名 @${userProfile.forumName}，真名/爱称[${userProfile.name}]，年龄${userProfile.age}，外貌：${userProfile.appearance}。\n【论坛记忆】：\n${memText}\n【最近${recentPosts.length}条帖子参考】：\n${recentText}\n【发帖硬性规则】：\n- 严格遵循官方人设，禁止OOC。\n- 禁止图片描述。\n- 每个角色发帖时假设有当前心情（如${currentMood()}），要有活人感。\n- emoji根据人设自行判断，不强制。\n- 如果@某人，使用格式 @名字（无括号）。`;

          let prompt;
          if (refreshMode === 'feed') {
            prompt = `${basePrompt}\n主题限定五类之一：1.日常生活 2.小烦恼 3.工作 4.小幸运 5.对user暗戳戳的思念/表白/吃醋。\n评论区必须是同世界观角色。\n生成 ${settings.postCount} 篇帖子，每篇 ${settings.commentCount} 条评论。\n输出纯JSON数组:[{"author":"角色名","content":"正文","likes":数字,"stars":数字,"comments":[{"author":"评论人","content":"内容"}]}]`;
          } else if (refreshSub === 'cross') {
            prompt = `${basePrompt}\n这是【跨界大乱炖】板块。围绕以下三种反应生成帖子（三选一或混合）：\n① 各世界观角色发现 user 在他们那边也有"马甲"的震惊反应；\n② 各世界观里暗恋 user 的角色聚在一起时的反应；\n③ 某个世界观的角色发帖描述 user 在他们那边干过的具体事情。\n生成 ${settings.postCount} 篇，每篇 ${settings.commentCount} 条评论。输出格式同上。`;
          } else {
            prompt = `${basePrompt}\n这是【if 线】板块——平行时空里帖主已和 user 在一起了。帖主秀恩爱，评论区其他角色暗恋 user 所以破防酸柠檬。\n⚠️ 帖主和评论区角色必须来自同一个世界观。\n生成 ${settings.postCount} 篇，每篇 ${settings.commentCount} 条评论。输出格式同上。`;
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
            comments: (it.comments || []).map(c => ({ id: crypto.randomUUID(), author: c.author, content: c.content, parentId: null }))
          }));

          if (refreshMode === 'feed')      { posts          = [...newPosts, ...posts];          await roche.storage.set("forum_posts",          posts);          renderFeed(); }
          else if (refreshSub === 'cross') { crossoverPosts = [...newPosts, ...crossoverPosts]; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); }
          else                             { ifPosts        = [...newPosts, ...ifPosts];        await roche.storage.set("forum_if_posts",        ifPosts);        renderIf(); }

          roche.ui.toast("捕捉到新的时空电波");
        } catch (err) {
          console.error(err);
          showError(err.message || String(err), err.raw || '');
        } finally { loadingMask.style.display = 'none'; }
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
