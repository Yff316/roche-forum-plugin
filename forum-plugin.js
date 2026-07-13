window.RochePlugin.register({
    id: "minimalist-forum",
    name: "极简论坛",
    version: "1.4.0",
    apps: [
        {
            id: "minimalist-forum-app",
            name: "论坛主页",
            icon: "chat",
            async mount(container, roche) {
                // 1. 初始化数据
                const defaultWorldView = `围绕着游戏/动漫发帖人就是角色本人发帖 如: 崩铁、原神、鸣潮、王者、斩神、诡秘之主、排球少年等（不需要恋与深空）。
角色会分享近日的日常/对user的心思（暗戳戳表白和明着表白/吃醋）。帖子可包含符合人设的颜文字和emoji（禁止使用🙄🙃😊😍😘😏😭😒！等过度夸张的表情，多使用清冷或唯美的符号如♡、★、✨、♪）。偶尔会分享生活照片。
评论区都是这个角色世界观里的人物会根据角色分享评论。
$禁止ooc，根据官方人设发帖
$角色全洁从身到心都洁，只喜欢user/“你”一个人，不论男女。
$绝对代入向禁止出现明确的主角原名，使用代称或最亲密的真名呼唤。`;
                
                let settings = (await roche.storage.get("forum_settings")) || {
                    worldView: defaultWorldView,
                    postCount: 3,
                    commentCount: 5,
                    themeStyle: "line", // "line" 或 "angel"
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
                    --font-nav: monospace, sans-serif;
                }

                /* 天使核主题变量覆盖 */
                .theme-angel {
                    --primary-color: #d4e0e9; /* 柔和浅蓝/白 */
                    --bg-color: #fafcfd;
                    --card-bg: #ffffff;
                    --border-radius: 20px;
                    --box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    --border-style: 1px solid rgba(255,255,255,0.8);
                }
                .theme-angel .forum-post, .theme-angel .forum-modal-content {
                    backdrop-filter: blur(10px);
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

                /* 顶部导航 */
                .forum-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: var(--bg-color);
                    border-bottom: var(--border-style);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    z-index: 5;
                    font-family: var(--font-nav);
                }
                .forum-header button {
                    background: none;
                    border: none;
                    font-size: 24px;
                    font-weight: bold;
                    cursor: pointer;
                    color: var(--primary-color);
                }
                .theme-angel .forum-header button { color: #a3b8cc; }

                /* 页面容器 */
                .page-view {
                    flex: 1;
                    overflow-y: auto;
                    padding-bottom: 70px;
                    display: none;
                    background: var(--bg-color);
                }
                .page-view.active { display: block; }
                .forum-content { padding: 16px; }

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
                .forum-post:active { transform: scale(0.98); }
                .post-header { display: flex; align-items: center; margin-bottom: 8px; }
                .post-avatar {
                    width: 40px; height: 40px;
                    border: var(--border-style);
                    border-radius: 50%;
                    margin-right: 12px;
                    object-fit: cover;
                }
                .post-author {
                    font-weight: bold;
                    color: var(--primary-color);
                    font-size: 16px;
                    font-family: var(--font-nav);
                }
                .theme-angel .post-author { color: #8da6c1; }
                
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
                    font-family: var(--font-nav);
                }

                /* 底部导航 */
                .forum-bottom-bar {
                    display: flex;
                    justify-content: space-around;
                    padding: 12px;
                    background: var(--bg-color);
                    border-top: var(--border-style);
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
                    z-index: 5;
                    font-family: var(--font-nav);
                }
                .forum-bottom-bar button {
                    background: none; border: none;
                    font-size: 16px; font-weight: bold;
                    cursor: pointer; flex: 1;
                    color: var(--primary-color);
                }
                .theme-angel .forum-bottom-bar button { color: #a3b8cc; }
                .forum-bottom-bar button.active {
                    text-decoration: underline;
                    text-decoration-thickness: 3px;
                }

                /* 表单与输入框 */
                .form-group { margin-bottom: 16px; padding: 0 16px; }
                .form-group h4 {
                    margin-bottom: 8px;
                    border-bottom: 2px solid var(--primary-color);
                    display: inline-block;
                    font-family: var(--font-nav);
                }
                .theme-angel .form-group h4 { border-bottom-color: #d4e0e9; color: #8da6c1; }
                
                input[type="text"], input[type="number"], input[type="color"], textarea, select {
                    width: 100%; margin: 8px 0; padding: 12px;
                    border: var(--border-style);
                    border-radius: var(--border-radius);
                    box-sizing: border-box;
                    font-family: var(--font-text);
                    outline: none; background: var(--card-bg);
                }
                textarea { height: 90px; resize: vertical; }

                .btn-primary {
                    background: var(--primary-color);
                    color: #fff;
                    border: var(--border-style);
                    border-radius: var(--border-radius);
                    padding: 12px 16px; font-weight: bold;
                    cursor: pointer; width: 100%; margin-top: 10px;
                    font-family: var(--font-nav);
                }
                .theme-angel .btn-primary { background: #e6f0f9; color: #7a9bb8; border: none; }
                
                .btn-secondary {
                    background: var(--bg-color);
                    color: var(--primary-color);
                    border: var(--border-style);
                    border-radius: var(--border-radius);
                    padding: 8px 12px; font-weight: bold;
                    cursor: pointer; font-size: 14px;
                    font-family: var(--font-nav);
                }
                .theme-angel .btn-secondary { color: #8da6c1; border-color: #d4e0e9; }

                /* 详情页与弹窗 */
                .detail-view {
                    position: absolute; top:0; left:0; width:100%; height:100%;
                    background: var(--bg-color); z-index: 10;
                    display: none; flex-direction: column;
                }
                .detail-header {
                    display: flex; justify-content: space-between; padding: 16px;
                    border-bottom: var(--border-style);
                }
                .detail-content { flex:1; overflow-y: auto; padding: 16px; }
                .post-comments { margin-top: 20px; padding-top: 20px; border-top: 1px dashed var(--primary-color); }
                .comment-item { margin-bottom: 15px; font-size: 14px; background: rgba(0,0,0,0.02); padding: 10px; border-radius: var(--border-radius); }
                .comment-author { font-weight: bold; margin-right: 8px; color: var(--primary-color); font-family: var(--font-nav); }

                /* 加载动画 */
                .loading-mask {
                    display: none; position: absolute; top:0; left:0; width:100%; height:100%;
                    background: rgba(255,255,255,0.9); z-index: 20;
                    justify-content: center; align-items: center; flex-direction: column;
                }
                .theme-angel .loading-mask { background: rgba(250,252,253,0.9); }
                .spinner {
                    width: 50px; height: 50px;
                    border: 4px solid #eee; border-top: 4px solid var(--primary-color);
                    border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;
                }
                .theme-angel .spinner { border-top-color: #a3b8cc; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .loading-text { font-weight: bold; font-size: 16px; font-family: var(--font-nav); color: var(--primary-color); }
                .theme-angel .loading-text { color: #8da6c1; }
                
                /* 天使核装饰 */
                .angel-decor { display: none; position: absolute; font-size: 24px; color: #e6f0f9; z-index: 0; pointer-events: none; }
                .theme-angel .angel-decor { display: block; }
                `;
                document.head.appendChild(style);

                // 3. 渲染主框架
                container.innerHTML = `
                <div class="roche-plugin-forum ${settings.themeStyle === 'angel' ? 'theme-angel' : ''}" id="main-container">
                    <div class="angel-decor" style="top:10%; left:5%;">♡</div>
                    <div class="angel-decor" style="top:40%; right:10%;">★</div>
                    <div class="angel-decor" style="bottom:20%; left:15%;">✨</div>

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

                    <!-- 页面2：偏好设置 -->
                    <div id="view-settings" class="page-view">
                        <div class="form-group" style="margin-top: 16px;">
                            <h4>全局主题美化</h4>
                            <select id="theme-style">
                                <option value="line" ${settings.themeStyle==='line'?'selected':''}>经典复古：黑白立体线条</option>
                                <option value="angel" ${settings.themeStyle==='angel'?'selected':''}>唯美纯洁：圆润白天使核 ♡</option>
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
                            <label>API 地址: <input type="text" id="set-api-url" value="${settings.apiUrl}" placeholder="https://api.openai.com/..."></label>
                            <label>API 密钥: <input type="text" id="set-api-key" value="${settings.apiKey}" placeholder="sk-..."></label>
                            <button id="btn-test-api" class="btn-secondary" style="width: 100%; margin-top: 5px;">测试连接</button>
                        </div>
                        <div class="form-group">
                            <button id="settings-save" class="btn-primary">保存设置</button>
                        </div>
                    </div>

                    <!-- 页面3：用户主页 -->
                    <div id="view-user" class="page-view">
                        <div style="padding: 20px 16px; text-align: center; border-bottom: var(--border-style);">
                            <img id="user-avatar-preview" src="${userProfile.avatarUrl}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--primary-color); object-fit: cover; margin-bottom: 10px;">
                            <h3 style="margin: 0; color: var(--primary-color); font-family: var(--font-nav);">@${userProfile.forumName}</h3>
                        </div>
                        <div class="form-group" style="margin-top: 20px;">
                            <h4>公开身份 (论坛代号)</h4>
                            <label>论坛网名 (@代号): <input type="text" id="user-forum-name" value="${userProfile.forumName}"></label>
                            <label>头像链接 (URL 或上传): <input type="text" id="user-avatar-url" value="${userProfile.avatarUrl}"></label>
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

                    <!-- 底部导航 -->
                    <div class="forum-bottom-bar">
                        <button id="nav-home" class="active">主页</button>
                        <button id="nav-settings">设置</button>
                        <button id="nav-msg">私信</button>
                        <button id="nav-user-page">我的</button>
                    </div>

                    <!-- 帖子详情页 (隐藏容器) -->
                    <div class="detail-view" id="view-post-detail">
                        <div class="detail-header">
                            <button id="detail-back" style="background:none;border:none;font-size:24px;color:var(--primary-color);cursor:pointer;">&lt;</button>
                            <div style="font-weight:bold; font-family:var(--font-nav); color:var(--primary-color);">POST DETAIL</div>
                            <button id="detail-options" style="background:none;border:none;font-size:20px;color:var(--primary-color);cursor:pointer;">X</button>
                        </div>
                        <div class="detail-content" id="detail-content-container"></div>
                    </div>

                    <!-- 发布与编辑弹窗 (隐藏) -->
                    <div class="page-view" id="modal-post" style="position:absolute; top:0; left:0; width:100%; height:100%; background:var(--bg-color); z-index:15; display:none; flex-direction:column;">
                        <div class="detail-header">
                            <button id="post-cancel" style="background:none;border:none;font-size:16px;color:var(--primary-color);">取消</button>
                            <div style="font-weight:bold;">发布/编辑动态</div>
                            <button id="post-submit" style="background:none;border:none;font-size:16px;font-weight:bold;color:var(--primary-color);">完成</button>
                        </div>
                        <div style="padding:16px;">
                            <textarea id="user-post-content" placeholder="分享你的日常，或者吐槽点什么..."></textarea>
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
                    settings: container.querySelector('#view-settings'),
                    user: container.querySelector('#view-user')
                };
                const navBtns = {
                    home: container.querySelector('#nav-home'),
                    settings: container.querySelector('#nav-settings'),
                    user: container.querySelector('#nav-user-page')
                };
                const headerTitle = container.querySelector('#header-title');

                // 页面切换
                const switchView = (viewName, title) => {
                    Object.values(views).forEach(v => v.classList.remove('active'));
                    views[viewName].classList.add('active');
                    headerTitle.innerText = title;
                    navBtns.home.classList.toggle('active', viewName === 'feed');
                    navBtns.settings.classList.toggle('active', viewName === 'settings');
                    navBtns.user.classList.toggle('active', viewName === 'user');
                };

                navBtns.home.onclick = () => switchView('feed', 'FORUM');
                navBtns.user.onclick = () => switchView('user', 'MY PROFILE');
                navBtns.settings.onclick = async () => {
                    await loadWorldbooks();
                    switchView('settings', 'SETTINGS');
                };

                // 主题切换交互
                const themeSelect = container.querySelector('#theme-style');
                const colorWrap = container.querySelector('#color-picker-wrap');
                themeSelect.onchange = (e) => {
                    if(e.target.value === 'angel') {
                        mainContainer.classList.add('theme-angel');
                        colorWrap.style.display = 'none';
                    } else {
                        mainContainer.classList.remove('theme-angel');
                        colorWrap.style.display = 'block';
                    }
                };

                // 工具函数
                const fileToBase64 = (file) => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = e => reject(e);
                });

                // 渲染主页帖子流 (不包含评论)
                const feedContainer = container.querySelector('#forum-feed-container');
                let currentViewingPostId = null;

                const renderFeed = () => {
                    feedContainer.innerHTML = '';
                    if(posts.length === 0) {
                        feedContainer.innerHTML = '<div style="text-align:center; margin-top:50px; font-weight:bold; color: var(--primary-color);">暂无动态，点击右上角 ↻ 刷新</div>';
                        return;
                    }
                    posts.forEach(post => {
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
                            <div class="post-comment-count">♡ ${commentCount} 条评论</div>
                        `;
                        // 点击进入详情
                        div.onclick = () => openPostDetail(post.id);
                        feedContainer.appendChild(div);
                    });
                };

                // 详情页逻辑
                const detailView = container.querySelector('#view-post-detail');
                const detailContent = container.querySelector('#detail-content-container');
                container.querySelector('#detail-back').onclick = () => { detailView.style.display = 'none'; };

                const openPostDetail = (id) => {
                    currentViewingPostId = id;
                    const post = posts.find(p => p.id === id);
                    if(!post) return;
                    
                    const avatarHtml = post.avatar ? `<img src="${post.avatar}" class="post-avatar">` : `<div class="post-avatar" style="background:var(--primary-color);"></div>`;
                    const imageHtml = post.imageBase64 ? `<img src="${post.imageBase64}" class="post-image">` : '';
                    const commentsHtml = post.comments && post.comments.length > 0 ? `<div class="post-comments">` + post.comments.map(c => `<div class="comment-item"><span class="comment-author">@${c.author}:</span>${c.content}</div>`).join('') + `</div>` : '<div class="post-comments">暂无评论</div>';
                    
                    detailContent.innerHTML = `
                        <div class="post-header">
                            ${avatarHtml}
                            <div class="post-author" style="font-size:18px;">@${post.author}</div>
                        </div>
                        <div class="post-text" style="font-size:16px;">${post.content}</div>
                        ${imageHtml}
                        ${commentsHtml}
                    `;
                    detailView.style.display = 'flex';
                };

                // 删除与编辑 (在详情页右上角)
                container.querySelector('#detail-options').onclick = async () => {
                    const confirmDel = await roche.ui.confirm({ title: "操作", message: "你要删除还是编辑这条帖子？点击确认删除，点击取消可尝试编辑(功能简化)。" });
                    if(confirmDel) {
                        posts = posts.filter(p => p.id !== currentViewingPostId);
                        await roche.storage.set("forum_posts", posts);
                        detailView.style.display = 'none';
                        renderFeed();
                    } else {
                        // 进入编辑模式 (复用发帖弹窗)
                        const post = posts.find(p => p.id === currentViewingPostId);
                        editingPostId = post.id;
                        container.querySelector('#user-post-content').value = post.content;
                        if(post.imageBase64) {
                            currentPostImage = post.imageBase64;
                            container.querySelector('#post-image-preview').src = currentPostImage;
                            container.querySelector('#post-image-preview').style.display = 'block';
                        }
                        modalPost.style.display = 'flex';
                    }
                };

                renderFeed();

                // 退出与私信
                container.querySelector('#forum-exit').onclick = () => roche.ui.closeApp();
                container.querySelector('#nav-msg').onclick = () => roche.ui.toast("私信功能开发中...");

                // 发帖与编辑逻辑
                const modalPost = container.querySelector('#modal-post');
                let currentPostImage = null;
                let editingPostId = null;

                container.querySelector('#btn-user-post').onclick = () => {
                    editingPostId = null;
                    container.querySelector('#user-post-content').value = '';
                    currentPostImage = null;
                    container.querySelector('#post-image-preview').style.display = 'none';
                    modalPost.style.display = 'flex';
                };
                container.querySelector('#post-cancel').onclick = () => { modalPost.style.display = 'none'; };
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
                    
                    if(editingPostId) {
                        // 编辑模式
                        const post = posts.find(p => p.id === editingPostId);
                        post.content = content;
                        post.imageBase64 = currentPostImage;
                        roche.ui.toast("修改成功");
                        openPostDetail(editingPostId); // 刷新详情
                    } else {
                        // 新增模式
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
                        roche.ui.toast("发布成功");
                    }
                    await roche.storage.set("forum_posts", posts);
                    modalPost.style.display = 'none';
                    renderFeed();
                };

                // 设置保存 (包括双主题保存)
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

                // 用户人设保存与头像上传
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

                // 世界书与API测试
                const loadWorldbooks = async () => {
                    try {
                        const categories = await roche.worldbook.list();
                        const wbList = container.querySelector('#wb-list');
                        if (!categories || categories.length === 0) { wbList.innerHTML = "暂无数据"; return; }
                        wbList.innerHTML = categories.map(cat => `
                            <div><label><input type="checkbox" class="wb-check" value="${cat.id}" ${selectedWorldbooks.includes(cat.id)?'checked':''}> ${cat.name}</label></div>
                        `).join('');
                    } catch(e) {}
                };
                container.querySelector('#btn-test-api').onclick = async () => {
                    roche.ui.toast("测试中...");
                    try {
                        const res = await fetch(container.querySelector('#set-api-url').value, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${container.querySelector('#set-api-key').value}` },
                            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{role: "user", content: "hi"}], max_tokens: 5 })
                        });
                        if(res.ok) roche.ui.toast("连接成功！"); else roche.ui.toast("连接失败");
                    } catch(e) { roche.ui.toast("网络错误"); }
                };

                // 核心：AI 自动生成帖子
                const loadingMask = container.querySelector('#loading-mask');
                container.querySelector('#nav-refresh').onclick = async () => {
                    if(views.feed.className.indexOf('active') === -1) switchView('feed', 'FORUM');
                    loadingMask.style.display = 'flex';
                    try {
                        let wbText = "";
                        for (let catId of selectedWorldbooks) {
                            const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: "global" });
                            if (entries && entries.length > 0) wbText += entries.map(e => `${e.keys.join(',')}: ${e.content}`).join('\\n') + "\\n";
                        }
                        const prompt = `你现在是一个沉浸式论坛的模拟生成器。生成 ${settings.postCount} 篇帖子，每篇带 ${settings.commentCount} 条评论。
【规则与世界观】：\n${settings.worldView}
【用户情报】：公开网名 @${userProfile.forumName}。但发帖角色可以根据关系亲密程度，在帖子里喊用户的真名/爱称：[${userProfile.name}]。年龄：${userProfile.age}，外貌：${userProfile.appearance}。
【附加要求】：角色可以在内容里加入清冷唯美的符号或颜文字(如♡、✨、(///ω///))。如果角色发了一张自拍或照片，请在 JSON 的 imageBase64 字段填入 "https://picsum.photos/400/300?random=" 加上一个随机数字，否则留空。
【世界书背景】：\n${wbText}
请直接输出纯JSON数组：[{"author":"发帖角色名", "avatar":"可以留空", "content":"内容(含颜文字)", "imageBase64":"图片链接或空", "comments":[{"author":"评论人","content":"内容"}]}]`;

                        let rawText = "";
                        if (settings.apiUrl && settings.apiKey) {
                            const res = await fetch(settings.apiUrl, {
                                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
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
                            posts = [...newPosts, ...posts];
                            await roche.storage.set("forum_posts", posts);
                            renderFeed();
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
