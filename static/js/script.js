console.log('%cCopyright © 2024 zyyo.net',
    'background-color: #ff00ff; color: white; font-size: 24px; font-weight: bold; padding: 10px;'
);
console.log('%c   /\_/\\', 'color: #8B4513; font-size: 20px;');
console.log('%c  ( o.o )', 'color: #8B4513; font-size: 20px;');
console.log(' %c  > ^ <', 'color: #8B4513; font-size: 20px;');
console.log('  %c /  ~ \\', 'color: #8B4513; font-size: 20px;');
console.log('  %c/______\\', 'color: #8B4513; font-size: 20px;');

document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

function handlePress() {
    this.classList.add('pressed');
}

function handleRelease() {
    this.classList.remove('pressed');
}

function handleCancel() {
    this.classList.remove('pressed');
}

var buttons = document.querySelectorAll('.projectItem');
buttons.forEach(function (button) {
    button.addEventListener('mousedown', handlePress);
    button.addEventListener('mouseup', handleRelease);
    button.addEventListener('mouseleave', handleCancel);
    button.addEventListener('touchstart', handlePress);
    button.addEventListener('touchend', handleRelease);
    button.addEventListener('touchcancel', handleCancel);
});

function toggleClass(selector, className) {
    document.querySelectorAll(selector).forEach(function (element) {
        element.classList.toggle(className);
    });
}

function pop(imageURL) {
    var tcMainElement = document.querySelector('.tc-img');
    if (imageURL) {
        tcMainElement.src = imageURL;
    }
    toggleClass('.tc-main', 'active');
    toggleClass('.tc', 'active');
}

var tc = document.getElementsByClassName('tc');
var tcMain = document.getElementsByClassName('tc-main');
if (tc.length > 0) {
    tc[0].addEventListener('click', function () {
        pop();
    });
}
if (tcMain.length > 0) {
    tcMain[0].addEventListener('click', function (event) {
        event.stopPropagation();
    });
}

function setCookie(name, value, days) {
    var expires = '';
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/';
}

