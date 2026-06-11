// ==UserScript==
// @name         Deepseek 隐私保护
// @namespace    https://github.com/landifrancesco/Deepseek-Privacy
// @version      1.1
// @description  在聊天界面隐藏并替换敏感数据，提供友好的用户界面。
// @author       Francesco Landi
// @match        https://chat.deepseek.com/a/chat/s/*
// @grant        GM_addStyle
// @license      GNU General Public License v3.0
// @downloadURL https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/Deepseek-Privacy/edit/Zh/DeepSeek%20Privacy.user.js
// @updateURL https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/Deepseek-Privacy/edit/Zh/DeepSeek%20Privacy.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 从 localStorage 加载已保存的敏感数据
    let sensitiveData = JSON.parse(localStorage.getItem('sensitiveData')) || {};
    let caseSensitive = JSON.parse(localStorage.getItem('caseSensitive')) || false;

    // 替换敏感数据的函数
    function replaceSensitiveData() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;

        while (node = walker.nextNode()) {
            // 跳过弹窗内的节点
            if (node.parentElement.closest('#sensitiveDataPopup')) continue;

            let text = node.nodeValue;

            // 替换每个敏感词
            for (const [word, replacement] of Object.entries(sensitiveData)) {
                const regex = new RegExp(word, caseSensitive ? "g" : "gi");
                text = text.replace(regex, replacement);
            }

            node.nodeValue = text;
        }
    }

    // 检测页面主题的函数
    function detectTheme() {
        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bgColor.match(/\d+/g);
        if (rgb) {
            const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
            return brightness > 128 ? 'light' : 'dark';
        }
        return 'light'; // 如果检测失败，默认为浅色主题
    }

    // 创建锁图标和弹窗UI的函数
    function createUI() {
        const theme = detectTheme();
        const isDarkTheme = theme === 'dark';

        // 添加锁图标和弹窗的样式
        GM_addStyle(`
            #sensitiveDataLock {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                cursor: pointer;
                font-size: 24px;
                color: ${isDarkTheme ? '#fff' : '#555'};
            }
            #sensitiveDataPopup {
                display: none;
                position: fixed;
                top: 50px;
                right: 10px;
                z-index: 1000;
                background: ${isDarkTheme ? '#333' : '#fff'};
                border: 1px solid ${isDarkTheme ? '#555' : '#ccc'};
                padding: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                width: 300px;
                color: ${isDarkTheme ? '#fff' : '#000'};
            }
            #sensitiveDataPopup input {
                width: 100%;
                margin-bottom: 10px;
                padding: 5px;
                background: ${isDarkTheme ? '#444' : '#fff'};
                color: ${isDarkTheme ? '#fff' : '#000'};
                border: 1px solid ${isDarkTheme ? '#555' : '#ccc'};
            }
            #sensitiveDataPopup button {
                padding: 5px 10px;
                margin-right: 5px;
                background: ${isDarkTheme ? '#555' : '#eee'};
                color: ${isDarkTheme ? '#fff' : '#000'};
                border: 1px solid ${isDarkTheme ? '#666' : '#ccc'};
                cursor: pointer;
            }
            #sensitiveDataList {
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 10px;
            }
            .case-sensitive-container {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }
            .case-sensitive-container label {
                margin-left: 5px;
            }
        `);

        // 创建锁图标
        const lockIcon = document.createElement('div');
        lockIcon.id = 'sensitiveDataLock';
        lockIcon.innerHTML = '🔒';
        document.body.appendChild(lockIcon);

        // 创建弹窗
        const popup = document.createElement('div');
        popup.id = 'sensitiveDataPopup';
        popup.innerHTML = `
            <h3>敏感数据隐藏器</h3>
            <input id="sensitiveWordInput" placeholder="输入敏感词">
            <input id="replacementInput" placeholder="输入替换词">
            <div class="case-sensitive-container">
                <input type="checkbox" id="caseSensitiveCheckbox">
                <label for="caseSensitiveCheckbox">区分大小写</label>
            </div>
            <button id="addSensitiveData">添加</button>
            <div id="sensitiveDataList"></div>
            <button id="closePopup">关闭</button>
        `;
        document.body.appendChild(popup);

        // 切换弹窗显示/隐藏
        lockIcon.addEventListener('click', () => {
            popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
            updateSensitiveDataList();
            // 打开弹窗时更新复选框状态
            document.getElementById('caseSensitiveCheckbox').checked = caseSensitive;
        });

        // 关闭弹窗
        document.getElementById('closePopup').addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // 添加新的敏感词和替换词
        document.getElementById('addSensitiveData').addEventListener('click', () => {
            const word = document.getElementById('sensitiveWordInput').value.trim();
            const replacement = document.getElementById('replacementInput').value.trim();

            if (word && replacement) {
                sensitiveData[word] = replacement;
                localStorage.setItem('sensitiveData', JSON.stringify(sensitiveData));
                updateSensitiveDataList();
                replaceSensitiveData();
                document.getElementById('sensitiveWordInput').value = '';
                document.getElementById('replacementInput').value = '';
            }
        });

        // 更新敏感词和替换词的列表
        function updateSensitiveDataList() {
            const list = document.getElementById('sensitiveDataList');
            list.innerHTML = Object.entries(sensitiveData)
                .map(([word, replacement]) => `
                    <div>
                        <strong>${word}</strong> → ${replacement}
                        <button data-word="${word}" class="removeButton">删除</button>
                    </div>
                `)
                .join('');

            // 为删除按钮添加事件监听器
            document.querySelectorAll('.removeButton').forEach(button => {
                button.addEventListener('click', () => {
                    const word = button.getAttribute('data-word');
                    removeSensitiveData(word);
                });
            });
        }

        // 删除一个敏感词和替换词
        function removeSensitiveData(word) {
            delete sensitiveData[word];
            localStorage.setItem('sensitiveData', JSON.stringify(sensitiveData));
            updateSensitiveDataList();
            replaceSensitiveData();
        }

        // 切换大小写敏感性
        document.getElementById('caseSensitiveCheckbox').addEventListener('change', (event) => {
            caseSensitive = event.target.checked;
            localStorage.setItem('caseSensitive', JSON.stringify(caseSensitive));
            replaceSensitiveData(); // 使用新的大小写敏感性设置重新应用替换
        });

        // 初始化复选框状态
        document.getElementById('caseSensitiveCheckbox').checked = caseSensitive;
    }

    // 初始化UI并替换敏感数据
    createUI();
    replaceSensitiveData();

    // 观察DOM变化以处理动态内容
    const observer = new MutationObserver(replaceSensitiveData);
    observer.observe(document.body, { childList: true, subtree: true });
})();
