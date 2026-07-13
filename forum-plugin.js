window.RochePlugin.register({
    id: "minimalist-forum",
    name: "极简论坛",
    version: "1.2.0",
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
                    themeColor: "#000000"
                };

                let userProfile = (await roche.storage.get("forum_user")) || {
                    forumName: "旅行者",
                    avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix", // 默认头像
                    name: "旅行者/开拓者",
                    age: "未知",
                    appearance: "神秘而迷人"
                };

                let selectedWorldbooks = (await roche.storage.get("forum_worldbooks")) || [];
                let posts = (await roche.storage.get("forum_posts")) || [];

                // 2. 插入黑白立体线条风格的 CSS
                const style = document.createElement('style');
                style.id = "minimalist-forum-style";
                style.innerHTML = `
                :root {
                    --primary-color: ${settings.themeColor};
                }
                .roche-plugin-forum {
                    font-family: monospace, sans-serif;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #fff;
                    color: #000;
                    position: relative;
                }
                .forum-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: #fff;
                    border-bottom: 2px solid var(--primary-color);
                    box-shadow: 0 4px 0 var(--primary-color);
                    z-index: 5;
                    position: relative;
                }
                .forum-header button {
                    background: none;
                    border: none;
                    font-size: 20px;
                    font-weight: bold;
                    cursor: pointer;
                    color: var(--primary-color);
                }
                .forum-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    padding-bottom: 80px;
                    background: #fff;
                }
                .forum-post {
                    background: #fff;
                    padding: 16px;
                    margin-bottom: 20px;
                    border: 2px solid var(--primary-color);
                    box-shadow: 4px 4px 0 var(--primary-color);
                    position: relative;
                }
                .post-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .post-avatar {
                    width: 32px;
                    height: 32px;
                    border: 2px solid var(--primary-color);
                    border-radius: 50%;
                    margin-right: 10px;
                    object-fit: cover;
                }
                .post-author {
                    font-weight: bold;
                    color: var(--primary-color);
                    font-size: 16px;
                }
                .post-text {
                    line-height: 1.6;
                    white-space: pre-wrap;
                    font-size: 15px;
                }
                .post-text.collapsed {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    cursor: pointer;
                }
                .post-actions {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    font-size: 14px;
                    color: var(--primary-color);
                    cursor: pointer;
                    font-weight: bold;
                }
                .post-comments {
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 2px dashed var(--primary-color);
                }
                .comment-item {
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                .comment-author {
                    font-weight: bold;
                    margin-right: 8px;
                }
                .forum-bottom-bar {
                    display: flex;
                    justify-content: space-around;
                    padding: 12px;
                    background: #fff;
                    border-top: 2px solid var(--primary-color);
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                    box-sizing: border-box;
                    box-shadow: 0 -4px 0 var(--primary-color);
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
                }
                .forum-bottom-bar button.add-btn {
                    font-size: 24px;
                }
                /* 模态框立体风格 */
                .forum-modal {
                    display: none;
                    position: absolute;
                    top:0; left:0; width:100%; height:100%;
                    background: rgba(255,255,255,0.8);
                    z-index: 10;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    backdrop-filter: blur(2px);
                }
                .forum-modal-content {
                    background: #fff;
                    padding: 20px;
                    border: 2px solid var(--primary-color);
                    box-shadow: 8px 8px 0 var(--primary-color);
                    width: 85%;
                    max-height: 80%;
                    overflow-y: auto;
                }
                .forum-modal textarea,
                .forum-modal input[type="text"],
                .forum-modal input[type="number"],
                .forum-modal input[type="color"] {
                    width: 100%;
                    margin: 8px 0;
                    padding: 10px;
                    border: 2px solid var(--primary-color);
                    box-sizing: border-box;
                    font-family: monospace;
                    outline: none;
                }
                .forum-modal textarea {
                    height: 80px;
                    resize: vertical;
                }
                .btn-primary {
                    background: var(--primary-color);
                    color: #fff;
                    border: 2px solid var(--primary-color);
                    padding: 10px 16px;
                    font-weight: bold;
                    cursor: pointer;
                    text-transform: uppercase;
                }
                .btn-cancel {
                    background: #fff;
                    color: var(--primary-color);
                    border: 2px solid var(--primary-color);
                    padding: 10px 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-left: 10px;
                }
                .setting-group { margin-bottom: 16px; }
                .setting-group h4 {
                    margin-bottom: 8px;
                    border-bottom: 2px solid var(--primary-color);
                    display: inline-block;
                }
                .collapsible-header {
                    cursor: pointer;
                    font-weight: bold;
                    color: var(--primary-color);
                    text-decoration: underline;
                    margin-bottom: 8px;
                }
                .collapsible-content {
                    display: none;
                    margin-top: 10px;
                    padding-left: 10px;
                    border-left: 2px solid var(--primary-color);
                }
                .loading-mask {
                    display: none;
                    position: absolute;
                    top:0; left:0; width:100%; height:100%;
                    background: rgba(255,255,255,0.9);
                    z-index: 20;
                    justify-content: center;
                    align-items: center;
                    font-weight: bold;
                    font-size: 16px;
                    color: var(--primary-color);
                    flex-direction: column;
                    text-align: center;
                    padding: 20px;
                }
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
                    
                    <!-- 发帖按钮区 -->
                    <div style="padding: 10px 16px; background: #fff; border-bottom: 2px solid var(--primary-color); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: var(--primary-color);">@${userProfile.forumName}</span>
                        <button id="btn-user-post" class="btn-primary" style="padding: 6px 12px; font-size: 12px;">+ 发布动态</button>
                    </div>

                    <div class="forum-content" id="forum-feed">
                        <!-- 帖子流 -->
                    </div>

                    <div class="forum-bottom-bar">
                        <button id="nav-home">主页</button>
                        <button id="nav-refresh" class="add-btn">↻</button>
                        <button id="nav-msg">私信</button>
                        <button id="nav-user">主页</button>
                    </div>

                    <!-- 加载提示 -->
                    <div class="loading-mask" id="loading-mask">
                        <div>正在通过 API 生成时空交汇的电波...<br><span style="font-size:12px;font-weight:normal;margin-top:8px;display:block;">（如果生成失败，请检查 Roche 大模型设置）</span></div>
                    </div>

                    <!-- 设置模态框 -->
                    <div class="forum-modal" id="modal-settings">
                        <div class="forum-modal-content">
                            <h3>偏好设置</h3>
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
                            <h3>用户主页</h3>
                            
                            <div class="setting-group">
                                <h4>论坛展示身份</h4>
                                <label>头像链接 (URL): <input type="text" id="user-avatar" value="${userProfile.avatarUrl}"></label>
                                <label>论坛名字 (@名称): <input type="text" id="user-forum-name" value="${userProfile.forumName}"></label>
                            </div>

                            <div class="setting-group">
                                <div class="collapsible-header" id="toggle-persona">► 点击展开你的代入设定 (发帖角色可见)</div>
                                <div class="collapsible-content" id="persona-content">
                                    <label>姓名: <input type="text" id="user-name" value="${userProfile.name}"></label>
                                    <label>年龄: <input type="text" id="user-age" value="${userProfile.age}"></label>
                                    <label>外貌特征: <textarea id="user-appearance">${userProfile.appearance}</textarea></label>
                                </div>
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

                    <!-- 用户发帖模态框 -->
                    <div class="forum-modal" id="modal-post">
                        <div class="forum-modal-content">
                            <h3>发布新动态</h3>
                            <textarea id="user-post-content" placeholder="分享你的日常，或者吐槽点什么..."></textarea>
                            <div style="text-align: right; margin-top: 10px;">
                                <button class="btn-cancel" id="post-cancel">取消</button>
                                <button class="btn-primary" id="post-submit">发布</button>
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
                        feedContainer.innerHTML = '<div style="text-align:center; margin-top:50px; font-weight:bold;">暂无动态，点击 ↻ 刷新生成，或自己发一条</div>';
                        return;
                    }
                    posts.forEach(post => {
                        const div = document.createElement('div');
                        div.className = 'forum-post';
                        
                        const commentsHtml = post.comments && post.comments.length > 0 
                            ? `<div class="post-comments">` + post.comments.map(c => `<div class="comment-item"><span class="comment-author">@${c.author}:</span>${c.content}</div>`).join('') + `</div>` 
                            : '';
                        
                        // 判断是否是自己发的帖子（有avatar字段说明是自己发的或者是支持头像的帖子）
                        const avatarHtml = post.avatar 
                            ? `<img src="${post.avatar}" class="post-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'">` 
                            : `<div class="post-avatar" style="display:inline-block; background:var(--primary-color); border-radius:50%;"></div>`;

                        div.innerHTML = `
                            <div class="post-actions" data-id="${post.id}">X</div>
                            <div class="post-header">
                                ${avatarHtml}
                                <div class="post-author">@${post.author}</div>
                            </div>
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

                // 底部导航
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
                    selectedWorldbooks = Array.from(container.querySelectorAll('.wb-check:checked')).map(cb => cb.value);
                    
                    await roche.storage.set("forum_settings", settings);
                    await roche.storage.set("forum_worldbooks", selectedWorldbooks);
                    modalSettings.style.display = 'none';
                    roche.ui.toast("设置已保存");
                };

                // 用户主页逻辑 (原本底部的第四个按钮)
                const modalUser = container.querySelector('#modal-user');
                container.querySelector('#nav-user').onclick = () => modalUser.style.display = 'flex';
                container.querySelector('#user-cancel').onclick = () => modalUser.style.display = 'none';
                
                // 折叠代入设定
                container.querySelector('#toggle-persona').onclick = () => {
                    const content = container.querySelector('#persona-content');
                    content.style.display = content.style.display === 'block' ? 'none' : 'block';
                };

                container.querySelector('#user-save').onclick = async () => {
                    userProfile.forumName = container.querySelector('#user-forum-name').value;
                    userProfile.avatarUrl = container.querySelector('#user-avatar').value;
                    userProfile.name = container.querySelector('#user-name').value;
                    userProfile.age = container.querySelector('#user-age').value;
                    userProfile.appearance = container.querySelector('#user-appearance').value;
                    
                    const newColor = container.querySelector('#theme-color').value;
                    settings.themeColor = newColor;
                    document.documentElement.style.setProperty('--primary-color', newColor);
                    
                    await roche.storage.set("forum_user", userProfile);
                    await roche.storage.set("forum_settings", settings);
                    
                    // 更新发帖按钮旁边的名字
                    container.querySelector('span[style*="font-weight: bold"]').innerText = `@${userProfile.forumName}`;
                    
                    modalUser.style.display = 'none';
                    roche.ui.toast("主页设定已保存");
                };

                // 用户自己发帖逻辑
                const modalPost = container.querySelector('#modal-post');
                container.querySelector('#btn-user-post').onclick = () => modalPost.style.display = 'flex';
                container.querySelector('#post-cancel').onclick = () => {
                    modalPost.style.display = 'none';
                    container.querySelector('#user-post-content').value = '';
                };
                container.querySelector('#post-submit').onclick = async () => {
                    const content = container.querySelector('#user-post-content').value.trim();
                    if(!content) {
                        roche.ui.toast("帖子内容不能为空");
                        return;
                    }
                    const newPost = {
                        id: crypto.randomUUID(),
                        author: userProfile.forumName || "未知",
                        avatar: userProfile.avatarUrl,
                        content: content,
                        comments: [], // 刚发出去还没有评论
                        timestamp: Date.now()
                    };
                    posts.unshift(newPost);
                    await roche.storage.set("forum_posts", posts);
                    
                    container.querySelector('#user-post-content').value = '';
                    modalPost.style.display = 'none';
                    renderFeed();
                    roche.ui.toast("发布成功！你可以尝试点击 ↻ 让角色来评论你");
                };

                // AI 自动生成帖子逻辑
                container.querySelector('#nav-refresh').onclick = async () => {
                    loadingMask.style.display = 'flex';
                    try {
                        let wbText = "";
                        for (let catId of selectedWorldbooks) {
                            const entries = await roche.worldbook.getEntries({ categoryId: catId, scope: "global" });
                            if (entries && entries.length > 0) {
                                wbText += entries.map(e => `${e.keys.join(',')}: ${e.content}`).join('\n') + "\n";
                            }
                        }

                        // 为了让AI能回复你自己发的帖子，我们可以把最新的几条帖子传给AI，作为“论坛现状”
                        const recentPostsStr = posts.slice(0, 3).map(p => `[用户:@${p.author}]: ${p.content}`).join('\n');

                        const prompt = `你现在是一个沉浸式论坛的模拟生成器。请严格按照以下世界观和规则，生成 ${settings.postCount} 篇帖子，每篇帖子带有 ${settings.commentCount} 条评论。
【规则与世界观】：
${settings.worldView}

【用户(User/“你”)的情报】(所有发帖人和评论区角色都可以认识该用户)：
论坛名字：@${userProfile.forumName}
真实姓名：${userProfile.name}
年龄：${userProfile.age}
外貌/特征：${userProfile.appearance}

【当前论坛近期帖子参考】(如果看到@${userProfile.forumName}发的帖子，请在生成的评论区里积极回复，或者在新帖子里提及)：
${recentPostsStr}

【挂载的额外世界书背景】：
${wbText}

请直接输出一段合法的 JSON 数组，格式如下，不要包含任何 markdown 格式如 \`\`\`json，只要纯数组：
[
  {
    "author": "发帖角色名",
    "content": "帖子的正文内容",
    "comments": [
      {
        "author": "评论角色名",
        "content": "评论内容"
      }
    ]
  }
]`;

                        const result = await roche.ai.chat({
                            messages: [{ role: "user", content: prompt }],
                            temperature: 0.8
                        });

                        let rawText = result.text.trim();
                        if (rawText.startsWith("\`\`\`json")) rawText = rawText.replace(/\`\`\`json/g, "");
                        if (rawText.startsWith("\`\`\`")) rawText = rawText.replace(/\`\`\`/g, "");
                        if (rawText.endsWith("\`\`\`")) rawText = rawText.replace(/\`\`\`/g, "");
                        
                        // 寻找第一个 [ 和最后一个 ]
                        const startIdx = rawText.indexOf('[');
                        const endIdx = rawText.lastIndexOf(']');
                        if (startIdx !== -1 && endIdx !== -1) {
                            rawText = rawText.substring(startIdx, endIdx + 1);
                        }

                        const generatedData = JSON.parse(rawText);
                        if (Array.isArray(generatedData)) {
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
                        roche.ui.toast("生成失败，请检查 AI 配置或稍微重试");
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
