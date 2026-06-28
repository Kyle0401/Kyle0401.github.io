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

function handlePress(event) {
    this.classList.add('pressed');
}

function handleRelease(event) {
    this.classList.remove('pressed');
}

function handleCancel(event) {
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
    var elements = document.querySelectorAll(selector);
    elements.forEach(function (element) {
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
var tc_main = document.getElementsByClassName('tc-main');
tc[0].addEventListener('click', function (event) {
    pop();
});
tc_main[0].addEventListener('click', function (event) {
    event.stopPropagation();
});

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
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) == 0) {
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

    var html = document.querySelector('html');
    var themeState = getCookie('themeState') || 'Light';
    var tanChiShe = document.getElementById('tanChiShe');

    function changeTheme(theme) {
        tanChiShe.src = './static/svg/snake-' + theme + '.svg';
        html.dataset.theme = theme;
        setCookie('themeState', theme, 365);
        themeState = theme;
    }

    var Checkbox = document.getElementById('myonoffswitch');
    Checkbox.addEventListener('change', function () {
        if (themeState == 'Dark') {
            changeTheme('Light');
        } else if (themeState == 'Light') {
            changeTheme('Dark');
        } else {
            changeTheme('Dark');
        }
    });

    if (themeState == 'Dark') {
        Checkbox.checked = false;
    }

    changeTheme(themeState);

    var fpsElement = document.createElement('div');
    fpsElement.id = 'fps';
    fpsElement.style.zIndex = '10000';
    fpsElement.style.position = 'fixed';
    fpsElement.style.left = '0';
    document.body.insertBefore(fpsElement, document.body.firstChild);

    var showFPS = (function () {
        var requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };

        var fps = 0,
            last = Date.now(),
            offset, step, appendFps;

        step = function () {
            offset = Date.now() - last;
            fps += 1;

            if (offset >= 1000) {
                last += offset;
                appendFps(fps);
                fps = 0;
            }

            requestAnimationFrame(step);
        };

        appendFps = function (fpsValue) {
            fpsElement.textContent = 'FPS: ' + fpsValue;
        };

        step();
    })();
});

var pageLoading = document.querySelector('#zyyo-loading');
window.addEventListener('load', function () {
    setTimeout(function () {
        pageLoading.style.opacity = '0';
    }, 100);
});