function getCookie(name) {
    var nameEQ = name + '=';
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', function () {
    var favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
        favicon.href = './static/img/logo-jy.svg';
        favicon.type = 'image/svg+xml';
    }

    var profileTagContainer = document.querySelector('.left-tag');
    var profileTags = ['网瘾', '研0', 'OS', 'Linux', '跑者', '嵌入式', '羽毛球', '小提琴'];
    if (profileTagContainer) {
        profileTagContainer.innerHTML = '';
        profileTags.forEach(function (tagText) {
            var tag = document.createElement('div');
            tag.className = 'left-tag-item';
            tag.textContent = tagText;
            profileTagContainer.appendChild(tag);
        });
    }

    var descriptions = document.querySelectorAll('.description');
    if (descriptions.length > 0) {
        descriptions[0].innerHTML = '👦 <span class="purpleText textBackground">寄</span>算机大<span class="purpleText textBackground">摆子</span>';
    }
    if (descriptions.length > 1) {
        descriptions[1].innerHTML = '📝 <span class="purpleText textBackground">Man</span> proposes, <span class="purpleText textBackground">God</span> disposes';
    }

    var mailButton = document.querySelector('.iconItem[aria-label="Mail"]');
    if (mailButton) {
        mailButton.setAttribute('role', 'button');
        mailButton.setAttribute('tabindex', '0');
        mailButton.setAttribute('title', '点击查看邮箱');
        mailButton.style.cursor = 'pointer';

        function showMailAddress() {
            window.prompt('我的邮箱（可直接复制）：', '1154727104@qq.com');
        }

        mailButton.addEventListener('click', showMailAddress);
        mailButton.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                showMailAddress();
            }
        });
    }

    var qqButton = document.querySelector('.iconItem[aria-label="QQ"]');
    if (qqButton) {
        qqButton.setAttribute('role', 'button');
        qqButton.setAttribute('tabindex', '0');
        qqButton.setAttribute('title', '点击查看QQ帐号');
        qqButton.style.cursor = 'pointer';

        function showQQAccount() {
            window.prompt('我的QQ帐号（微信同号，可直接复制）：', '1154727104');
        }

        qqButton.addEventListener('click', showQQAccount);
        qqButton.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                showQQAccount();
            }
        });
    }

    var sectionTitles = document.querySelectorAll('main > .title');
    var sectionLabels = ['Site', 'Project', 'Skills'];
    sectionTitles.forEach(function (title, index) {
        if (sectionLabels[index]) {
            title.textContent = sectionLabels[index];
        }
    });

    var projectLists = document.querySelectorAll('.projectList');
    if (projectLists.length > 0) {
        var siteCards = projectLists[0].querySelectorAll('.projectItem');

        if (siteCards.length > 0) {
            var blogCard = siteCards[0];
            blogCard.querySelector('h1').textContent = '博客收藏';
            blogCard.querySelector('p').textContent = '收藏的优质技术博客';
            blogCard.querySelector('.projectItemRight img').alt = '博客收藏图标';
            blogCard.setAttribute('role', 'link');
            blogCard.setAttribute('tabindex', '0');
            blogCard.style.cursor = 'pointer';

            function openBlogDirectory() {
                window.location.href = './blog/';
            }

            blogCard.addEventListener('click', openBlogDirectory);
            blogCard.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openBlogDirectory();
                }
            });
        }

        if (siteCards.length > 2) {
            var travelCard = siteCards[2];
            travelCard.querySelector('h1').textContent = '旅行';
            travelCard.querySelector('p').textContent = '记录旅行攻略和见闻';
            travelCard.setAttribute('role', 'link');
            travelCard.setAttribute('tabindex', '0');
            travelCard.style.cursor = 'pointer';

            function openTravelDirectory() {
                window.location.href = './travel/';
            }

            travelCard.addEventListener('click', openTravelDirectory);
            travelCard.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openTravelDirectory();
                }
            });
        }

        if (siteCards.length > 3) {
            var learningCard = siteCards[3];
            projectLists[0].insertBefore(learningCard, projectLists[0].firstElementChild);
            learningCard.querySelector('h1').textContent = '学习记录';
            learningCard.querySelector('p').textContent = '记录计算机知识的学习';
            learningCard.querySelector('.projectItemRight img').alt = '学习记录图标';
            learningCard.setAttribute('role', 'link');
            learningCard.setAttribute('tabindex', '0');
            learningCard.style.cursor = 'pointer';

            function openLearningDirectory() {
                window.location.href = './learning/';
            }

            learningCard.addEventListener('click', openLearningDirectory);
            learningCard.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openLearningDirectory();
                }
            });
        }
    }

    if (projectLists.length > 1) {
        var projectCards = projectLists[1].querySelectorAll('.projectItem');

        if (projectCards.length > 0) {
            projectCards[0].querySelector('h1').textContent = '项目记录';
            projectCards[0].querySelector('p').textContent = '项目的介绍与解读';
            projectCards[0].querySelector('.projectItemRight img').alt = '项目记录图标';
        }

        if (projectCards.length > 1) {
            projectCards[1].querySelector('h1').textContent = '代码仓库';
            projectCards[1].querySelector('p').textContent = '存储项目代码';
            projectCards[1].querySelector('.projectItemRight img').alt = '代码仓库图标';
        }
    }

    var html = document.querySelector('html');
    var themeState = getCookie('themeState') || 'Light';
    var tanChiShe = document.getElementById('tanChiShe');
    var themeSwitch = document.querySelector('.switch');

    if (themeSwitch && !themeSwitch.querySelector('.switchLabel')) {
        var switchLabel = document.createElement('span');
        switchLabel.className = 'switchLabel';
        switchLabel.textContent = '关灯';
        switchLabel.style.whiteSpace = 'nowrap';
        switchLabel.style.fontSize = '13px';
        switchLabel.style.fontWeight = '700';
        switchLabel.style.lineHeight = '1';
        themeSwitch.insertBefore(switchLabel, themeSwitch.firstChild);
        themeSwitch.style.width = '91px';
        themeSwitch.style.gap = '6px';
        themeSwitch.style.padding = '0 8px';
        themeSwitch.style.justifyContent = 'space-between';
    }

    function changeTheme(theme) {
        if (tanChiShe) {
            tanChiShe.src = './static/svg/snake-' + theme + '.svg';
        }
        html.dataset.theme = theme;

        if (themeSwitch) {
            var switchLabel = themeSwitch.querySelector('.switchLabel');
            var switchAction = theme === 'Dark' ? '开灯' : '关灯';

            if (switchLabel) {
                switchLabel.textContent = switchAction;
            }

            themeSwitch.setAttribute('aria-label', switchAction);
            themeSwitch.setAttribute('title', switchAction);
        }

        setCookie('themeState', theme, 365);
        themeState = theme;
    }

    var checkbox = document.getElementById('myonoffswitch');
    if (checkbox) {
        checkbox.addEventListener('change', function () {
            if (themeState === 'Dark') {
                changeTheme('Light');
            } else {
                changeTheme('Dark');
            }
        });

        if (themeState === 'Dark') {
            checkbox.checked = false;
        }
    }

    changeTheme(themeState);

    var fpsElement = document.createElement('div');
    fpsElement.id = 'fps';
    fpsElement.style.zIndex = '10000';
    fpsElement.style.position = 'fixed';
    fpsElement.style.left = '0';
    document.body.insertBefore(fpsElement, document.body.firstChild);

    (function showFPS() {
        var requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };

        var fps = 0;
        var last = Date.now();

        function step() {
            var offset = Date.now() - last;
            fps += 1;

            if (offset >= 1000) {
                last += offset;
                fpsElement.textContent = 'FPS: ' + fps;
                fps = 0;
            }

            requestAnimationFrame(step);
        }

        step();
    })();
});

var pageLoading = document.querySelector('#zyyo-loading');
window.addEventListener('load', function () {
    setTimeout(function () {
        if (pageLoading) {
            pageLoading.style.opacity = '0';
        }
    }, 100);
});
