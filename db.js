/**
 * قاعدة البيانات المحلية لتطبيق تحدى التوفير
 * تستخدم IndexedDB لتخزين البيانات بدون اتصال
 */

class SavingsDatabase {
    constructor() {
        this.dbName = 'savings_challenge_db';
        this.version = 3;
        this.db = null;
        this.initialized = false;
    }

    /**
     * تهيئة قاعدة البيانات
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('❌ فشل فتح قاعدة البيانات:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                console.log('✅ قاعدة البيانات جاهزة للاستخدام');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 ترقية قاعدة البيانات...');
                const db = event.target.result;

                // جدول المستخدمين
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                    userStore.createIndex('email', 'email', { unique: false });
                    console.log('📊 تم إنشاء جدول المستخدمين');
                }

                // جدول التحديات
                if (!db.objectStoreNames.contains('challenges')) {
                    const challengeStore = db.createObjectStore('challenges', { keyPath: 'id', autoIncrement: true });
                    challengeStore.createIndex('userId', 'userId', { unique: false });
                    challengeStore.createIndex('isActive', 'isActive', { unique: false });
                    challengeStore.createIndex('startDate', 'startDate', { unique: false });
                    console.log('🎯 تم إنشاء جدول التحديات');
                }

                // جدول المدخرات اليومية
                if (!db.objectStoreNames.contains('savings')) {
                    const savingsStore = db.createObjectStore('savings', { keyPath: 'id', autoIncrement: true });
                    savingsStore.createIndex('userId', 'userId', { unique: false });
                    savingsStore.createIndex('challengeId', 'challengeId', { unique: false });
                    savingsStore.createIndex('date', 'date', { unique: false });
                    savingsStore.createIndex('category', 'category', { unique: false });
                    console.log('💰 تم إنشاء جدول المدخرات');
                }

                // جدول الإشعارات
                if (!db.objectStoreNames.contains('notifications')) {
                    const notificationStore = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
                    notificationStore.createIndex('userId', 'userId', { unique: false });
                    notificationStore.createIndex('isRead', 'isRead', { unique: false });
                    notificationStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('🔔 تم إنشاء جدول الإشعارات');
                }

                // جدول الإنجازات
                if (!db.objectStoreNames.contains('achievements')) {
                    const achievementStore = db.createObjectStore('achievements', { keyPath: 'id', autoIncrement: true });
                    achievementStore.createIndex('userId', 'userId', { unique: false });
                    achievementStore.createIndex('type', 'type', { unique: false });
                    achievementStore.createIndex('unlockedAt', 'unlockedAt', { unique: false });
                    console.log('🏆 تم إنشاء جدول الإنجازات');
                }

                // جدول الإعدادات
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('⚙️ تم إنشاء جدول الإعدادات');
                }
            };
        });
    }

    /**
     * التحقق من تهيئة قاعدة البيانات
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
        return this.db;
    }

    /**
     * عمليات المستخدمين
     */
    async createUser(userData) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const user = {
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                level: 1,
                totalSavings: 0,
                currentStreak: 0,
                longestStreak: 0
            };
            
            const request = store.add(user);
            
            request.onsuccess = (event) => {
                const userId = event.target.result;
                console.log('👤 تم إنشاء مستخدم جديد:', userId);
                resolve({ ...user, id: userId });
            };
            
