window.RochePlugin.register({
  id: "minimalist-forum",
  name: "极简论坛",
  version: "1.0.0",
  apps: [
    {
      id: "minimalist-forum-app",
      name: "论坛主页",
      icon: "chat",
      async mount(container, roche) {
        // 1. 初始化并读取数据
        let preferences = (await roche.storage.get("forum_preferences")) || [
          { id: "tech", name: "玩机攻略", enabled: true, worldView: "这是一个高度数字化的科技世界，人们热衷于讨论最新的智能设备、Root刷机技巧、模块化手机组件以及赛博朋克风格的桌面搭配。大家追求极致的性能和个性化的系统定制，经常分享代码片段和跑分数据。" },
          { id: "cat", name: "养猫日常", enabled: true, worldView: "温馨治愈的铲屎官日常，充满了猫咪的呼噜声和柔软的爪垫。" },
          { id: "life", name: "日常生活", enabled: true, worldView: "平凡而充满烟火气的现实生活分享。" }
        ];
        
        let posts = (await roche.storage.get("forum_posts")) || [];

        // 2. 插入样式 (Scoped to plugin)
        const style = document.createElement('style');
        style.id = "minimalist-forum-style";
        style.innerHTML = `
          .roche-plugin-forum { font-family: sans-serif; display: flex; flex-direction: column; height: 100%; background: #fafafa; color: #333; position: relative; }
          .forum-header { display: flex; justify-content: space-between; padding: 16px; background: #fff; border-bottom: 1px solid #eee; }
          .forum-header button { background: none; border: none; font-size: 16px; cursor: pointer; color: #555; }
          .forum-content { flex: 1; overflow-y: auto; padding: 16px; padding-bottom: 70px; }
          .forum-post { background: #fff; padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative; }
          .post-author { font-weight: bold; margin-bottom: 8px; color: #444; }
          .post-text { line-height: 1.6; white-space: pre-wrap; }
          .post-text.collapsed { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
          .post-tag { display: inline-block; font-size: 12px; background: #e0e0e0; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; }
          .post-actions { position: absolute; top: 16px; right: 16px; font-size: 12px; color: #999; cursor: pointer; }
          .forum-bottom-bar { display: flex; justify-content: space-around; padding: 12px; background: #fff; border-top: 1px solid #eee; position: absolute; bottom: 0; width: 100%; box-sizing: border-box; }
          .forum-bottom-bar button { background: none; border: none; font-size: 16px; cursor: pointer; flex: 1; color: #666; }
          .forum-bottom-bar button.add-btn { font-size: 24px; color: #000; font-weight: bold; }
          
          /* 模态框样式 */
          .forum-modal { display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index: 10; flex-direction: column; justify-content: center; align-items: center; }
          .forum-modal-content { background: #fff; padding: 20px; border-radius: 12px; width: 80%; max-height: 80%; overflow-y: auto; }
          .forum-modal textarea { width: 100%; height: 150px; margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; box-sizing: border-box; }
          .pref-item { margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .pref-item input[type="text"] { width: 100%; margin-top: 5px; box-sizing: border-box; }
          .btn-primary { background: #333; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
          .btn-cancel { background: #ccc; color: #333; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-left: 10px; }
        `;
        document.head.appendChild(style);

        // 3. 渲染主框架
        container.innerHTML = `
          <div class="roche-plugin-forum">
            <div class="forum-header">
              <button id="forum-exit">退出插件</button>
              <button id="forum-menu">偏好设置</button>
            </div>
            
            <div class="forum-content" id="forum-feed">
              <!-- 帖子流将在这里渲染 -->
            </div>
            
            <div class="forum-bottom-bar">
              <button id="nav-home">主页</button>
              <button id="nav-add" class="add-btn">+</button>
              <button id="nav-msg">私信</button>
            </div>

            <!-- 发帖模态框 -->
            <div class="forum-modal" id="modal-post">
              <div class="forum-modal-content">
                <h3>发布新帖</h3>
                <select id="post-tag-select" style="width: 100%; padding: 5px;"></select>
                <textarea id="post-input" placeholder="写下你的长文...（支持10万字）"></textarea>
                <div style="text-align: right;">
                  <button class="btn-cancel" id="post-cancel">取消</button>
                  <button class="btn-primary" id="post-submit">发布</button>
                </div>
              </div>
            </div>

            <!-- 设置模态框 -->
            <div class="forum-modal" id="modal-settings">
              <div class="forum-modal-content">
                <h3>偏好设置 & 世界观</h3>
                <div id="settings-list"></div>
                <div style="text-align: right; margin-top: 10px;">
                  <button class="btn-primary" id="settings-close">完成</button>
                </div>
              </div>
            </div>
          </div>
        `;

        // 4. 逻辑绑定
        const feedContainer = container.querySelector('#forum-feed');
        
        const renderFeed = () => {
          feedContainer.innerHTML = '';
          const activeTags = preferences.filter(p => p.enabled).map(p => p.name);
          
          const visiblePosts = posts.filter(p => activeTags.includes(p.tag)).reverse();
          
          if(visiblePosts.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">暂无内容，快来发帖吧</div>';
            return;
          }

          visiblePosts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            div.innerHTML = `
              <div class="post-actions" data-id="${post.id}">•••</div>
              <div class="post-tag">${post.tag}</div>
              <div class="post-author">@${post.author}</div>
              <div class="post-text collapsed">${post.content}</div>
            `;
            
            // 点击展开全文
            div.querySelector('.post-text').onclick = (e) => {
              e.target.classList.toggle('collapsed');
            };

            // 点击右上角删除（简单演示）
            div.querySelector('.post-actions').onclick = async () => {
              const confirm = await roche.ui.confirm({ title: "操作", message: "是否删除这条帖子？" });
              if (confirm) {
                posts = posts.filter(p => p.id !== post.id);
                await roche.storage.set("forum_posts", posts);
                renderFeed();
                roche.ui.toast("已删除");
              }
            };
            
            feedContainer.appendChild(div);
          });
        };

        // 初始渲染
        renderFeed();

        // 退出插件
        container.querySelector('#forum-exit').onclick = () => roche.ui.closeApp();

        // 私信占位
        container.querySelector('#nav-msg').onclick = () => roche.ui.toast("私信功能（仿 iMessage）开发中...");
        container.querySelector('#nav-home').onclick = () => renderFeed();

        // 发帖逻辑
        const modalPost = container.querySelector('#modal-post');
        container.querySelector('#nav-add').onclick = () => {
          const select = container.querySelector('#post-tag-select');
          select.innerHTML = preferences.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
          container.querySelector('#post-input').value = '';
          modalPost.style.display = 'flex';
        };
        
        container.querySelector('#post-cancel').onclick = () => modalPost.style.display = 'none';
        container.querySelector('#post-submit').onclick = async () => {
          const content = container.querySelector('#post-input').value;
          const tag = container.querySelector('#post-tag-select').value;
          if(!content.trim()) return roche.ui.toast("内容不能为空");
          
          posts.push({
            id: crypto.randomUUID(),
            author: "朵朵", // 假设当前用户名
            tag: tag,
            content: content,
            timestamp: Date.now()
          });
          
          await roche.storage.set("forum_posts", posts);
          modalPost.style.display = 'none';
          renderFeed();
          roche.ui.toast("发布成功");
        };

        // 设置逻辑
        const modalSettings = container.querySelector('#modal-settings');
        container.querySelector('#forum-menu').onclick = () => {
          const list = container.querySelector('#settings-list');
          list.innerHTML = preferences.map((p, index) => `
            <div class="pref-item">
              <label>
                <input type="checkbox" data-index="${index}" ${p.enabled ? 'checked' : ''}>
                <b>${p.name}</b>
              </label>
              <textarea data-index="${index}" placeholder="设定此标签的世界观..." style="height:60px; font-size:12px;">${p.worldView}</textarea>
            </div>
          `).join('');
          modalSettings.style.display = 'flex';
        };

        container.querySelector('#settings-close').onclick = async () => {
          const list = container.querySelector('#settings-list');
          list.querySelectorAll('.pref-item').forEach(item => {
            const index = item.querySelector('input[type="checkbox"]').dataset.index;
            preferences[index].enabled = item.querySelector('input[type="checkbox"]').checked;
            preferences[index].worldView = item.querySelector('textarea').value;
          });
          await roche.storage.set("forum_preferences", preferences);
          modalSettings.style.display = 'none';
          renderFeed();
          roche.ui.toast("偏好已保存");
        };
      },
      
      async unmount(container, roche) {
        // 清理绑定的事件和 DOM
        container.replaceChildren();
        // 清理注入的全局样式
        const style = document.getElementById("minimalist-forum-style");
        if (style) style.remove();
      }
    }
  ]
});
