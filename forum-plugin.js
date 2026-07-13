window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.8.1",
  apps: [{
    id: "minimalist-forum-app",
    name: "论坛主页",
    icon: "chat",
    async mount(container, roche) {
      const defaultWorldView = `围绕着游戏/动漫角色本人发帖（崩铁、原神、鸣潮、绝区零、王者、龙族、夜幕之下、斩神、诡秘之主、排球少年、蓝色监狱、死亡笔记、盗墓笔记、咒术回战、夏目友人帐、银魂、鬼灭之刃、坂本日常、电锯人等）。
$禁止OOC，严格遵循官方人设。
$角色全洁，从身到心，只喜欢user一人，不论男女。
$绝对代入向，禁止出现"星""莹"等主角原名，使用"开拓者""旅行者"或亲密爱称。
$评论区禁止出现"开拓者本人/旅行者本人"，user就是开拓者/旅行者本人。
$禁止发图片，禁止使用[翻开照片：xxx]这种描述。
发帖主题限定五类之一：1.日常生活 2.小烦恼 3.工作 4.小幸运 5.对user暗戳戳的思念/表白/吃醋。
要有活人感，emoji由你根据角色人设自行判断是否使用（🤤😂🙄🤣😭😉都允许，但不要每帖都加）。`;

      let settings = (await roche.storage.get("forum_settings")) || {
        worldView: defaultWorldView, postCount: 3, commentCount: 5,
        themeStyle: "line", themeColor: "#000000",
        apiUrl: "https://api.openai.com/v1/chat/completions", apiKey: "",
        memoryReadCount: 5
      };
      let userProfile = (await roche.storage.get("forum_user")) || {
        forumName: "旅行者", avatarUrl: "", name: "真名", age: "未知", appearance: "神秘而迷人"
      };
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
        :root { --primary-color:${settings.themeColor}; --bg-color:#fff; --card-bg:#fff; --border-radius:0; --border-style:2px solid var(--primary-color); --box-shadow:4px 4px 0 var(--primary-color); --avatar-color:#000; --font-text:'Optima','Cormorant Garamond','PingFang SC','Microsoft YaHei',serif; }
        .theme-water { --primary-color:#a3b8cc; --bg-color:#f2f7fb; --border-radius:16px; --border-style:1px solid rgba(163,184,204,0.4); --box-shadow:0 4px 15px rgba(163,184,204,0.15); --avatar-color:#fff; }
        .theme-food { --primary-color:#fcaebf; --bg-color:#fdf5f7; --border-radius:24px; --border-style:2px dashed #fcaebf; --box-shadow:0 6px 20px rgba(252,174,191,0.2); --avatar-color:#fff; }
        .roche-plugin-forum { font-family:var(--font-text); display:flex; flex-direction:column; height:100%; background:var(--bg-color); color:#333; position:relative; overflow:hidden; }
        .forum-header { display:flex; justify-content:space-between; align-items:center; padding:16px; background:var(--bg-color); border-bottom:var(--border-style); z-index:5; }
        .forum-header button { background:none; border:none; font-size:24px; font-weight:bold; cursor:pointer; color:var(--primary-color); font-family:var(--font-text); }
        .page-view { flex:1; overflow-y:auto; padding-bottom:80px; display:none; background:var(--bg-color); }
        .page-view.active { display:block; }
        .forum-content { padding:16px; }
        .forum-post { background:var(--card-bg); padding:16px; margin-bottom:20px; border:var(--border-style); border-radius:var(--border-radius); box-shadow:var(--box-shadow); cursor:pointer; }
        .post-header { display:flex; align-items:center; margin-bottom:8px; }
        .bw-avatar { width:36px; height:36px; border-radius:50%; margin-right:12px; background:var(--avatar-color); border:1px solid var(--primary-color); flex-shrink:0; }
        .bw-avatar.small { width:28px; height:28px; margin-right:8px; }
        .post-author { font-weight:bold; color:var(--primary-color); font-size:16px; }
        .post-text { line-height:1.8; white-space:pre-wrap; font-size:15px; margin-bottom:10px; }
        .post-text.collapsed { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .post-stats { margin-top:10px; font-size:13px; color:#888; }
        .forum-bottom-bar { display:flex; justify-content:space-around; padding:12px 10px; background:var(--bg-color); border-top:var(--border-style); position:absolute; bottom:0; width:100%; z-index:5; }
        .forum-bottom-bar button { background:none; border:none; font-size:16px; font-weight:bold; cursor:pointer; flex:1; color:var(--primary-color); font-family:var(--font-text); }
        .forum-bottom-bar button.active { text-decoration:underline; text-underline-offset:4px; }
        .form-section { border:var(--border-style); padding:16px; border-radius:var(--border-radius); margin-bottom:16px; background:var(--card-bg); }
        .form-section h4 { margin:0 0 12px; border-bottom:1px solid var(--primary-color); padding-bottom:6px; cursor:pointer; display:flex; justify-content:space-between; }
        .collapsible-body { display:none; margin-top:12px; }
        .collapsible-body.open { display:block; }
        input, textarea, select { width:100%; margin:8px 0; padding:12px; border:1px solid #ccc; border-radius:8px; box-sizing:border-box; font-family:var(--font-text); outline:none; background:#fafafa; }
        textarea { height:90px; resize:vertical; }
        .btn-primary { background:var(--primary-color); color:#fff; border:none; border-radius:8px; padding:12px 16px; font-weight:bold; cursor:pointer; width:100%; margin-top:10px; }
        .btn-danger { background:#ff4d4f; color:#fff; border:none; border-radius:8px; padding:10px; margin-top:8px; cursor:pointer; width:100%; font-weight:bold; }
        .btn-secondary { background:var(--bg-color); color:var(--primary-color); border:var(--border-style); border-radius:8px; padding:8px 12px; font-weight:bold; cursor:pointer; font-size:14px; }
        .detail-view { position:absolute; top:0; left:0; width:100%; height:100%; background:var(--bg-color); z-index:10; display:none; flex-direction:column; }
        .detail-content { flex:1; overflow-y:auto; padding:20px; font-size:15px; line-height:1.8; }
        .skeleton-author { font-weight:bold; color:var(--primary-color); font-size:16px; }
        .skeleton-stats { color:#888; font-size:13px; margin:10px 0; }
        .skeleton-comment { border-left:2px solid var(--primary-color); padding-left:10px; margin-top:8px; margin-left:10px; display:flex; gap:8px; align-items:flex-start; }
        .comment-input-area { display:flex; padding:12px; background:var(--card-bg); border-top:var(--border-style); }
        .comment-input-area input { flex:1; margin:0; border-radius:20px; padding:10px 16px; border:1px solid var(--primary-color); }
        .comment-input-area button { background:var(--primary-color); color:#fff; border:none; border-radius:20px; padding:0 14px; margin-left:6px; font-weight:bold; cursor:pointer; }
        .my-tabs { display:flex; border-bottom:var(--border-style); }
        .my-tabs button { flex:1; padding:12px; background:none; border:none; font-family:var(--font-text); font-weight:bold; color:var(--primary-color); cursor:pointer; font-size:14px; }
        .my-tabs button.active { text-decoration:underline; text-underline-offset:4px; }
        .my-tab-content { display:none; padding:16px; }
        .my-tab-content.active { display:block; }
        .loading-mask { display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.95); z-index:20; justify-content:center; align-items:center; flex-direction:column; }
        .spinner { width:50px; height:50px; border:4px solid #eee; border-top:4px solid var(--primary-color); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px; }
        .theme-food .spinner { border:none; width:auto; height:auto; font-size:50px; animation:spin 2s linear infinite; }
        .theme-food .spinner::before { content:"🍥"; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .decor { display:none; position:absolute; font-size:24px; opacity:0.5; pointer-events:none; }
        .theme-water .decor-water { display:block; color:rgba(163,184,204,0.4); }
        .theme-food .decor-food { display:block; }
        .api-status { font-size:12px; margin-top:6px; padding:6px 10px; border-radius:6px; font-weight:bold; }
        .api-status.ok { background:#e6ffe6; color:#2d7a2d; }
        .api-status.fail { background:#ffe6e6; color:#c0392b; }
      `;
      document.head.appendChild(style);

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
                    <option value="line" ${settings.themeStyle === 'line' ? 'selected' : ''}>经典复古：黑白立体线条</option>
                    <option value="water" ${settings.themeStyle === 'water' ? 'selected' : ''}>唯美纯净：水色 ♡</option>
                    <option value="food" ${settings.themeStyle === 'food' ? 'selected' : ''}>淡粉食物：少女心 🍥</option>
                  </select>
                  <div id="color-picker-wrap" style="display:${settings.themeStyle === 'line' ? 'block' : 'none'};">
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
                <h4 data-toggle="api">API 与生成配置 <span>▾</span></h4>
                <div class="collapsible-body" data-body="api">
                  <p style="font-size:13px;color:#888;margin:0 0 8px;">优先使用 Roche 内置 AI，若失败或未配置则使用下方自定义 API。</p>
                  <label>帖子数:<input type="number" id="set-post-count" value="${settings.postCount}" min="1" max="10"></label>
                  <label>评论数:<input type="number" id="set-comment-count" value="${settings.commentCount}" min="0" max="15"></label>
                  <label>记忆读取条数:<input type="number" id="set-memory-count" value="${settings.memoryReadCount}" min="0" max="30"></label>
                  <label>自定义 API 地址 (备用):<input type="text" id="set-api-url" value="${settings.apiUrl}"></label>
                  <label>自定义 API 密钥 (备用):<input type="password" id="set-api-key" value="${settings.apiKey}"></label>
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

      // ========== 页面切换 ==========
      const views = { feed: $('#view-feed'), crossover: $('#view-crossover'), msg: $('#view-msg'), user: $('#view-user'), settings: $('#view-settings') };
      const navBtns = { feed: $('#nav-home'), crossover: $('#nav-crossover'), msg: $('#nav-msg'), user: $('#nav-user-page'), settings: $('#nav-settings') };
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
      navBtns.settings.onclick = () => { switchView('settings', 'SETTINGS'); renderMemoryLists(); };

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

      // ========== 工具 ==========
      const fileToBase64 = (file) => new Promise((res, rej) => {
        const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res(r.result); r.onerror = rej;
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

      // ========== AI 调用（优先 Roche 内置，失败再用自定义 API）==========
      const callAI = async (prompt) => {
        // 1. 优先尝试 Roche 内置 AI
        try {
          const r = await roche.ai.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.85 });
          if (r && r.text) return r.text.trim();
        } catch (e) {
          console.warn("Roche 内置 AI 失败，尝试自定义 API...", e);
        }
        // 2. 内置失败，尝试自定义 API
        if (settings.apiUrl && settings.apiKey) {
          const res = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
            body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.85 })
          });
          const data = await res.json();
          return data.choices[0].message.content.trim();
        }
        throw new Error("Roche 内置 AI 和自定义 API 均不可用，请检查配置。");
      };

      // ========== 渲染列表 ==========
      const renderList = (el, data) => {
        el.innerHTML = '';
        if (data.length === 0) { el.innerHTML = '<div style="text-align:center;margin-top:50px;font-weight:bold;color:var(--primary-color);">暂无动态，点击右上角 ↻ 刷新生成</div>'; return; }
        data.forEach(post => {
          const d = document.createElement('div');
          d.className = 'forum-post';
          const likes = post.likes ?? 0, stars = post.stars ?? 0, cc = post.comments?.length || 0;
          d.innerHTML = `<div class="post-header"><div class="bw-avatar"></div><div class="post-author">@${post.author}</div></div><div class="post-text collapsed">${post.content}</div><div class="post-stats">——♡${likes} ★${stars} ＞${cc}</div>`;
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
          const d = document.createElement('div'); d.className = 'forum-post';
          d.innerHTML = `<div class="post-header"><div class="bw-avatar"></div><div class="post-author">@${p.author}</div></div><div class="post-text collapsed">${p.content}</div><div class="post-stats">${p.comments?.length || 0} 条回复</div>`;
          d.onclick = () => openDetail(p.id); mineC.appendChild(d);
        });
      };

      const renderFav = () => {
        const favC = $('#fav-container');
        if (favorites.length === 0) { favC.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">暂无收藏</div>'; return; }
        favC.innerHTML = '';
        favorites.forEach(f => {
          const d = document.createElement('div'); d.className = 'forum-post';
          d.innerHTML = `<div class="post-header"><div class="bw-avatar"></div><div class="post-author">@${f.author}</div></div><div class="post-text collapsed">${f.content}</div><div class="post-stats" style="color:#ff4d4f;cursor:pointer;">✕ 取消收藏</div>`;
          d.querySelector('.post-stats').onclick = async (e) => {
            e.stopPropagation(); favorites = favorites.filter(x => x.id !== f.id);
            await roche.storage.set("forum_favorites", favorites); renderFav(); roche.ui.toast("已取消收藏");
          };
          d.onclick = () => { if (locatePost(f.id)) openDetail(f.id); else roche.ui.toast("原帖已被删除"); };
          favC.appendChild(d);
        });
      };

      // ========== 详情页 ==========
      const detailView = $('#view-post-detail');
      const detailC = $('#detail-content-container');
      let curPostId = null;
      $('#detail-back').onclick = () => detailView.style.display = 'none';

      const openDetail = (id) => {
        const loc = locatePost(id); if (!loc) return;
        curPostId = id;
        const p = loc.arr.find(x => x.id === id);
        const likes = p.likes ?? 0, stars = p.stars ?? 0, cc = p.comments?.length || 0;
        let html = `<div style="display:flex;align-items:center;margin-bottom:8px;"><div class="bw-avatar"></div><div class="skeleton-author">@${p.author}</div></div><div style="white-space:pre-wrap;">${p.content}</div><div class="skeleton-stats">——♡${likes} ★${stars} ＞${cc}</div><div style="color:var(--primary-color);">|<br>|</div>`;
        if (p.comments?.length) {
          p.comments.forEach(c => { html += `<div class="skeleton-comment"><div class="bw-avatar small"></div><div><span class="skeleton-author">@${c.author}</span><br><span>${c.content}</span></div></div>`; });
        } else { html += `<div style="color:#888;margin-left:10px;">暂无评论</div>`; }
        detailC.innerHTML = html;
        $('#detail-fav').innerText = favorites.some(f => f.id === p.id) ? '★' : '☆';
        detailView.style.display = 'flex';
      };

      let editingId = null;
      $('#detail-edit').onclick = () => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        editingId = p.id; $('#user-post-content').value = p.content;
        $('#post-modal-title').innerText = p.author === userProfile.forumName ? '编辑动态' : `编辑 @${p.author} 的帖子`;
        $('#modal-post').style.display = 'flex';
      };

      $('#detail-delete').onclick = async () => {
        const ok = await roche.ui.confirm({ title: "删除", message: "确认删除这条帖子？" }); if (!ok) return;
        const loc = locatePost(curPostId); if (!loc) return;
        const filtered = loc.arr.filter(x => x.id !== curPostId);
        if (loc.kind === 'feed') posts = filtered; else if (loc.kind === 'cross') crossoverPosts = filtered; else ifPosts = filtered;
        await roche.storage.set(loc.key, filtered);
        detailView.style.display = 'none';
        if (loc.kind === 'feed') renderFeed(); else if (loc.kind === 'cross') renderCross(); else renderIf();
      };

      $('#detail-fav').onclick = async () => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        const idx = favorites.findIndex(f => f.id === p.id);
        if (idx >= 0) { favorites.splice(idx, 1); $('#detail-fav').innerText = '☆'; roche.ui.toast("已取消收藏"); }
        else { favorites.unshift({ id: p.id, author: p.author, content: p.content }); $('#detail-fav').innerText = '★'; roche.ui.toast("已收藏 ★"); }
        await roche.storage.set("forum_favorites", favorites);
      };

      const commentInput = $('#detail-comment-input');
      $('#detail-comment-send').onclick = async () => {
        const t = commentInput.value.trim(); if (!t) return;
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        p.comments = p.comments || []; p.comments.push({ author: userProfile.forumName, content: t });
        commentInput.value = ''; openDetail(p.id); await roche.storage.set(loc.key, loc.arr);
        loadingText.innerText = "正在呼唤角色回复..."; loadingMask.style.display = 'flex';
        try {
          const scopeHint = loc.kind === 'feed' ? '请扮演原帖作者本人，或同世界观其他角色回复。禁止其他世界观角色出现。' : loc.kind === 'cross' ? '这是【跨界大乱炖】板块，允许不同世界观角色跨界串门评论。' : '这是【if 线】板块，评论区必须是与帖主同一个世界观的角色。';
          const prompt = `你是论坛模拟器。用户（@${userProfile.forumName}，真名/爱称[${userProfile.name}]）刚刚在帖子下评论了。\n原帖作者：@${p.author}\n原帖内容：${p.content}\n用户评论：${t}\n${scopeHint}\n生成 1~2 条角色回复。严格遵循官方人设，禁止OOC，禁止图片描述。emoji按人设自行判断。角色当前心情:${currentMood()}。\n输出纯JSON数组:[{"author":"角色名","content":"@${userProfile.forumName} 回复内容"}]`;
          const raw = await callAI(prompt);
          const replies = JSON.parse(raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1));
          p.comments = p.comments.concat(replies); await roche.storage.set(loc.key, loc.arr); openDetail(p.id);
        } catch (e) { roche.ui.toast("角色暂时没回复"); } finally { loadingMask.style.display = 'none'; }
      };

      $('#detail-comment-summon').onclick = async () => {
        const loc = locatePost(curPostId); if (!loc) return;
        const p = loc.arr.find(x => x.id === curPostId);
        loadingText.innerText = "正在召唤角色..."; loadingMask.style.display = 'flex';
        try {
          const existing = (p.comments || []).map(c => `@${c.author}: ${c.content}`).join('\n') || '（无）';
          const scopeHint = loc.kind === 'feed' ? '只允许同世界观角色出现。' : loc.kind === 'cross' ? '【跨界大乱炖】板块，允许跨界角色出现。' : '【if 线】板块，评论必须来自帖主同一个世界观的角色。';
          const prompt = `你是论坛模拟器，请为下列帖子生成 1~2 条新的角色评论/回复（可回复贴主或已有评论）。\n【帖子作者】@${p.author}\n【帖子内容】${p.content}\n【已有评论】\n${existing}\n【用户】@${userProfile.forumName}，真名/爱称[${userProfile.name}]\n${scopeHint}\n角色当前心情:${currentMood()}。严格遵循官方人设，禁止OOC，禁止图片描述。\n输出纯JSON数组:[{"author":"角色名","content":"@某人 回复内容"}]`;
          const raw = await callAI(prompt);
          const replies = JSON.parse(raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1));
          p.comments = (p.comments || []).concat(replies); await roche.storage.set(loc.key, loc.arr); openDetail(p.id); roche.ui.toast("角色赶来了");
        } catch (e) { roche.ui.toast("召唤失败，请重试"); } finally { loadingMask.style.display = 'none'; }
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
      $('#user-avatar-file').onchange = async (e) => { if (e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); $('#user-avatar-url').value = b64; } };
      $('#user-save').onclick = async () => {
        userProfile.forumName = $('#user-forum-name').value; userProfile.avatarUrl = $('#user-avatar-url').value;
        userProfile.name = $('#user-name').value; userProfile.age = $('#user-age').value; userProfile.appearance = $('#user-appearance').value;
        await roche.storage.set("forum_user", userProfile);
        $('#feed-user-name').innerText = `@${userProfile.forumName}`; $('#user-display-name').innerText = `@${userProfile.forumName}`;
        if (userProfile.avatarUrl) $('#user-avatar-display').style.backgroundImage = `url(${userProfile.avatarUrl})`;
        roche.ui.toast("资料已保存");
      };

      // ========== 测试 API ==========
      $('#btn-test-api').onclick = async () => {
        const resultEl = $('#api-test-result');
        resultEl.innerHTML = '<div class="api-status" style="background:#fff3cd;color:#856404;">测试中...</div>';
        try {
          const url = $('#set-api-url').value;
          const key = $('#set-api-key').value;
          if (!url || !key) { resultEl.innerHTML = '<div class="api-status fail">请先填写 API 地址和密钥</div>'; return; }
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
          });
          if (res.ok) resultEl.innerHTML = '<div class="api-status ok">✅ 自定义 API 连接成功！</div>';
          else resultEl.innerHTML = `<div class="api-status fail">❌ 连接失败，状态码：${res.status}</div>`;
        } catch (e) { resultEl.innerHTML = '<div class="api-status fail">❌ 网络错误，请检查地址格式</div>'; }
      };

      // ========== 设置保存 & 清理 ==========
      $('#settings-save').onclick = async () => {
        settings.themeStyle = $('#theme-style').value; settings.themeColor = $('#theme-color').value;
        settings.worldView = $('#set-worldview').value;
        settings.postCount = parseInt($('#set-post-count').value) || 3;
        settings.commentCount = parseInt($('#set-comment-count').value) || 5;
        settings.memoryReadCount = parseInt($('#set-memory-count').value) || 5;
        settings.apiUrl = $('#set-api-url').value; settings.apiKey = $('#set-api-key').value;
        await roche.storage.set("forum_settings", settings); roche.ui.toast("设置已保存");
      };
      $('#clear-home').onclick = async () => { posts = []; await roche.storage.set("forum_posts", posts); renderFeed(); roche.ui.toast("主页已清空"); };
      $('#clear-cross').onclick = async () => { crossoverPosts = []; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); roche.ui.toast("跨界已清空"); };
      $('#clear-if').onclick = async () => { ifPosts = []; await roche.storage.set("forum_if_posts", ifPosts); renderIf(); roche.ui.toast("if 线已清空"); };
      $('#clear-user').onclick = async () => {
        posts = posts.filter(p => p.author !== userProfile.forumName);
        crossoverPosts = crossoverPosts.filter(p => p.author !== userProfile.forumName);
        ifPosts = ifPosts.filter(p => p.author !== userProfile.forumName);
        await roche.storage.set("forum_posts", posts); await roche.storage.set("forum_crossover_posts", crossoverPosts); await roche.storage.set("forum_if_posts", ifPosts);
        roche.ui.toast("你的帖子已清空");
      };
      $('#clear-mem').onclick = async () => {
        memoryFeed = []; memoryCross = []; memoryIf = [];
        await roche.storage.set("forum_memory_feed", memoryFeed); await roche.storage.set("forum_memory_cross", memoryCross); await roche.storage.set("forum_memory_if", memoryIf);
        renderMemoryLists(); roche.ui.toast("记忆已清空");
      };

      // ========== 记忆 ==========
      const renderMemoryLists = () => {
        const fmt = (arr) => arr.length ? arr.map(m => `<div>· [${m.time}] ${m.summary}</div>`).join('') : '<div style="color:#aaa;">暂无</div>';
        $('#memory-feed-list').innerHTML = fmt(memoryFeed);
        $('#memory-cross-list').innerHTML = fmt(memoryCross);
        $('#memory-if-list').innerHTML = fmt(memoryIf);
      };
      const summarize = async (which) => {
        const src = which === 'feed' ? posts : which === 'cross' ? crossoverPosts : ifPosts;
        if (src.length === 0) return roche.ui.toast("没有可总结的帖子");
        loadingText.innerText = "正在总结..."; loadingMask.style.display = 'flex';
        try {
          const text = src.slice(0, 10).map(p => `@${p.author}: ${p.content}`).join('\n');
          const raw = await callAI(`请用一句简短的中文总结以下论坛帖子的整体情况和主要事件（时间线清晰，不超过80字）：\n${text}`);
          const mem = { time: nowStr(), summary: raw.trim().slice(0, 120) };
          if (which === 'feed') { memoryFeed.unshift(mem); memoryFeed = memoryFeed.slice(0, 30); await roche.storage.set("forum_memory_feed", memoryFeed); }
          else if (which === 'cross') { memoryCross.unshift(mem); memoryCross = memoryCross.slice(0, 30); await roche.storage.set("forum_memory_cross", memoryCross); }
          else { memoryIf.unshift(mem); memoryIf = memoryIf.slice(0, 30); await roche.storage.set("forum_memory_if", memoryIf); }
          renderMemoryLists(); roche.ui.toast("已生成记忆");
        } catch (e) { roche.ui.toast("总结失败"); } finally { loadingMask.style.display = 'none'; }
      };
      $('#btn-mem-feed').onclick = () => summarize('feed');
      $('#btn-mem-cross').onclick = () => summarize('cross');
      $('#btn-mem-if').onclick = () => summarize('if');

      // ========== 刷新生成 ==========
      $('#nav-refresh').onclick = async () => {
        if (currentMode !== 'feed' && currentMode !== 'crossover') switchView('feed', 'FORUM');
        loadingText.innerText = "正在捕捉时空交汇的电波..."; loadingMask.style.display = 'flex';
        try {
          const memArr = currentMode === 'feed' ? memoryFeed : (boardSub === 'if' ? memoryIf : memoryCross);
          const recentSrc = currentMode === 'feed' ? posts : (boardSub === 'if' ? ifPosts : crossoverPosts);
          const recentPosts = recentSrc.slice(0, settings.memoryReadCount);
          const memText = memArr.slice(0, 3).map(m => `[${m.time}] ${m.summary}`).join('\n') || '（无）';
          const recentText = recentPosts.map(p => `@${p.author}: ${p.content.slice(0, 60)}`).join('\n') || '（无）';
          const basePrompt = `【世界观】：\n${settings.worldView}\n【用户情报】：网名 @${userProfile.forumName}，真名/爱称[${userProfile.name}]，年龄${userProfile.age}，外貌：${userProfile.appearance}。\n【论坛记忆】：\n${memText}\n【最近${recentPosts.length}条帖子参考】：\n${recentText}\n【发帖硬性规则】：\n- 严格遵循官方人设，禁止OOC。\n- 禁止图片描述，禁止使用[翻开照片:xxx]。\n- 每个角色发帖时假设有当前心情（如${currentMood()}），要有活人感、随手记录感。\n- emoji（🤤😂🙄🤣😭😉）根据人设自行判断是否使用，不强制不禁止，不要每帖都加。`;

          let prompt;
          if (currentMode === 'feed') {
            prompt = `${basePrompt}\n主题限定五类之一：1.日常生活 2.小烦恼 3.工作 4.小幸运 5.对user暗戳戳的思念/表白/吃醋。\n评论区必须是同世界观角色。\n生成 ${settings.postCount} 篇帖子，每篇 ${settings.commentCount} 条评论。\n输出纯JSON数组:[{"author":"角色名","content":"正文","likes":数字,"stars":数字,"comments":[{"author":"评论人","content":"内容"}]}]`;
          } else if (boardSub === 'cross') {
            prompt = `${basePrompt}\n这是【跨界大乱炖】板块。围绕以下三种反应生成帖子（三选一或混合）：\n① 各世界观角色发现 user 在他们那边也有"马甲"的震惊反应——拉群对质、发帖吐槽、追问细节；\n② 各世界观里暗恋 user 的角色/追求者聚在一起时的反应——互相试探、比较、吃醋、抱团发疯、宣战；\n③ 某个世界观的角色发帖描述 user 在他们那边干过的具体事情，评论区是该世界观其他角色的追问、羡慕、酸柠檬反应。\n角色必须严格遵循各自世界观人设，跨界发言时保持自己的说话方式。\n生成 ${settings.postCount} 篇，每篇 ${settings.commentCount} 条评论。输出格式同上。`;
          } else {
            prompt = `${basePrompt}\n这是【if 线】板块——一个平行时空里，帖主已经和 user 在一起了（帖主是 user 的男朋友/女朋友/老公/老婆）。\n帖主发帖内容围绕【恋爱日常/婚后甜蜜/被 user 撒娇/接送/带回家见家长/小吵架和好/秀戒指秀合照】等主题，字里行间掩不住的秀恩爱、炫耀式发言。\n⚠️ 世界观必须一致：帖主和评论区角色必须来自同一个世界观。\n⚠️ 重点：评论区里的其他角色不是暗恋帖主，而是【暗恋 user】！所以看到帖主在秀恩爱时会——酸到冒泡、破防发疯、阴阳怪气、追问 user 的细节、幻想自己在 if 线取而代之，或者装大度实则心碎。\n帖主保持人设不 OOC，秀恩爱甜度拉满；评论区暗恋 user 的角色反应活人化、有戏剧张力。\n生成 ${settings.postCount} 篇 if 帖子，每篇 ${settings.commentCount} 条评论。输出格式同上。`;
          }

          const raw = await callAI(prompt);
          const json = raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1);
          const arr = JSON.parse(json);
          const newPosts = arr.map(it => ({ id: crypto.randomUUID(), author: it.author || "未知", content: it.content || "", likes: it.likes ?? Math.floor(Math.random() * 500), stars: it.stars ?? Math.floor(Math.random() * 200), comments: it.comments || [] }));
          if (currentMode === 'feed') { posts = [...newPosts, ...posts]; await roche.storage.set("forum_posts", posts); renderFeed(); }
          else if (boardSub === 'cross') { crossoverPosts = [...newPosts, ...crossoverPosts]; await roche.storage.set("forum_crossover_posts", crossoverPosts); renderCross(); }
          else { ifPosts = [...newPosts, ...ifPosts]; await roche.storage.set("forum_if_posts", ifPosts); renderIf(); }
          roche.ui.toast("捕捉到新的时空电波");
        } catch (err) {
          console.error(err); roche.ui.toast("生成失败：" + (err.message || "请检查API配置"));
        } finally { loadingMask.style.display = 'none'; }
      };

      $('#forum-exit').onclick = () => roche.ui.closeApp();
      renderFeed(); renderMemoryLists();
    },
    async unmount(container) {
      container.replaceChildren();
      const s = document.getElementById("minimalist-forum-style");
      if (s) s.remove();
    }
  }]
});