            request.onerror = (event) => {
                console.error('❌ خطأ في إنشاء المستخدم:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getUser(userId) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(userId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async updateUser(userId, updates) {
        const db = await this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            // الحصول على المستخدم الحالي
            const getRequest = store.get(userId);
            
            getRequest.onsuccess = () => {
                const user = getRequest.result;
                if (!user) {
                    reject(new Error('المستخدم غير موجود'));
                    return;
                }
                
                // تحديث البيانات
                const updatedUser = {
                    ...user,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                
                const updateRequest = store.put(updatedUser);
                
                updateRequest.onsuccess = () => {
                    console.log('✅ تم تحديث المستخدم:', userId);
                    resolve(updatedUser);
                };
                
                updateRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * عمليات التحديات
     */
    async createChallenge(challengeData) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['challenges'], 'readwrite');
            const store = transaction.objectStore('challenges');
            
            const challenge = {
                ...challengeData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                currentAmount: 0,
                progress: 0,
                daysCompleted: 0
            };
            
            const request = store.add(challenge);
            
            request.onsuccess = (event) => {
                const challengeId = event.target.result;
                console.log('🎯 تم إنشاء تحدٍ جديد:', challengeId);
                resolve({ ...challenge, id: challengeId });
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getActiveChallenges(userId) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['challenges'], 'readonly');
            const store = transaction.objectStore('challenges');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                const challenges = request.result.filter(c => c.isActive);
                resolve(challenges);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async updateChallenge(challengeId, updates) {
        const db = await this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            const transaction = db.transaction(['challenges'], 'readwrite');
            const store = transaction.objectStore('challenges');
            
            const getRequest = store.get(challengeId);
            
            getRequest.onsuccess = () => {
                const challenge = getRequest.result;
                if (!challenge) {
                    reject(new Error('التحدي غير موجود'));
                    return;
                }
                
                const updatedChallenge = {
                    ...challenge,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                
                // حساب التقدم
                if (updates.currentAmount !== undefined && challenge.targetAmount) {
                    updatedChallenge.progress = Math.min(100, 
                        Math.round((updates.currentAmount / challenge.targetAmount) * 100)
                    );
                }
                
                const updateRequest = store.put(updatedChallenge);
                
                updateRequest.onsuccess = () => {
                    console.log('✅ تم تحديث التحدي:', challengeId);
                    resolve(updatedChallenge);
                };
                
                updateRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * عمليات المدخرات
     */
    async addSaving(savingData) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['savings'], 'readwrite');
            const store = transaction.objectStore('savings');
            
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            
            const saving = {
                ...savingData,
                date: dateString,
                createdAt: new Date().toISOString(),
                timestamp: today.getTime()
            };
            
            const request = store.add(saving);
            
            request.onsuccess = async (event) => {
                const savingId = event.target.result;
                console.log('💰 تم إضافة توفير جديد:', savingId);
                
                // تحديث التحدي الحالي
                if (savingData.challengeId) {
                    try {
                        const challenge = await this.getChallenge(savingData.challengeId);
                        if (challenge) {
                            const newAmount = (challenge.currentAmount || 0) + savingData.amount;
                            await this.updateChallenge(savingData.challengeId, {
                                currentAmount: newAmount
                            });
                        }
                    } catch (error) {
                        console.error('⚠️ خطأ في تحديث التحدي:', error);
                    }
                }
                
                // تحديث إجمالي مدخرات المستخدم
                try {
                    const user = await this.getUser(savingData.userId);
                    if (user) {
                        const newTotalSavings = (user.totalSavings || 0) + savingData.amount;
                        await this.updateUser(savingData.userId, {
                            totalSavings: newTotalSavings
                        });
                    }
                } catch (error) {
                    console.error('⚠️ خطأ في تحديث المستخدم:', error);
                }
                
                resolve({ ...saving, id: savingId });
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getSavings(userId, options = {}) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['savings'], 'readonly');
            const store = transaction.objectStore('savings');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                let savings = request.result;
                
                // تطبيق الفلاتر
                if (options.challengeId) {
                    savings = savings.filter(s => s.challengeId == options.challengeId);
                }
                
                if (options.startDate && options.endDate) {
                    savings = savings.filter(s => {
                        const date = new Date(s.date);
                        return date >= new Date(options.startDate) && 
                               date <= new Date(options.endDate);
                    });
                }
                
                if (options.category) {
                    savings = savings.filter(s => s.category === options.category);
                }
                
                // الترتيب
                if (options.sortBy === 'date') {
                    savings.sort((a, b) => new Date(b.date) - new Date(a.date));
                } else if (options.sortBy === 'amount') {
                    savings.sort((a, b) => b.amount - a.amount);
                }
                
                resolve(savings);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getTodaySavings(userId) {
        const today = new Date().toISOString().split('T')[0];
        const savings = await this.getSavings(userId);
        return savings.filter(s => s.date === today);
    }

    async getTotalSavings(userId) {
        const savings = await this.getSavings(userId);
        return savings.reduce((total, saving) => total + saving.amount, 0);
    }

    async getWeeklySavings(userId) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const savings = await this.getSavings(userId);
        return savings.filter(s => {
            const savingDate = new Date(s.date);
            return savingDate >= startOfWeek;
        });
    }

    async getMonthlySavings(userId) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const savings = await this.getSavings(userId);
        return savings.filter(s => {
            const savingDate = new Date(s.date);
            return savingDate >= startOfMonth;
        });
    }

    /**
     * عمليات الإشعارات
     */
    async addNotification(notificationData) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['notifications'], 'readwrite');
            const store = transaction.objectStore('notifications');
            
            const notification = {
                ...notificationData,
                isRead: false,
                createdAt: new Date().toISOString(),
                readAt: null
            };
            
            const request = store.add(notification);
            
            request.onsuccess = (event) => {
                const notificationId = event.target.result;
                console.log('🔔 تم إضافة إشعار جديد:', notificationId);
                resolve({ ...notification, id: notificationId });
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getNotifications(userId, options = {}) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['notifications'], 'readonly');
            const store = transaction.objectStore('notifications');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                let notifications = request.result;
                
                if (options.unreadOnly) {
                    notifications = notifications.filter(n => !n.isRead);
                }
                
                // الترتيب من الأحدث إلى الأقدم
                notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                resolve(notifications);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async markNotificationAsRead(notificationId) {
        const db = await this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            const transaction = db.transaction(['notifications'], 'readwrite');
            const store = transaction.objectStore('notifications');
            
            const getRequest = store.get(notificationId);
            
            getRequest.onsuccess = () => {
                const notification = getRequest.result;
                if (!notification) {
                    reject(new Error('الإشعار غير موجود'));
                    return;
                }
                
                notification.isRead = true;
                notification.readAt = new Date().toISOString();
                
                const updateRequest = store.put(notification);
                
                updateRequest.onsuccess = () => {
                    console.log('✅ تم تحديد الإشعار كمقروء:', notificationId);
                    resolve(notification);
                };
                
                updateRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async markAllNotificationsAsRead(userId) {
        const notifications = await this.getNotifications(userId, { unreadOnly: true });
        
        for (const notification of notifications) {
            await this.markNotificationAsRead(notification.id);
        }
        
        return notifications.length;
    }

    async getUnreadNotificationsCount(userId) {
        const notifications = await this.getNotifications(userId, { unreadOnly: true });
        return notifications.length;
    }

    /**
     * عمليات الإنجازات
     */
    async unlockAchievement(achievementData) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['achievements'], 'readwrite');
            const store = transaction.objectStore('achievements');
            
            const achievement = {
                ...achievementData,
                unlockedAt: new Date().toISOString()
            };
            
            const request = store.add(achievement);
            
            request.onsuccess = (event) => {
                const achievementId = event.target.result;
                console.log('🏆 تم فتح إنجاز جديد:', achievementId);
                resolve({ ...achievement, id: achievementId });
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getUserAchievements(userId) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['achievements'], 'readonly');
            const store = transaction.objectStore('achievements');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                const achievements = request.result;
                achievements.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
                resolve(achievements);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * عمليات الإعدادات
     */
    async saveSetting(key, value) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            const setting = {
                key,
                value: JSON.stringify(value),
                updatedAt: new Date().toISOString()
            };
            
            const request = store.put(setting);
            
            request.onsuccess = () => {
                console.log('⚙️ تم حفظ الإعداد:', key);
                resolve(setting);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getSetting(key, defaultValue = null) {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => {
                const setting = request.result;
                if (setting) {
                    try {
                        resolve(JSON.parse(setting.value));
                    } catch (error) {
                        resolve(defaultValue);
                    }
                } else {
                    resolve(defaultValue);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * إحصائيات وتحليلات
     */
    async getUserStats(userId) {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];
        
        const [
            user,
            allSavings,
            todaySavings,
            activeChallenges
        ] = await Promise.all([
            this.getUser(userId),
            this.getSavings(userId),
            this.getTodaySavings(userId),
            this.getActiveChallenges(userId)
        ]);
        
        // حساب الأيام المتتالية
        let currentStreak = 0;
        const savingsByDate = {};
        
        allSavings.forEach(saving => {
            if (!savingsByDate[saving.date]) {
                savingsByDate[saving.date] = saving.amount;
            } else {
                savingsByDate[saving.date] += saving.amount;
            }
        });
        
        const dates = Object.keys(savingsByDate).sort().reverse();
        let streakCounter = 0;
        
        for (let i = 0; i < dates.length; i++) {
            if (i === 0 || this.isConsecutiveDate(dates[i-1], dates[i])) {
                streakCounter++;
            } else {
                break;
            }
        }
        
        currentStreak = streakCounter;
        
        // تحديث streak في قاعدة البيانات إذا تغير
        if (user.currentStreak !== currentStreak) {
            const longestStreak = Math.max(user.longestStreak || 0, currentStreak);
            await this.updateUser(userId, {
                currentStreak,
                longestStreak
            });
        }
        
        // حساب إجمالي المدخرات
        const totalSavings = allSavings.reduce((sum, saving) => sum + saving.amount, 0);
        
        // حساب مدخرات اليوم
        const todayTotal = todaySavings.reduce((sum, saving) => sum + saving.amount, 0);
        
        // حساب التحدي النشط
        let activeChallenge = null;
        if (activeChallenges.length > 0) {
            activeChallenge = activeChallenges[0];
        }
        
        // حساب إحصائيات الأسبوع
        const weeklySavings = await this.getWeeklySavings(userId);
        const weeklyTotal = weeklySavings.reduce((sum, saving) => sum + saving.amount, 0);
        
        // حساب إحصائيات الشهر
        const monthlySavings = await this.getMonthlySavings(userId);
        const monthlyTotal = monthlySavings.reduce((sum, saving) => sum + saving.amount, 0);
        
        return {
            user: {
                id: userId,
                name: user.username,
                level: user.level,
                totalSavings,
                currentStreak,
                longestStreak: user.longestStreak || 0
            },
            today: {
                amount: todayTotal,
                count: todaySavings.length
            },
            week: {
                amount: weeklyTotal,
                count: weeklySavings.length,
                average: weeklyTotal / Math.max(1, weeklySavings.length)
            },
            month: {
                amount: monthlyTotal,
                count: monthlySavings.length,
                average: monthlyTotal / Math.max(1, monthlySavings.length)
            },
            challenges: {
                active: activeChallenges.length,
                total: activeChallenges.reduce((sum, c) => sum + (c.targetAmount || 0), 0),
                completed: activeChallenges.reduce((sum, c) => sum + (c.currentAmount || 0), 0)
            },
            activeChallenge
        };
    }

    /**
     * التحقق من تواريخ متتالية
     */
    isConsecutiveDate(date1Str, date2Str) {
        const date1 = new Date(date1Str);
        const date2 = new Date(date2Str);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    /**
     * تصدير البيانات
     */
    async exportData(userId) {
        const [
            user,
            savings,
            challenges,
            notifications,
            achievements,
            settings
        ] = await Promise.all([
            this.getUser(userId),
            this.getSavings(userId),
            this.getActiveChallenges(userId),
            this.getNotifications(userId),
            this.getUserAchievements(userId),
            this.getAllSettings()
        ]);
        
        return {
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0',
            user,
            savings,
            challenges,
            notifications,
            achievements,
            settings
        };
    }

    async getAllSettings() {
        const db = await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(setting => {
                    try {
                        settings[setting.key] = JSON.parse(setting.value);
                    } catch (error) {
                        settings[setting.key] = setting.value;
                    }
                });
                resolve(settings);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * حذف جميع البيانات (للتطوير)
     */
    async clearDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('🗑️ تم حذف قاعدة البيانات بنجاح');
                this.db = null;
                this.initialized = false;
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('❌ فشل حذف قاعدة البيانات:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * فحص حالة قاعدة البيانات
     */
    async getDatabaseInfo() {
        const db = await this.ensureInitialized();
        
        const transaction = db.transaction([
            'users', 
            'savings', 
            'challenges', 
            'notifications', 
            'achievements', 
            'settings'
        ], 'readonly');
        
        const stores = [
            'users', 'savings', 'challenges', 'notifications', 'achievements', 'settings'
        ];
        
        const counts = {};
        
        for (const storeName of stores) {
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                counts[storeName] = countRequest.result;
            };
        }
        
        return new Promise((resolve) => {
            transaction.oncomplete = () => {
                resolve({
                    name: this.dbName,
                    version: this.version,
                    stores: counts,
                    totalSize: this.estimateSize()
                });
            };
        });
    }

    /**
     * تقدير حجم قاعدة البيانات
     */
    estimateSize() {
        if (!this.db) return '0 KB';
        
        let totalSize = 0;
        const storeNames = Array.from(this.db.objectStoreNames);
        
        storeNames.forEach(storeName => {
            const store = this.db.transaction(storeName).objectStore(storeName);
            // هذا تقدير تقريبي
            totalSize += store.count ? 100 : 0; // 100 بايت لكل سجل تقديري
        });
        
        if (totalSize < 1024) {
            return `${totalSize} بايت`;
        } else if (totalSize < 1024 * 1024) {
            return `${(totalSize / 1024).toFixed(2)} ك.بايت`;
        } else {
            return `${(totalSize / (1024 * 1024)).toFixed(2)} م.بايت`;
        }
    }
}

// إنشاء نسخة عامة من قاعدة البيانات
const db = new SavingsDatabase();

// التصدير للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = db;
} else {
    window.SavingsDatabase = db;
}