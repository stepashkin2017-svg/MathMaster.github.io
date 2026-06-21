function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }
let currentUser = JSON.parse(localStorage.getItem('mathmaster_user') || 'null');
let usersDB = JSON.parse(localStorage.getItem('mathmaster_users') || '{}');

function initAuthSystem() {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab)));
    document.getElementById('login-email')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
    document.getElementById('login-password')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
    document.querySelectorAll('.profile-tab').forEach(tab => tab.addEventListener('click', () => openProfileTab(tab.dataset.profileTab)));
}
function checkAuthState() {
    const authBtn = document.getElementById('auth-btn');
    const profileBtn = document.getElementById('profile-btn');
    const progressSection = document.getElementById('progress');
    if (currentUser) {
        authBtn.style.display = 'none';
        profileBtn.style.display = 'flex';
        if (progressSection) progressSection.style.display = 'block';
        updateProfileUI();
        updateProgressStats();
    } else {
        authBtn.style.display = 'block';
        profileBtn.style.display = 'none';
        if (progressSection) progressSection.style.display = 'none';
    }
    updateCourseCardsProgress();
}
function openAuthModal() { document.getElementById('auth-modal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeAuthModal() { document.getElementById('auth-modal').classList.remove('active'); document.body.style.overflow = ''; }
function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.toggle('active', form.id === `${tabName}-form`));
}
function register() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    if (!name || !email || !password) { showToast('Заполните все поля', 'error'); return; }
    if (password.length < 6) { showToast('Пароль должен быть минимум 6 символов', 'error'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { showToast('Введите корректный email', 'error'); return; }
    if (usersDB[email]) { showToast('Пользователь с таким email уже существует', 'error'); return; }
    const newUser = {
        id: Date.now().toString(),
        name, email,
        password: hashPassword(password),
        avatar: null,
        createdAt: new Date().toISOString(),
        stats: { lessonsCompleted: 0, problemsSolved: 0, correctAnswers: 0, streakDays: 1, totalTime: 0, lastActive: new Date().toISOString() },
        progress: { algebra: 0, geometry: 0, calculus: 0, probability: 0, ege: 0, olympiad: 0 },
        achievements: ['first_lesson'],
        activityHistory: [],
        savedProblems: [],
        subscribedCourses: []
    };
    usersDB[email] = newUser;
    localStorage.setItem('mathmaster_users', JSON.stringify(usersDB));
    loginUser(newUser);
    showToast('Аккаунт успешно создан!', 'success');
    closeAuthModal();
}
function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!email || !password) { showToast('Заполните все поля', 'error'); return; }
    const user = usersDB[email];
    if (!user) { showToast('Пользователь не найден', 'error'); return; }
    if (user.password !== hashPassword(password)) { showToast('Неверный пароль', 'error'); return; }
    loginUser(user);
    showToast('Вход выполнен успешно!', 'success');
    closeAuthModal();
}
function loginUser(user) {
    currentUser = user;
    localStorage.setItem('mathmaster_user', JSON.stringify(user));
    updateUserStreak();
    checkAuthState();
}
function logout() {
    currentUser = null;
    localStorage.removeItem('mathmaster_user');
    showToast('Вы вышли из аккаунта', 'info');
    closeProfileModal();
    checkAuthState();
}
function updateUserStreak() {
    if (!currentUser) return;
    const lastActive = new Date(currentUser.stats.lastActive);
    const today = new Date();
    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) currentUser.stats.streakDays++;
    else if (diffDays > 1) currentUser.stats.streakDays = 1;
    currentUser.stats.lastActive = today.toISOString();
    saveCurrentUser(); 
}
function saveCurrentUser() {
    if (!currentUser) return;
    usersDB[currentUser.email] = currentUser;
    localStorage.setItem('mathmaster_users', JSON.stringify(usersDB));
    localStorage.setItem('mathmaster_user', JSON.stringify(currentUser));
}
function openProfileModal() {
    if (!currentUser) { openAuthModal(); return; }
    document.getElementById('profile-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    openProfileTab('overview');
    const uploadInput = document.getElementById('avatar-upload');
    uploadInput.removeEventListener('change', handleAvatarUpload);
    uploadInput.addEventListener('change', handleAvatarUpload);
}
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Пожалуйста, выберите изображение', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Размер файла не должен превышать 2 МБ', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        currentUser.avatar = e.target.result;
        saveCurrentUser();
        updateAvatarDisplay();
        showToast('Аватар обновлён', 'success');
    };
    reader.readAsDataURL(file);
}
function updateAvatarDisplay() {
    const avatarCircle = document.getElementById('user-avatar');
    if (!avatarCircle) return;
    if (currentUser.avatar) {
        avatarCircle.style.backgroundImage = `url('${currentUser.avatar}')`;
        avatarCircle.classList.add('has-image');
        avatarCircle.textContent = '';
    } else {
        avatarCircle.style.backgroundImage = '';
        avatarCircle.classList.remove('has-image');
        avatarCircle.textContent = currentUser.name.charAt(0).toUpperCase();
    }
}
function closeProfileModal() { document.getElementById('profile-modal').classList.remove('active'); document.body.style.overflow = ''; }
function openProfileTab(tabName) {
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.profileTab === tabName));
    document.querySelectorAll('.profile-tab-content').forEach(content => content.classList.toggle('active', content.id === `profile-${tabName}`));
    renderProfileTab(tabName);
}
function renderProfileTab(tabName) {
    if (!currentUser) return;
    switch (tabName) {
        case 'overview': renderOverview(); break;
        case 'courses': renderCourses(); break;
        case 'favorites': renderFavorites(); break;
        case 'achievements': renderAchievements(); break;
        case 'settings': renderSettings(); break;
    }
}
function renderOverview() {
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-email').textContent = currentUser.email;
    updateAvatarDisplay();
    document.getElementById('lessons-count').textContent = currentUser.stats.lessonsCompleted;
    document.getElementById('problems-count').textContent = currentUser.stats.problemsSolved;
    document.getElementById('streak-days').textContent = currentUser.stats.streakDays;
    const totalProgress = Object.values(currentUser.progress).reduce((a, b) => a + b, 0);
    const level = Math.floor(totalProgress / 25) + 1;
    const levelPercent = (totalProgress % 25) * 4;
    document.querySelector('.level-fill').style.width = `${levelPercent}%`;
    document.getElementById('level-text').textContent = `Уровень ${level}`;
    const historyList = document.getElementById('activity-history');
    if (currentUser.activityHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Пока нет активности</div>';
    } else {
        historyList.innerHTML = currentUser.activityHistory.slice(0, 5).map(act => `<div class="history-item"><div class="history-title">${act.title}</div><div class="history-date">${formatDate(act.date)}</div></div>`).join('');
    }
}
function subscribeToCourse(courseId) {
    if (!currentUser) return;
    if (!currentUser.subscribedCourses) currentUser.subscribedCourses = [];
    if (!currentUser.subscribedCourses.includes(courseId)) {
        currentUser.subscribedCourses.push(courseId);
        saveCurrentUser();
        showToast(`Курс добавлен в "Мои курсы"`, 'success');
    }
}
function renderCourses() {
    const container = document.getElementById('profile-courses-list');
    if (!currentUser.subscribedCourses || currentUser.subscribedCourses.length === 0) {
        container.innerHTML = '<div class="history-empty">Вы ещё не добавили ни одного курса. Перейдите в <a href="#courses" onclick="closeProfileModal(); scrollToCourses();">каталог</a>, чтобы начать.</div>';
        return;
    }
    const courses = [
        { key: 'algebra', title: 'Алгебра', icon: 'function-square', color: 'algebra-bg' },
        { key: 'geometry', title: 'Геометрия', icon: 'triangle', color: 'geometry-bg' },
        { key: 'calculus', title: 'Матанализ', icon: 'sigma', color: 'calculus-bg' },
        { key: 'probability', title: 'Теория вероятностей', icon: 'dice-5', color: 'probability-bg' },
        { key: 'ege', title: 'Подготовка к ЕГЭ', icon: 'clipboard-check', color: 'ege-bg' },
        { key: 'olympiad', title: 'Олимпиадная математика', icon: 'trophy', color: 'olympiad-bg' }
    ];
    const subscribed = courses.filter(c => currentUser.subscribedCourses.includes(c.key));
    container.innerHTML = subscribed.map(course => {
        const progress = currentUser.progress[course.key] || 0;
        return `<div class="profile-course-item"><div class="profile-course-icon ${course.color}"><i data-lucide="${course.icon}"></i></div><div class="profile-course-info"><h4>${course.title}</h4><div class="progress-bar-mini"><div class="progress-fill-mini" style="width: ${progress}%"></div></div><span class="progress-percent">${progress}%</span></div><button class="btn btn-outline btn-sm" onclick="openCourseModal('${course.key}')">Продолжить</button></div>`;
    }).join('');
    lucide.createIcons();
}
function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!currentUser.savedProblems || currentUser.savedProblems.length === 0) {
        container.innerHTML = '<div class="history-empty">У вас пока нет избранных задач</div>';
        return;
    }
    container.innerHTML = currentUser.savedProblems.map((prob, index) => `<div class="favorite-item"><div class="problem-info"><div class="problem-title">${prob.category} • ${prob.text.substring(0, 50)}...</div><div class="problem-meta">Сложность: ${prob.difficulty}</div></div><button class="btn btn-primary btn-sm" onclick="loadProblemFromFavorite(${index})">Решить</button></div>`).join('');
}
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!currentUser.savedProblems || currentUser.savedProblems.length === 0) {
        container.innerHTML = '<div class="history-empty">У вас пока нет избранных задач</div>';
        return;
    }
    container.innerHTML = currentUser.savedProblems.map((prob, index) => {
        const safeText = escapeHtml(prob.text.substring(0, 50));
        const safeCategory = escapeHtml(prob.category);
        const safeDifficulty = escapeHtml(prob.difficulty);
        return `<div class="favorite-item">
            <div class="problem-info">
                <div class="problem-title">${safeCategory} • ${safeText}...</div>
                <div class="problem-meta">Сложность: ${safeDifficulty}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="loadProblemFromFavorite(${index})">Решить</button>
        </div>`;
    }).join('');
}
function renderSettings() {
    document.getElementById('settings-name').value = currentUser.name;
    document.getElementById('settings-password').value = '';
    document.getElementById('settings-password-confirm').value = '';
}
function saveSettings() {
    const newName = document.getElementById('settings-name').value.trim();
    const newPass = document.getElementById('settings-password').value;
    const confirmPass = document.getElementById('settings-password-confirm').value;
    if (newName) currentUser.name = newName;
    if (newPass) {
        if (newPass.length < 6) { showToast('Пароль должен быть минимум 6 символов', 'error'); return; }
        if (newPass !== confirmPass) { showToast('Пароли не совпадают', 'error'); return; }
        currentUser.password = hashPassword(newPass);
    }
    saveCurrentUser();
    showToast('Настройки сохранены', 'success');
    renderOverview();
    closeProfileModal();
}
function exportProfile() {
    const dataStr = JSON.stringify(currentUser, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mathmaster_profile_${currentUser.email}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
function importProfile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.email || typeof imported.email !== 'string' || !imported.name || typeof imported.name !== 'string' || !imported.stats || typeof imported.stats !== 'object' || !imported.progress || typeof imported.progress !== 'object') throw new Error('Неверный формат файла');
            if (usersDB[imported.email] && usersDB[imported.email].id !== currentUser?.id) { if (!confirm('Пользователь с таким email уже существует. Заменить данные?')) return; }
            if (imported.avatar && typeof imported.avatar === 'string' && imported.avatar.startsWith('data:image')) { } else { imported.avatar = null; }
            if (!imported.subscribedCourses) imported.subscribedCourses = [];
            currentUser = imported;
            usersDB[imported.email] = imported;
            saveCurrentUser();
            showToast('Профиль импортирован', 'success');
            closeProfileModal();
            checkAuthState();
        } catch (err) { showToast('Ошибка при импорте: ' + err.message, 'error'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}
let problemsDB = [
    { id: 1, category: "Алгебра", difficulty: "easy", text: "Решите уравнение: \\(2x^2 - 5x + 3 = 0\\)", answer: ["x = 1, x = 1.5", "x = 1.5, x = 1", "x=1, x=1.5"], hint: "Используйте формулу дискриминанта: \\(D = b^2 - 4ac\\)", solution: ["Находим дискриминант: \\(D = (-5)^2 - 4 \\cdot 2 \\cdot 3 = 25 - 24 = 1\\)", "Используем формулу корней: \\(x_{1,2} = \\frac{5 \\pm \\sqrt{1}}{2 \\cdot 2}\\)", "Вычисляем корни: \\(x_1 = \\frac{5 + 1}{4} = 1.5\\), \\(x_2 = \\frac{5 - 1}{4} = 1\\)"] },
    { id: 2, category: "Геометрия", difficulty: "easy", text: "Найдите площадь прямоугольного треугольника с катетами 3 см и 4 см.", answer: ["6", "6 см²", "6 см^2"], hint: "Площадь прямоугольного треугольника равна половине произведения катетов", solution: ["Формула площади: \\(S = \\frac{1}{2}ab\\)", "Подставляем значения: \\(S = \\frac{1}{2} \\cdot 3 \\cdot 4\\)", "Вычисляем: \\(S = 6\\) см²"] },
    { id: 3, category: "Геометрия", difficulty: "medium", text: "В прямоугольном треугольнике гипотенуза равна 10 см, один из катетов равен 6 см. Найдите второй катет.", answer: ["8", "8 см"], hint: "Используйте теорему Пифагора: \\(a^2 + b^2 = c^2\\)", solution: ["Теорема Пифагора: \\(a^2 + b^2 = c^2\\)", "Подставляем известные значения: \\(6^2 + b^2 = 10^2\\)", "Вычисляем: \\(36 + b^2 = 100\\)", "Находим \\(b^2 = 100 - 36 = 64\\)", "Извлекаем корень: \\(b = \\sqrt{64} = 8\\) см"] }
];
let currentProblemIndex = 0;
function initPracticeProblems() { if (!document.querySelector('.problem-card')) return; loadProblem(0); }
function loadProblem(index) {
    const problem = problemsDB[index];
    if (!problem) return;
    currentProblemIndex = index;
    window.currentProblem = problem;
    document.querySelector('.problem-category').textContent = `${problem.category} • Уравнения`;
    document.querySelector('.problem-difficulty').textContent = problem.difficulty === 'easy' ? 'Лёгкая' : problem.difficulty === 'medium' ? 'Средняя' : 'Сложная';
    document.querySelector('.problem-difficulty').className = `problem-difficulty ${problem.difficulty}`;
    document.getElementById('problem-text').innerHTML = problem.text;
    document.getElementById('hint-content').innerHTML = problem.hint;
    document.getElementById('solution-steps').innerHTML = `<h5>Пошаговое решение:</h5><ol>${problem.solution.map(step => `<li>${step}</li>`).join('')}</ol>`;
    document.getElementById('solution-steps').style.display = 'none';
    document.getElementById('hint-content').style.display = 'none';
    document.getElementById('answer-input').value = '';
    if (window.MathJax) MathJax.typesetPromise();
}
function normalize(str) {
    const numbers = str.match(/-?\d+(?:\.\d+)?/g);
    if (!numbers) return '';
    return numbers.map(n => parseFloat(n).toString()).sort().join(',');
}
function checkAnswer() {
    const answerInput = document.getElementById('answer-input').value.trim();
    const correctAnswers = window.currentProblem.answer.map(ans => normalize(ans));
    const userAnswer = normalize(answerInput);
    if (!userAnswer) { showToast('Введите ответ', 'warning'); return; }
    const isCorrect = correctAnswers.some(correct => userAnswer === correct);
    if (isCorrect) {
        showToast('Правильно! 🎉', 'success');
        if (currentUser) {
            currentUser.stats.problemsSolved++;
            currentUser.stats.correctAnswers++;
            if (window.currentProblem.category === 'Алгебра') currentUser.progress.algebra = Math.min(100, currentUser.progress.algebra + 2);
            else if (window.currentProblem.category === 'Геометрия') currentUser.progress.geometry = Math.min(100, currentUser.progress.geometry + 2);
            currentUser.activityHistory.unshift({ title: `Решена задача: ${window.currentProblem.category}`, date: new Date().toISOString(), correct: true });
            saveCurrentUser();
            updateProgressStats();
            animateProgressCircles();
        }
        document.getElementById('solution-steps').style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise();
    } else showToast('Попробуйте ещё раз', 'error');
}
function toggleHint() { const hint = document.getElementById('hint-content'); hint.style.display = hint.style.display === 'none' ? 'block' : 'none'; if (hint.style.display === 'block' && window.MathJax) MathJax.typesetPromise(); }
function nextProblem() { currentProblemIndex = (currentProblemIndex + 1) % problemsDB.length; loadProblem(currentProblemIndex); }
function generateSimilar() {
    if (!window.currentProblem) return;
    const current = window.currentProblem;
    const similar = problemsDB.find(p => p.category === current.category && p.difficulty === current.difficulty && p.id !== current.id);
    if (similar) { const index = problemsDB.findIndex(p => p.id === similar.id); loadProblem(index); }
    else nextProblem();
}
function saveToFavorites() {
    if (!currentUser) { openAuthModal(); showToast('Войдите, чтобы сохранять задачи', 'warning'); return; }
    const problem = window.currentProblem;
    if (!problem) return;
    if (currentUser.savedProblems.some(p => p.id === problem.id)) { showToast('Задача уже в избранном', 'info'); return; }
    currentUser.savedProblems.push(problem);
    saveCurrentUser();
    showToast('Задача добавлена в избранное', 'success');
}
function loadProblemFromFavorite(index) {
    const problem = currentUser.savedProblems[index];
    if (!problem) return;
    if (!problemsDB.find(p => p.id === problem.id)) problemsDB.push(problem);
    const newIndex = problemsDB.findIndex(p => p.id === problem.id);
    loadProblem(newIndex);
    closeProfileModal();
    document.getElementById('practice').scrollIntoView({ behavior: 'smooth' });
}
function initCalculator() {
    if (!document.querySelector('.calculator-grid')) return;
    document.querySelectorAll('.output-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.output-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`calc-${tab.dataset.tab}`).classList.add('active');
            if (tab.dataset.tab === 'graph' && window.lastGraphExpr) drawGraph(window.lastGraphExpr);
        });
    });
}
function addToInput(val) { document.getElementById('calc-input').value += val; }
function clearInput() { document.getElementById('calc-input').value = ''; }
function calculate() {
    const input = document.getElementById('calc-input').value.trim();
    if (!input) { showToast('Введите выражение', 'warning'); return; }
    try {
        let result = '';
        let steps = [];
        const expr = input.replace(/÷/g, '/').replace(/×/g, '*').replace(/\^/g, '**');
        const hasX = expr.includes('x');
        const hasEqual = expr.includes('=');
        if (hasEqual && hasX) {
            const sides = expr.split('=');
            if (sides.length !== 2) throw new Error('Неверный формат уравнения');
            const left = sides[0].trim();
            const right = sides[1].trim();
            const equation = `(${left}) - (${right})`;
            const roots = [];
            const step = 0.1;
            for (let xVal = -100; xVal <= 100; xVal += step) {
                const scope = { x: xVal };
                const y = math.evaluate(equation, scope);
                if (Math.abs(y) < 0.001) {
                    const rounded = Math.round(xVal * 1000) / 1000;
                    if (!roots.includes(rounded)) roots.push(rounded);
                }
            }
            if (roots.length === 0) {
                result = 'Корней не найдено на отрезке [-100, 100]';
                steps = ['Уравнение: ' + input, 'Привели к виду: ' + equation + ' = 0', 'Численный поиск не дал результата.'];
            } else {
                result = 'x = ' + roots.join(', x = ');
                steps = ['Исходное уравнение: ' + input, 'Привели к виду: ' + equation + ' = 0', 'Нашли корни численно с шагом 0.1', 'Корни: ' + result];
            }
        } else if (hasX) {
            const sampleX = [0, 1, 2];
            const values = sampleX.map(xVal => { const scope = { x: xVal }; return `${xVal} → ${math.evaluate(expr, scope)}`; });
            result = `Выражение: ${expr}`;
            steps = ['Подставили несколько значений x:', ...values, 'График построен во вкладке "График"'];
            window.lastGraphExpr = expr;
        } else {
            const res = math.evaluate(expr);
            result = `Результат: ${res}`;
            steps = [`${input} = ${res}`];
        }
        document.getElementById('calc-result').innerHTML = `<div class="calc-result-display"><div class="result-title">Результат:</div><div class="result-value">${result}</div></div>`;
        document.getElementById('calc-steps').innerHTML = `<div class="steps-list"><h5>Шаги:</h5><ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol></div>`;
        if (expr.includes('x')) drawGraph(expr);
        else { document.getElementById('calc-graph').innerHTML = '<div class="graph-placeholder"><i data-lucide="trending-up"></i><p>График доступен только для выражений с переменной x</p></div>'; lucide.createIcons(); }
        if (currentUser) { currentUser.activityHistory.unshift({ title: `Калькулятор: ${input}`, date: new Date().toISOString(), type: 'calculator' }); saveCurrentUser(); }
    } catch (e) { showToast('Ошибка в выражении: ' + e.message, 'error'); }
}
function drawGraph(expression) {
    const container = document.getElementById('calc-graph');
    if (!container) return;
    container.innerHTML = '<canvas id="graph-canvas"></canvas>';
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = container.clientWidth || 400;
    canvas.height = container.clientHeight || 300;
    const points = [];
    for (let xVal = -10; xVal <= 10; xVal += 0.2) {
        try {
            const scope = { x: xVal };
            const y = math.evaluate(expression, scope);
            if (isFinite(y) && !isNaN(y)) points.push({ x: xVal, y: y });
        } catch (e) {}
    }
    if (points.length === 0) { container.innerHTML = '<div class="graph-placeholder">Не удалось построить график</div>'; return; }
    if (window.graphInstance) { window.graphInstance.destroy(); window.graphInstance = null; }
    window.graphInstance = new Chart(ctx, { type: 'line', data: { datasets: [{ label: expression, data: points, borderColor: '#4F46E5', borderWidth: 2, fill: false, pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'linear', position: 'bottom', title: { display: true, text: 'x' } }, y: { title: { display: true, text: 'y' } } } } });
    window.lastGraphExpr = expression;
}
function updateProgressStats() {
    if (!currentUser) return;
    const totalSolvedEl = document.getElementById('total-solved');
    const accuracyEl = document.getElementById('accuracy');
    const learningTimeEl = document.getElementById('learning-time');
    if (totalSolvedEl) totalSolvedEl.textContent = `${currentUser.stats.problemsSolved} задач`;
    const accuracy = currentUser.stats.problemsSolved > 0 ? Math.round((currentUser.stats.correctAnswers / currentUser.stats.problemsSolved) * 100) : 0;
    if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;
    if (learningTimeEl) learningTimeEl.textContent = `${Math.floor(currentUser.stats.totalTime / 60)} ч`;
    renderTopicsChart();
    renderActivityCalendar();
}
function renderTopicsChart() {
    const canvas = document.getElementById('topics-chart');
    if (!canvas) return;
    if (window.topicsChartInstance) window.topicsChartInstance.destroy();
    const labels = ['Алгебра', 'Геометрия', 'Матанализ', 'Вероятность', 'ЕГЭ', 'Олимпиады'];
    const data = [currentUser?.progress.algebra || 0, currentUser?.progress.geometry || 0, currentUser?.progress.calculus || 0, currentUser?.progress.probability || 0, currentUser?.progress.ege || 0, currentUser?.progress.olympiad || 0];
    const backgroundColors = ['#4F46E5', '#F59E0B', '#EC4899', '#10B981', '#8B5CF6', '#F97316'];
    window.topicsChartInstance = new Chart(canvas, { type: 'bar', data: { labels: labels, datasets: [{ data: data, backgroundColor: backgroundColors, borderRadius: 8, borderSkipped: false }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { display: false }, ticks: { callback: value => value + '%' } }, y: { grid: { display: false } } } } });
}
function renderActivityCalendar() {
    const calendar = document.getElementById('activity-calendar');
    if (!calendar) return;
    if (!currentUser) { calendar.innerHTML = '<div class="history-empty">Войдите, чтобы увидеть активность</div>'; return; }
    const today = new Date();
    const startDate = new Date(today); startDate.setDate(today.getDate() - 90);
    const days = [];
    for (let i = 0; i < 90; i++) {
        const date = new Date(startDate); date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const count = currentUser.activityHistory.filter(act => act.date.startsWith(dateStr)).length;
        days.push({ date: dateStr, count: Math.min(count, 4) });
    }
    const weeks = []; let currentWeek = [];
    days.forEach((day, index) => { currentWeek.push(day); if ((index + 1) % 7 === 0 || index === days.length - 1) { weeks.push(currentWeek); currentWeek = []; } });
    let html = '<div class="heatmap-grid"><div class="heatmap-weekdays">';
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(day => html += `<span>${day}</span>`);
    html += '</div>';
    weeks.forEach(week => {
        html += '<div class="heatmap-row">';
        const paddedWeek = [...week]; while (paddedWeek.length < 7) paddedWeek.push(null);
        paddedWeek.forEach(day => { if (day) html += `<div class="heatmap-cell level-${Math.min(day.count, 4)}" title="${day.date}: ${day.count} действий"></div>`; else html += '<div class="heatmap-cell empty"></div>'; });
        html += '</div>';
    });
    html += '</div>';
    calendar.innerHTML = html;
}
function animateProgressCircles() {
    if (!document.querySelector('.progress-circle')) return;
    document.querySelectorAll('.progress-circle').forEach(circle => {
        const progress = circle.dataset.progress || 0;
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;
        const svgCircle = circle.querySelector('circle:last-child');
        if (svgCircle) { svgCircle.style.strokeDasharray = circumference; svgCircle.style.strokeDashoffset = offset; }
        circle.querySelector('.progress-text').textContent = progress + '%';
    });
}
function updateCourseCardsProgress() {
    const cards = document.querySelectorAll('.course-card');
    if (cards.length === 0) return;
    cards.forEach(card => {
        const courseId = card.dataset.course;
        if (!courseId) return;
        const progress = (currentUser && currentUser.progress[courseId]) || 0;
        const circle = card.querySelector('.progress-circle');
        if (!circle) return;
        circle.dataset.progress = progress;
        const textEl = circle.querySelector('.progress-text');
        if (textEl) textEl.textContent = progress + '%';
        const svgCircle = circle.querySelector('circle:last-child');
        if (svgCircle) { const radius = 54; const circumference = 2 * Math.PI * radius; const offset = circumference - (progress / 100) * circumference; svgCircle.style.strokeDasharray = circumference; svgCircle.style.strokeDashoffset = offset; }
    });
}
function updateProfileUI() {
    const profileBtn = document.getElementById('profile-btn');
    if (!profileBtn) return;
    if (currentUser) profileBtn.innerHTML = `<i data-lucide="user"></i> ${currentUser.name}`;
    else profileBtn.innerHTML = `<i data-lucide="user"></i>`;
    lucide.createIcons();
}
function openCourseModal(courseId) {
    const modal = document.getElementById('course-modal');
    const body = document.getElementById('course-modal-body');
    const coursesData = {
        algebra: { title: 'Алгебра', description: 'От уравнений до функций. Идеально для старта в математике.', lessons: 24, hours: 18, tasks: 150, skills: ['Уравнения', 'Функции', 'Графики'] },
        geometry: { title: 'Геометрия', description: 'От плоских фигур до тел вращения. Развиваем пространственное мышление.', lessons: 18, hours: 14, tasks: 120, skills: ['Треугольники', 'Окружность', 'Теоремы'] },
        calculus: { title: 'Математический анализ', description: 'Пределы, производные, интегралы. Фундамент высшей математики.', lessons: 30, hours: 25, tasks: 200, skills: ['Производные', 'Интегралы', 'Пределы'] },
        probability: { title: 'Теория вероятностей', description: 'Статистика, комбинаторика и анализ данных на реальных примерах.', lessons: 15, hours: 12, tasks: 80, skills: ['Вероятность', 'Статистика', 'Анализ данных'] },
        ege: { title: 'Подготовка к ЕГЭ', description: 'Полный разбор задач профильного уровня. Гарантия высокого балла.', lessons: 40, hours: 35, tasks: 300, skills: ['Задачи 1-12', 'Задачи 13-19', 'Разбор ошибок'] },
        olympiad: { title: 'Олимпиадная математика', description: 'Нестандартные задачи и логические головоломки для развития мышления.', lessons: 20, hours: 16, tasks: 100, skills: ['Логика', 'Комбинаторика', 'Геометрия'] }
    };
    const course = coursesData[courseId] || coursesData.algebra;
    body.innerHTML = `<h2>${course.title}</h2><p>${course.description}</p><div class="course-stats" style="display: flex; gap: 20px; margin: 20px 0;"><div><i data-lucide="book-open"></i> ${course.lessons} уроков</div><div><i data-lucide="clock"></i> ${course.hours} часов</div><div><i data-lucide="target"></i> ${course.tasks} задач</div></div><div class="course-skills" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">${course.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div><button class="btn btn-primary" onclick="startCourse('${courseId}')">Начать обучение</button>`;
    lucide.createIcons();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeCourseModal(event, fromButton = false) {
    if (event && event.target === event.currentTarget || fromButton) {
        document.getElementById('course-modal').classList.remove('active');
        document.body.style.overflow = '';
    }
}
function startCourse(courseId) {
    if (!currentUser) { openAuthModal(); showToast('Войдите, чтобы начать обучение', 'warning'); return; }
    subscribeToCourse(courseId);
    window.location.href = `courses/${courseId}.html`;
}
function openFormulaBook() { document.getElementById('formula-modal').classList.add('active'); document.body.style.overflow = 'hidden'; showFormulaTab('algebra'); }
function closeFormulaModal() { document.getElementById('formula-modal').classList.remove('active'); document.body.style.overflow = ''; }
function showFormulaTab(tab) {
    const tabs = document.querySelectorAll('.formula-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = Array.from(tabs).find(t => t.textContent.toLowerCase().includes(tab) || t.getAttribute('onclick')?.includes(tab));
    if (activeTab) activeTab.classList.add('active');
    const content = document.getElementById('formula-content');
    const formulas = {
        algebra: `<h3>Квадратное уравнение</h3><p>\\(ax^2 + bx + c = 0\\)</p><p>\\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\)</p><h3>Степени</h3><p>\\(a^m \\cdot a^n = a^{m+n}\\)</p><p>\\((a^m)^n = a^{mn}\\)</p><p>\\(a^{-n} = \\frac{1}{a^n}\\)</p><h3>Логарифмы</h3><p>\\(\\log_a(xy) = \\log_a x + \\log_a y\\)</p><p>\\(\\log_a \\frac{x}{y} = \\log_a x - \\log_a y\\)</p><p>\\(\\log_a x^n = n \\log_a x\\)</p>`,
        geometry: `<h3>Площади</h3><p>Прямоугольник: \\(S = ab\\)</p><p>Треугольник: \\(S = \\frac{1}{2}ah\\)</p><p>Круг: \\(S = \\pi r^2\\)</p><h3>Объёмы</h3><p>Куб: \\(V = a^3\\)</p><p>Шар: \\(V = \\frac{4}{3}\\pi r^3\\)</p><p>Цилиндр: \\(V = \\pi r^2 h\\)</p>`,
        trigonometry: `<h3>Основные тождества</h3><p>\\(\\sin^2 \\alpha + \\cos^2 \\alpha = 1\\)</p><p>\\(\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta\\)</p><p>\\(\\cos(\\alpha \\pm \\beta) = \\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta\\)</p><h3>Формулы двойного угла</h3><p>\\(\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha\\)</p><p>\\(\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha\\)</p>`
    };
    content.innerHTML = formulas[tab];
    if (window.MathJax) MathJax.typesetPromise();
}
function openVideoLessons() { document.getElementById('video-modal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeVideoModal() { document.getElementById('video-modal').classList.remove('active'); document.body.style.overflow = ''; }
function playVideo(videoKey) {
    const rutubeLinks = { rutube1: 'https://rutube.ru/video/92a1334d3952064e46632825ee0bb102', rutube2: 'https://rutube.ru/video/e0be61af21c1c794ad3cd6967e1f3034', rutube3: 'https://rutube.ru/video/0837efbfe7859d99d5491863620fbe02' };
    const url = rutubeLinks[videoKey];
    if (url) window.open(url, '_blank');
    else showToast('Видео временно недоступно', 'warning');
}
function initCoursesFilter() {
    if (!document.querySelector('.filter-tag')) return;
    const filterTags = document.querySelectorAll('.filter-tag');
    const searchInput = document.getElementById('course-search');
    const courseCards = document.querySelectorAll('.course-card');
    filterTags.forEach(tag => tag.addEventListener('click', () => {
        filterTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        filterCourses(tag.dataset.filter, searchInput.value.toLowerCase());
    }));
    searchInput.addEventListener('input', (e) => filterCourses(document.querySelector('.filter-tag.active').dataset.filter, e.target.value.toLowerCase()));
    updateCoursesCounter();
}
function filterCourses(filterValue, searchValue) {
    const courseCards = document.querySelectorAll('.course-card');
    let visibleCount = 0;
    courseCards.forEach(card => {
        const cardLevel = card.dataset.level;
        const cardTitle = card.querySelector('h3').textContent.toLowerCase();
        const cardDesc = card.querySelector('.course-description').textContent.toLowerCase();
        const cardTags = card.dataset.tags ? card.dataset.tags.toLowerCase() : '';
        const matchesFilter = filterValue === 'all' || cardLevel === filterValue;
        const matchesSearch = !searchValue || cardTitle.includes(searchValue) || cardDesc.includes(searchValue) || cardTags.includes(searchValue);
        if (matchesFilter && matchesSearch) { card.style.display = 'flex'; visibleCount++; }
        else card.style.display = 'none';
    });
    document.querySelector('.counter-current').textContent = visibleCount;
}
function updateCoursesCounter() {
    const total = document.querySelectorAll('.course-card').length;
    document.querySelector('.counter-total').textContent = total;
    document.querySelector('.counter-current').textContent = total;
}
function showAllCourses() {
    document.querySelectorAll('.course-card').forEach(card => card.style.display = 'flex');
    document.querySelector('.counter-current').textContent = document.querySelectorAll('.course-card').length;
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tag[data-filter="all"]').classList.add('active');
    document.getElementById('course-search').value = '';
    showToast('Все курсы загружены', 'success');
}
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); }, { threshold: 0.1 });
    document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));
}
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div class="toast-content"><i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i><span>${message}</span></div><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: white; padding: 16px 20px; border-radius: 12px; box-shadow: var(--shadow-xl); display: flex; align-items: center; justify-content: space-between; min-width: 300px; z-index: 10000; animation: slideIn 0.3s ease; border-left: 4px solid ' + (type === 'success' ? 'var(--success)' : type === 'error' ? '#EF4444' : 'var(--primary)') + ';';
    document.body.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => { if (toast.parentElement) { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); } }, 3000);
}
function createBackgroundSymbols() {
    const old = document.querySelector('.bg-symbols'); if (old) old.remove();
    const symbolsContainer = document.createElement('div'); symbolsContainer.className = 'bg-symbols';
    document.body.appendChild(symbolsContainer);
    const mathSymbols = ['π', '∫', '√', '∞', 'x', 'y', '∑', '∆', '≈', '≠', '±', '÷', '×', 'f(x)', 'α', 'β', 'θ'];
    const width = window.innerWidth;
    let symbolsCount = width > 1024 ? 20 : width > 600 ? 12 : 6;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < symbolsCount; i++) {
        const symbol = document.createElement('div'); symbol.className = 'symbol-item'; symbol.textContent = mathSymbols[i % mathSymbols.length];
        const size = 10 + Math.random() * 30;
        const left = Math.random() * 90;
        const top = Math.random() * 90;
        const delay = Math.random() * 10;
        const duration = 15 + Math.random() * 30;
        const opacity = 0.05 + Math.random() * 0.1;
        symbol.style.fontSize = `${size}px`; symbol.style.left = `${left}%`; symbol.style.top = `${top}%`; symbol.style.animationDelay = `${delay}s`; symbol.style.animationDuration = `${duration}s`; symbol.style.opacity = opacity;
        fragment.appendChild(symbol);
    }
    symbolsContainer.appendChild(fragment);
}
function checkCourseTask(button, correctAnswer, courseKey) {
    const taskItem = button.closest('.task-item');
    const input = taskItem.querySelector('.task-answer');
    const feedback = taskItem.querySelector('.task-feedback');
    const userAnswer = input.value.trim().toLowerCase().replace(/\s+/g, '');
    const correct = correctAnswer.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, ''));
    if (correct.includes(userAnswer)) {
        feedback.innerHTML = '<span style="color: var(--success);">✓ Правильно!</span>';
        if (currentUser) {
            currentUser.stats.problemsSolved = (currentUser.stats.problemsSolved || 0) + 1;
            currentUser.stats.correctAnswers = (currentUser.stats.correctAnswers || 0) + 1;
            if (currentUser.progress[courseKey] !== undefined) currentUser.progress[courseKey] = Math.min(100, (currentUser.progress[courseKey] || 0) + 5);
            saveCurrentUser();
            showToast(`Прогресс сохранён! +5% к ${courseKey === 'ege' ? 'подготовке к ЕГЭ' : courseKey}`, 'success');
            if (!currentUser.subscribedCourses.includes(courseKey)) { currentUser.subscribedCourses.push(courseKey); saveCurrentUser(); showToast(`Вы автоматически записаны на курс`, 'info'); }
        } else showToast('Войдите, чтобы прогресс сохранялся', 'warning');
    } else feedback.innerHTML = '<span style="color: var(--error);">✗ Неправильно. Попробуйте ещё.</span>';
}
function formatDate(dateString) { const d = new Date(dateString); return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }); }
function openCourse(courseId) { openCourseModal(courseId); }
function scrollToCourses() { document.getElementById('courses').scrollIntoView({ behavior: 'smooth' }); }
function startLearning() { if (!currentUser) openAuthModal(); else openCourseModal('algebra'); }
function openSettings() { openProfileTab('settings'); }
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initAuthSystem();
    if (document.querySelector('.problem-card')) initPracticeProblems();
    if (document.querySelector('.calculator-grid')) initCalculator();
    if (document.querySelector('.filter-tag')) initCoursesFilter();
    if (document.querySelector('.progress-circle')) animateProgressCircles();
    checkAuthState();
    updateCourseCardsProgress();
    createBackgroundSymbols();
    lucide.createIcons();
    if (window.MathJax) MathJax.typesetPromise();
    document.getElementById('import-file')?.addEventListener('change', importProfile);
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => { menuToggle.classList.toggle('active'); mainNav.classList.toggle('active'); });
        mainNav.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { menuToggle.classList.remove('active'); mainNav.classList.remove('active'); }); });
    }
});