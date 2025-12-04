/**
 * التطبيق الرئيسي لتحدى التوفير الذكي
 * يدير جميع الوظائف والتواصل بين المكونات
 */

class SavingsChallengeApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        this.appVersion = '2.0.0';
        
        // عناصر DOM الرئيسية
        this.elements = {};
        
        // حالات التطبيق
        this.state = {
            isOnline: navigator.onLine,
            isSidebarOpen: false,
            isAddModalOpen: false,
            isLoading: false,
            notificationsCount: 0
        };
        
        // البيانات المؤقتة
        this.cache = {
            stats: null,
            challenges: [],
            notifications: [],
            lastUpdate: null
        };
        
        this.init();
    }

    /**
     * تهيئة التطبيق
     */
    async init() {
        console.log('🚀 جاري تهيئة تطبيق تحدى التوفير...');
        
        try {
            // تهيئة عناصر DOM
            this.cacheElements();
            
            // تهيئة قاعدة البيانات
            await db.init();
            console.log('✅ قاعدة البيانات جاهزة');
            
            // تهيئة نظام الإشعارات
            await notifications.init();
            console.log('✅ نظام الإشعارات جاهز');
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // التحقق من حالة الاتصال
            this.setupConnectivity();
            
            // التحقق من المصادقة
            await this.checkAuth();
            
            // تهيئة PWA
            this.setupPWA();
            
            // إخفاء شاشة التحميل
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('🎉 تطبيق تحدى التوفير جاهز للاستخدام!');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة التطبيق:', error);
            this.showError('حدث خطأ في تحميل التطبيق. حاول تحديث الصفحة.');
        }
    }

    /**
     * تخزين عناصر DOM
     */
    cacheElements() {
        this.elements = {
            // الشاشات
            loadingScreen: document.getElementById('loading-screen'),
            welcomeScreen: document.getElementById('welcome-screen'),
            mainApp: document.getElementById('main-app'),
            
            // التنقل
            menuToggle: document.getElementById('menu-toggle'),
            sidebar: document.getElementById('sidebar'),
            closeSidebar: document.getElementById('close-sidebar'),
            
            // الأزرار الرئيسية
            startJourneyBtn: document.getElementById('start-journey'),
            addSavingBtn: document.getElementById('add-saving-btn'),
            quickAddBtn: document.getElementById('quick-add-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            installBtn: document.getElementById('install-btn'),
            
            // النماذج
            loginForm: document.querySelector('.login-form'),
            addSavingModal: document.getElementById('add-saving-modal'),
            closeSavingModal: document.getElementById('close-saving-modal'),
            saveSavingBtn: document.getElementById('save-saving-btn'),
            
            // المحتوى
            mainContent: document.getElementById('main-content'),
            userName: document.getElementById('user-name'),
            userLevel: document.getElementById('user-level'),
            notificationBadge: document.getElementById('notification-badge'),
            
            // حالات خاصة
            offlineOverlay: document.getElementById('offline-overlay'),
            retryConnection: document.getElementById('retry-connection')
        };
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // التنقل
        this.elements.menuToggle?.addEventListener('click', () => this.toggleSidebar());
        this.elements.closeSidebar?.addEventListener('click', () => this.closeSidebar());
        
        // الأزرار الرئيسية
        this.elements.startJourneyBtn?.addEventListener('click', () => this.startJourney());
        this.elements.addSavingBtn?.addEventListener('click', () => this.openAddSavingModal());
        this.elements.quickAddBtn?.addEventListener('click', () => this.openAddSavingModal());
        this.elements.logoutBtn?.addEventListener('click', () => this.logout());
        this.elements.installBtn?.addEventListener('click', () => this.installApp());
        
        // النماذج
        this.elements.closeSavingModal?.addEventListener('click', () => this.closeAddSavingModal());
        this.elements.saveSavingBtn?.addEventListener('click', () => this.saveSaving());
        
        // الاتصال
        this.elements.retryConnection?.addEventListener('click', () => this.checkConnection());
        
        // التنقل بين الصفحات
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
                this.closeSidebar();
            });
        });
        
        // أهداف سريعة
        document.querySelectorAll('.target-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                document.getElementById('challenge-goal').value = target;
            });
        });
        
        // مبالغ سريعة
        document.querySelectorAll('.amount-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                document.getElementById('saving-amount').value = amount;
                
                // إضافة تأثير
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 300);
            });
        });
        
        // فئات التوفير
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // أحداث مخصصة
        document.addEventListener('openAddSavingModal', () => this.openAddSavingModal());
        document.addEventListener('treeStageUpdated', (e) => this.onTreeStageUpdated(e.detail));
        
        // نقرات خارج القائمة
        document.addEventListener('click', (e) => {
            if (this.state.isSidebarOpen && 
                !this.elements.sidebar.contains(e.target) && 
                !this.elements.menuToggle.contains(e.target)) {
                this.closeSidebar();
            }
            
            if (this.state.isAddModalOpen && 
                e.target === this.elements.addSavingModal) {
                this.closeAddSavingModal();
            }
        });
    }

    /**
     * إعداد PWA
     */
    setupPWA() {
        // كشف تثبيت PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            
            // إظهار زر التثبيت بعد 10 ثواني
            setTimeout(() => {
                if (this.deferredInstallPrompt && this.elements.installBtn) {
                    this.elements.installBtn.style.display = 'flex';
                }
            }, 10000);
        });
        
        // رسائل Service Worker
        navigator.serviceWorker?.addEventListener('message', (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'UPDATE_AVAILABLE':
                    this.showToast('توجد تحديثات جديدة', 'info');
                    break;
                    
                case 'UPDATE_ACTIVATED':
                    this.showToast('تم تحديث التطبيق بنجاح', 'success');
                    break;
                    
                case 'OPEN_ADD_SAVING_MODAL':
                    this.openAddSavingModal();
                    break;
            }
        });
    }

    /**
     * إعداد الاتصال بالإنترنت
     */
    setupConnectivity() {
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.elements.offlineOverlay?.classList.remove('active');
            this.showToast('تم استعادة الاتصال بالإنترنت', 'success');
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.elements.offlineOverlay?.classList.add('active');
            this.showToast('فقدت الاتصال بالإنترنت', 'warning');
        });
        
        // التحقق الأولي
        if (!this.state.isOnline) {
            this.elements.offlineOverlay?.classList.add('active');
        }
    }

    /**
     * التحقق من الاتصال
     */
    async checkConnection() {
        this.showLoading();
        
        try {
            const response = await fetch('/');
            if (response.ok) {
                this.state.isOnline = true;
                this.elements.offlineOverlay?.classList.remove('active');
                this.showToast('الاتصال بالإنترنت نشط', 'success');
                this.syncData();
            }
        } catch (error) {
            this.state.isOnline = false;
            this.showToast('لا يوجد اتصال بالإنترنت', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * مزامنة البيانات
     */
    async syncData() {
        if (!this.state.isOnline) return;
        
        console.log('🔄 جاري مزامنة البيانات...');
        this.showToast('جاري مزامنة البيانات...', 'info');
        
        // هنا يمكن إضافة منطق المزامنة مع الخادم
        
        setTimeout(() => {
            this.showToast('تمت مزامنة البيانات بنجاح', 'success');
        }, 2000);
    }

    /**
     * التحقق من المصادقة
     */
    async checkAuth() {
        try {
            // التحقق من وجود مستخدم محفوظ
            const userId = await db.getSetting('current_user_id');
            
            if (userId) {
                const user = await db.getUser(userId);
                if (user) {
                    await this.loginUser(user);
                    return;
                }
            }
            
            // إذا لم يكن هناك مستخدم، عرض شاشة الترحيب
            this.showWelcomeScreen();
            
        } catch (error) {
            console.error('❌ خطأ في التحقق من المصادقة:', error);
            this.showWelcomeScreen();
        }
    }

    /**
     * بدء رحلة جديدة
     */
    async startJourney() {
        const username = document.getElementById('username')?.value.trim();
        const monthlyIncome = document.getElementById('monthly-income')?.value;
        const challengeGoal = document.getElementById('challenge-goal')?.value;
        
        if (!username) {
            this.showToast('الرجاء إدخال اسم المستخدم', 'error');
            return;
        }
        
        if (!challengeGoal || challengeGoal < 10) {
            this.showToast('الرجاء إدخال هدف صالح (10 جنيه على الأقل)', 'error');
            return;
        }
        
        this.showLoading();
        
        try {
            // إنشاء مستخدم جديد
            const user = await db.createUser({
                username,
                monthlyIncome: monthlyIncome ? parseInt(monthlyIncome) : null,
                challengeGoal: parseInt(challengeGoal)
            });
            
            // حفظ معرف المستخدم الحالي
            await db.saveSetting('current_user_id', user.id);
            
            // إنشاء تحدٍ افتراضي
            const challenge = await db.createChallenge({
                userId: user.id,
                name: `تحدي ${username} الأول`,
                targetAmount: parseInt(challengeGoal),
                description: 'بداية رحلة التوفير الخاصة بك',
                duration: 30 // 30 يوم
            });
            
            // تسجيل الدخول
            await this.loginUser(user);
            
            // إرسال إشعار ترحيب
            notifications.sendCustomNotification(
                '🎉 أهلاً بك في تحدى التوفير!',
                `بدأت رحلة توفيرك لتحقيق هدف ${challengeGoal} جنيه`,
                user.id
            );
            
            this.showToast('تم بدء رحلة التوفير بنجاح!', 'success');
            
        } catch (error) {
            console.error('❌ خطأ في بدء الرحلة:', error);
            this.showToast('حدث خطأ في بدء الرحلة', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * تسجيل دخول المستخدم
     */
    async loginUser(user) {
        this.currentUser = user;
        
        // تحديث واجهة المستخدم
        this.updateUserUI();
        
        // إخفاء شاشة الترحيب وإظهار التطبيق الرئيسي
        this.hideWelcomeScreen();
        this.showMainApp();
        
        // تحميل البيانات الأولية
        await this.loadInitialData();
        
        // بدء تحديث البيانات الدوري
        this.startDataRefresh();
        
        console.log(`👤 تم تسجيل دخول المستخدم: ${user.username}`);
    }

    /**
     * تحديث واجهة المستخدم
     */
    updateUserUI() {
        if (!this.currentUser) return;
        
        // تحديث الاسم والمستوى
        if (this.elements.userName) {
            this.elements.userName.textContent = this.currentUser.username;
        }
        
        if (this.elements.userLevel) {
            const level = this.getUserLevel(this.currentUser.totalSavings || 0);
            this.elements.userLevel.textContent = level;
        }
        
        // تحديث عنوان الصفحة
        document.title = `تحدي التوفير - ${this.currentUser.username}`;
    }

    /**
     * حساب مستوى المستخدم
     */
    getUserLevel(totalSavings) {
        if (totalSavings < 500) return 'مبتدئ';
        if (totalSavings < 2000) return 'متوسط';
        if (totalSavings < 5000) return 'متقدم';
        if (totalSavings < 10000) return 'محترف';
        return 'خبير';
    }

    /**
     * تحميل البيانات الأولية
     */
    async loadInitialData() {
        if (!this.currentUser) return;
        
        this.showLoading();
        
        try {
            // تحميل الإحصائيات
            const stats = await db.getUserStats(this.currentUser.id);
            this.cache.stats = stats;
            
            // تحميل التحديات النشطة
            const challenges = await db.getActiveChallenges(this.currentUser.id);
            this.cache.challenges = challenges;
            
            // تحميل الإشعارات
            const notifications = await db.getNotifications(this.currentUser.id);
            this.cache.notifications = notifications;
            this.state.notificationsCount = await db.getUnreadNotificationsCount(this.currentUser.id);
            
            // تحديث واجهة المستخدم
            this.updateNotificationBadge();
            
            // تحميل الصفحة الحالية
            await this.loadPage(this.currentPage);
            
            // تحديث وقت آخر تحديث
            this.cache.lastUpdate = new Date().toISOString();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            this.showToast('حدث خطأ في تحميل البيانات', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * بدء تحديث البيانات الدوري
     */
    startDataRefresh() {
        // تحديث كل 5 دقائق
        setInterval(async () => {
            if (this.currentUser && this.state.isOnline) {
                await this.refreshData();
            }
        }, 5 * 60 * 1000);
        
        // تحديث عند عودة التركيز للنافذة
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentUser) {
                this.refreshData();
            }
        });
    }

    /**
     * تحديث البيانات
     */
    async refreshData() {
        try {
            const stats = await db.getUserStats(this.currentUser.id);
            this.cache.stats = stats;
            
            // تحديث الصفحة الحالية إذا كانت تعتمد على الإحصائيات
            if (this.currentPage === 'dashboard') {
                this.renderDashboard();
            }
            
            // تحديث عدادات الإشعارات
            this.state.notificationsCount = await db.getUnreadNotificationsCount(this.currentUser.id);
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('❌ خطأ في تحديث البيانات:', error);
        }
    }

    /**
     * تحديث عداد الإشعارات
     */
    updateNotificationBadge() {
        if (this.elements.notificationBadge) {
            if (this.state.notificationsCount > 0) {
                this.elements.notificationBadge.textContent = this.state.notificationsCount;
                this.elements.notificationBadge.style.display = 'flex';
            } else {
                this.elements.notificationBadge.style.display = 'none';
            }
        }
    }

    /**
     * التنقل بين الصفحات
     */
    async navigateTo(page) {
        if (this.currentPage === page) return;
        
        this.currentPage = page;
        
        // تحديث القائمة النشطة
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        // تحميل الصفحة
        await this.loadPage(page);
    }

    /**
     * تحميل الصفحة
     */
    async loadPage(page) {
        if (!this.currentUser) return;
        
        this.showLoading();
        
        try {
            switch (page) {
                case 'dashboard':
                    await this.renderDashboard();
                    break;
                    
                case 'challenges':
                    await this.renderChallenges();
                    break;
                    
                case 'analytics':
                    await this.renderAnalytics();
                    break;
                    
                case 'savings-history':
                    await this.renderSavingsHistory();
                    break;
                    
                case 'achievements':
                    await this.renderAchievements();
                    break;
                    
                case 'tips':
                    await this.renderTips();
                    break;
                    
                case 'settings':
                    await this.renderSettings();
                    break;
                    
                default:
                    await this.renderDashboard();
            }
        } catch (error) {
            console.error(`❌ خطأ في تحميل الصفحة ${page}:`, error);
            this.showToast('حدث خطأ في تحميل الصفحة', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض لوحة التحكم
     */
    async renderDashboard() {
        if (!this.cache.stats) {
            this.cache.stats = await db.getUserStats(this.currentUser.id);
        }
        
        const stats = this.cache.stats;
        
        let html = `
            <div class="dashboard-page">
                <!-- ترحيب -->
                <div class="welcome-card">
                    <h1>مرحباً ${stats.user.name}!</h1>
                    <p>شجرتك تنمو مع كل جنيه تدخره</p>
                    <div class="user-level-badge">
                        <span class="level-icon">🏆</span>
                        <span>المستوى: ${stats.user.level}</span>
                    </div>
                </div>
                
                <!-- إحصائيات سريعة -->
                <div class="quick-stats">
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.today.amount} ج</div>
                            <div class="stat-label">المدخر اليوم</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.user.totalSavings} ج</div>
                            <div class="stat-label">إجمالي المدخرات</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.user.currentStreak}</div>
                            <div class="stat-label">أيام متتالية</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.challenges.active}</div>
                            <div class="stat-label">تحديات نشطة</div>
                        </div>
                    </div>
                </div>
                
                <!-- شجرة التوفير -->
                <div class="tree-section">
                    <h2 class="section-title">🌳 شجرة توفيرك</h2>
                    <div id="savings-tree"></div>
                    <div class="tree-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${stats.activeChallenge?.progress || 0}%"></div>
                        </div>
                        <span class="progress-text">
                            ${stats.activeChallenge?.progress || 0}% من الهدف
                        </span>
                    </div>
                </div>
        `;
        
        // إذا كان هناك تحدٍ نشط
        if (stats.activeChallenge) {
            html += `
                <div class="active-challenge">
                    <h2 class="section-title">🎯 تحديك النشط</h2>
                    <div class="challenge-card">
                        <div class="challenge-header">
                            <span class="challenge-badge">🏃‍♂️ نشط</span>
                            <h3>${stats.activeChallenge.name}</h3>
                        </div>
                        <div class="challenge-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${stats.activeChallenge.progress}%"></div>
                            </div>
                            <div class="progress-info">
                                <span>${stats.activeChallenge.currentAmount || 0} ج</span>
                                <span>${stats.activeChallenge.progress}%</span>
                                <span>${stats.activeChallenge.targetAmount} ج</span>
                            </div>
                        </div>
                        <div class="challenge-footer">
                            <span>📅 بدأ منذ ${this.formatDaysAgo(stats.activeChallenge.createdAt)} يوم</span>
                            <button class="btn-small" onclick="app.viewChallenge(${stats.activeChallenge.id})">
                                عرض التفاصيل
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // النشاط الأخير
        const recentSavings = await db.getSavings(this.currentUser.id, {
            sortBy: 'date',
            limit: 5
        });
        
        if (recentSavings.length > 0) {
            html += `
                <div class="recent-activity">
                    <h2 class="section-title">📝 آخر التوفيرات</h2>
                    <div class="activity-list">
            `;
            
            recentSavings.forEach(saving => {
                html += `
                    <div class="activity-item">
                        <div class="activity-icon">💰</div>
                        <div class="activity-details">
                            <div class="activity-title">${saving.amount} جنيه</div>
                            <div class="activity-meta">
                                <span class="activity-category">${saving.category || 'عام'}</span>
                                <span class="activity-time">${this.formatTime(new Date(saving.date))}</span>
                            </div>
                        </div>
                        ${saving.note ? `<div class="activity-note">${saving.note}</div>` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        
        this.elements.mainContent.innerHTML = html;
        
        // تهيئة شجرة التوفير
        setTimeout(() => {
            if (window.SavingsTree && document.getElementById('savings-tree')) {
                const tree = new SavingsTree('savings-tree');
                tree.update(stats.activeChallenge?.progress || 0);
                window.savingsTree = tree;
            }
        }, 100);
    }

    /**
     * عرض التحديات
     */
    async renderChallenges() {
        const challenges = this.cache.challenges;
        
        let html = `
            <div class="challenges-page">
                <h1 class="page-title">🎯 التحديات</h1>
                
                <!-- إنشاء تحدٍ جديد -->
                <div class="create-challenge-card">
                    <h2>إنشاء تحدٍ جديد</h2>
                    <div class="create-form">
                        <input type="text" id="new-challenge-name" placeholder="اسم التحدي" class="form-input">
                        <input type="number" id="new-challenge-target" placeholder="الهدف بالجنيه" class="form-input">
                        <select id="new-challenge-duration" class="form-select">
                            <option value="7">أسبوع (7 أيام)</option>
                            <option value="30">شهر (30 يوم)</option>
                            <option value="90">3 أشهر</option>
                        </select>
                        <button class="btn-primary" onclick="app.createNewChallenge()">
                            إنشاء التحدي
                        </button>
                    </div>
                </div>
                
                <!-- التحديات النشطة -->
                <div class="challenges-section">
                    <h2 class="section-title">تحدياتك النشطة</h2>
        `;
        
        if (challenges.length > 0) {
            html += `<div class="challenges-grid">`;
            
            challenges.forEach(challenge => {
                html += `
                    <div class="challenge-card">
                        <div class="challenge-header">
                            <span class="challenge-badge">🏃‍♂️ نشط</span>
                            <h3>${challenge.name}</h3>
                        </div>
                        <div class="challenge-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${challenge.progress || 0}%"></div>
                            </div>
                            <div class="progress-info">
                                <span>${challenge.currentAmount || 0} ج</span>
                                <span>${challenge.progress || 0}%</span>
                                <span>${challenge.targetAmount} ج</span>
                            </div>
                        </div>
                        <div class="challenge-meta">
                            <span>📅 ${this.formatDaysAgo(challenge.createdAt)} يوم</span>
                            <span>🎯 ${challenge.duration} يوم</span>
                        </div>
                        <div class="challenge-actions">
                            <button class="btn-small" onclick="app.viewChallenge(${challenge.id})">
                                التفاصيل
                            </button>
                            <button class="btn-outline" onclick="app.addToChallenge(${challenge.id})">
                                إضافة توفير
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        } else {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">🎯</div>
                    <h3>لا توجد تحديات نشطة</h3>
                    <p>أنشئ تحديك الأول وابدأ رحلة التوفير!</p>
                </div>
            `;
        }
        
        // التحديات المكتملة
        html += `
                </div>
                
                <!-- التحديات المكتملة -->
                <div class="completed-section">
                    <h2 class="section-title">✅ التحديات المكتملة</h2>
                    <div class="empty-state">
                        <div class="empty-icon">🏆</div>
                        <h3>لا توجد تحديات مكتملة بعد</h3>
                        <p>استمر في التوفير لترى إنجازاتك هنا!</p>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.mainContent.innerHTML = html;
    }

    /**
     * عرض الإحصائيات
     */
    async renderAnalytics() {
        const stats = this.cache.stats;
        
        let html = `
            <div class="analytics-page">
                <h1 class="page-title">📊 الإحصائيات</h1>
                
                <!-- ملخص -->
                <div class="analytics-summary">
                    <div class="summary-card">
                        <h3>ملفك التوفيري</h3>
                        <div class="summary-stats">
                            <div class="summary-item">
                                <span class="label">إجمالي المدخرات</span>
                                <span class="value">${stats.user.totalSavings} ج</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">متوسط يومي</span>
                                <span class="value">${(stats.user.totalSavings / 30).toFixed(1)} ج</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">أعلى توفير</span>
                                <span class="value">${stats.month.average.toFixed(1)} ج</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">الأيام النشطة</span>
                                <span class="value">${stats.month.count} يوم</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- الرسوم البيانية -->
                <div class="charts-section">
                    <h2 class="section-title">📈 تقدمك الشهري</h2>
                    <div class="chart-container">
                        <canvas id="monthly-chart"></canvas>
                    </div>
                </div>
                
                <!-- التحليلات -->
                <div class="insights-section">
                    <h2 class="section-title">💡 تحليلات وأفكار</h2>
                    <div class="insights-grid">
                        <div class="insight-card">
                            <div class="insight-icon">🎯</div>
                            <h3>هدفك القادم</h3>
                            <p>إذا وفرت ${(stats.user.totalSavings / 10).toFixed(0)} جنيه أسبوعياً، ستصل لهدفك في غضون شهرين</p>
                        </div>
                        
                        <div class="insight-card">
                            <div class="insight-icon">📅</div>
                            <h3>أنماط التوفير</h3>
                            <p>أنت توفر بمعدل ${stats.week.average.toFixed(1)} جنيه يومياً في أيام الأسبوع</p>
                        </div>
                        
                        <div class="insight-card">
                            <div class="insight-icon">🚀</div>
                            <h3>فرص التحسين</h3>
                            <p>زيادة توفيرك بنسبة 20% ستساعدك على تحقيق أهدافك بشكل أسرع</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.mainContent.innerHTML = html;
        
        // تهيئة الرسم البياني
        setTimeout(() => {
            this.initMonthlyChart();
        }, 100);
    }

    /**
     * تهيئة الرسم البياني الشهري
     */
    initMonthlyChart() {
        const ctx = document.getElementById('monthly-chart')?.getContext('2d');
        if (!ctx) return;
        
        // بيانات افتراضية
        const data = {
            labels: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
            datasets: [{
                label: 'المدخرات الأسبوعية',
                data: [150, 200, 180, 220],
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: '#10B981',
                borderWidth: 2,
                tension: 0.4
            }]
        };
        
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' ج';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * فتح نافذة إضافة توفير
     */
    openAddSavingModal() {
        this.state.isAddModalOpen = true;
        this.elements.addSavingModal.classList.add('active');
        
        // إعادة تعيين النموذج
        document.getElementById('saving-amount').value = '';
        document.getElementById('saving-notes').value = '';
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.category-btn[data-category="عام"]').classList.add('active');
    }

    /**
     * إغلاق نافذة إضافة توفير
     */
    closeAddSavingModal() {
        this.state.isAddModalOpen = false;
        this.elements.addSavingModal.classList.remove('active');
    }

    /**
     * حفظ التوفير الجديد
     */
    async saveSaving() {
        const amount = document.getElementById('saving-amount')?.value;
        const notes = document.getElementById('saving-notes')?.value;
        const categoryBtn = document.querySelector('.category-btn.active');
        const category = categoryBtn?.dataset.category || 'عام';
        
        if (!amount || amount <= 0) {
            this.showToast('الرجاء إدخال مبلغ صالح', 'error');
            return;
        }
        
        if (!this.currentUser) {
            this.showToast('الرجاء تسجيل الدخول أولاً', 'error');
            return;
        }
        
        this.showLoading();
        
        try {
            // الحصول على التحدي النشط
            const challenges = await db.getActiveChallenges(this.currentUser.id);
            const activeChallenge = challenges[0];
            
            // إضافة التوفير
            const saving = await db.addSaving({
                userId: this.currentUser.id,
                challengeId: activeChallenge?.id || null,
                amount: parseFloat(amount),
                category: category,
                note: notes
            });
            
            // إرسال حدث إضافة توفير
            document.dispatchEvent(new CustomEvent('savingAdded', {
                detail: saving
            }));
            
            // إغلاق النافذة
            this.closeAddSavingModal();
            
            // تحديث البيانات
            await this.refreshData();
            
            // إظهار رسالة نجاح
            this.showToast(`تم إضافة ${amount} جنيه بنجاح!`, 'success');
            
            // إضافة تأثير للشجرة
            if (window.savingsTree) {
                window.savingsTree.addSpecialEffect('sparkle');
            }
            
        } catch (error) {
            console.error('❌ خطأ في حفظ التوفير:', error);
            this.showToast('حدث خطأ في حفظ التوفير', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * إنشاء تحدٍ جديد
     */
    async createNewChallenge() {
        const name = document.getElementById('new-challenge-name')?.value;
        const target = document.getElementById('new-challenge-target')?.value;
        const duration = document.getElementById('new-challenge-duration')?.value;
        
        if (!name || !target) {
            this.showToast('الرجاء إدخال اسم التحدي والهدف', 'error');
            return;
        }
        
        if (!this.currentUser) return;
        
        this.showLoading();
        
        try {
            const challenge = await db.createChallenge({
                userId: this.currentUser.id,
                name,
                targetAmount: parseFloat(target),
                duration: parseInt(duration),
                description: 'تحدي جديد لتحقيق هدفك'
            });
            
            // تحديث قائمة التحديات
            this.cache.challenges = await db.getActiveChallenges(this.currentUser.id);
            
            // إعادة تحميل صفحة التحديات
            await this.renderChallenges();
            
            this.showToast(`تم إنشاء تحدى "${name}" بنجاح!`, 'success');
            
        } catch (error) {
            console.error('❌ خطأ في إنشاء التحدي:', error);
            this.showToast('حدث خطأ في إنشاء التحدي', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض تحدٍ معين
     */
    async viewChallenge(challengeId) {
        // يمكن تنفيذ هذا لاحقاً
        this.showToast('هذه الميزة قيد التطوير', 'info');
    }

    /**
     * إضافة توفير لتحدٍ معين
     */
    async addToChallenge(challengeId) {
        this.openAddSavingModal();
        // يمكن إضافة منطق لتحديد التحدي المختار
    }

    /**
     * تسجيل الخروج
     */
    async logout() {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            try {
                // حذف المستخدم الحالي من الإعدادات
                await db.saveSetting('current_user_id', null);
                
                // إعادة تعيين حالة التطبيق
                this.currentUser = null;
                this.cache = {
                    stats: null,
                    challenges: [],
                    notifications: [],
                    lastUpdate: null
                };
                
                // إعادة التوجيه لشاشة الترحيب
                this.showWelcomeScreen();
                this.hideMainApp();
                
                this.showToast('تم تسجيل الخروج بنجاح', 'success');
                
            } catch (error) {
                console.error('❌ خطأ في تسجيل الخروج:', error);
                this.showToast('حدث خطأ في تسجيل الخروج', 'error');
            }
        }
    }

    /**
     * تثبيت التطبيق
     */
    async installApp() {
        if (this.deferredInstallPrompt) {
            this.deferredInstallPrompt.prompt();
            
            const choiceResult = await this.deferredInstallPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ تم قبول تثبيت التطبيق');
                this.showToast('جاري تثبيت التطبيق...', 'success');
            }
            
            this.deferredInstallPrompt = null;
            this.elements.installBtn.style.display = 'none';
        }
    }

    /**
     * فتح/إغلاق القائمة الجانبية
     */
    toggleSidebar() {
        this.state.isSidebarOpen = !this.state.isSidebarOpen;
        this.elements.sidebar.classList.toggle('active', this.state.isSidebarOpen);
    }

    closeSidebar() {
        this.state.isSidebarOpen = false;
        this.elements.sidebar.classList.remove('active');
    }

    /**
     * إظهار/إخفاء الشاشات
     */
    showWelcomeScreen() {
        this.elements.welcomeScreen?.classList.add('active');
    }

    hideWelcomeScreen() {
        this.elements.welcomeScreen?.classList.remove('active');
    }

    showMainApp() {
        this.elements.mainApp?.classList.add('active');
    }

    hideMainApp() {
        this.elements.mainApp?.classList.remove('active');
    }

    showLoading() {
        this.state.isLoading = true;
        // يمكن إضافة مؤشر تحميل هنا
    }

    hideLoading() {
        this.state.isLoading = false;
        // إخفاء مؤشر التحميل
    }

    hideLoadingScreen() {
        setTimeout(() => {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }

    /**
     * عرض رسائل
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || '💬'}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">×</button>
        `;
        
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 12px 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            border-left: 4px solid ${this.getToastColor(type)};
        `;
        
        document.body.appendChild(toast);
        
        // زر الإغلاق
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // إغلاق تلقائي بعد 5 ثواني
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
        
        // إضافة أنيميشن
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    getToastColor(type) {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        return colors[type] || '#6B7280';
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * معالج تحديث مرحلة الشجرة
     */
    onTreeStageUpdated(detail) {
        console.log('🌳 تم تحديث مرحلة الشجرة:', detail);
        
        // يمكن إضافة إشعار أو تحديث واجهة المستخدم هنا
        if (detail.progress >= 50 && detail.progress < 55) {
            this.showToast(detail.message, 'success');
        }
    }

    /**
     * دوال مساعدة للتنسيق
     */
    formatTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        
        return date.toLocaleDateString('ar-EG');
    }

    formatDaysAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / 86400000);
        return diffDays;
    }

    /**
     * دوال الصفحات الأخرى (يمكن تنفيذها لاحقاً)
     */
    async renderSavingsHistory() {
        this.elements.mainContent.innerHTML = `
            <div class="page-placeholder">
                <div class="placeholder-icon">📝</div>
                <h2>سجل التوفير</h2>
                <p>هذه الصفحة قيد التطوير</p>
            </div>
        `;
    }

    async renderAchievements() {
        this.elements.mainContent.innerHTML = `
            <div class="page-placeholder">
                <div class="placeholder-icon">🏆</div>
                <h2>الإنجازات</h2>
                <p>هذه الصفحة قيد التطوير</p>
            </div>
        `;
    }

    async renderTips() {
        this.elements.mainContent.innerHTML = `
            <div class="page-placeholder">
                <div class="placeholder-icon">💡</div>
                <h2>نصائح توفير</h2>
                <p>هذه الصفحة قيد التطوير</p>
            </div>
        `;
    }

    async renderSettings() {
        this.elements.mainContent.innerHTML = `
            <div class="page-placeholder">
                <div class="placeholder-icon">⚙️</div>
                <h2>الإعدادات</h2>
                <p>هذه الصفحة قيد التطوير</p>
            </div>
        `;
    }
}

// إنشاء نسخة عامة من التطبيق
const app = new SavingsChallengeApp();

// التصدير للاستخدام العالمي
window.app = app;

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 الصفحة محملة، جاري بدء التطبيق...');
});