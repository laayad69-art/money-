/**
 * نظام الإشعارات الذكية لتطبيق تحدى التوفير
 * يتضمن تنبيهات مبرمجة ومبنية على الأحداث
 */

class SmartNotifications {
    constructor() {
        this.types = {
            DAILY_REMINDER: 'daily_reminder',
            MILESTONE: 'milestone',
            STREAK: 'streak',
            ACHIEVEMENT: 'achievement',
            TIP: 'tip',
            MOTIVATION: 'motivation',
            CHALLENGE_UPDATE: 'challenge_update',
            SYSTEM: 'system'
        };

        this.scheduledTimers = [];
        this.lastNotificationTime = null;
        this.notificationCooldown = 30 * 60 * 1000; // 30 دقيقة بين الإشعارات
        this.userPreferences = {
            dailyReminders: true,
            milestoneAlerts: true,
            streakNotifications: true,
            savingTips: true,
            challengeUpdates: true,
            quietHours: {
                enabled: false,
                start: 22, // 10 مساءً
                end: 8     // 8 صباحاً
            }
        };

        this.milestones = [25, 50, 75, 90, 100];
        this.streakMilestones = [3, 7, 14, 30, 60, 90];
        
        this.init();
    }

    /**
     * تهيئة نظام الإشعارات
     */
    async init() {
        // تحميل تفضيلات المستخدم
        await this.loadPreferences();
        
        // تسجيل Service Worker للإشعارات
        await this.registerServiceWorker();
        
        // جدولة الإشعارات التلقائية
        this.scheduleAutomaticNotifications();
        
        // بدء مراقبة الأحداث
        this.startEventMonitoring();
        
        console.log('🔔 نظام الإشعارات الذكية جاهز للعمل');
    }

    /**
     * تحميل تفضيلات المستخدم
     */
    async loadPreferences() {
        try {
            const savedPrefs = await db.getSetting('notification_preferences');
            if (savedPrefs) {
                this.userPreferences = { ...this.userPreferences, ...savedPrefs };
            }
        } catch (error) {
            console.warn('⚠️ لم يتم تحميل تفضيلات الإشعارات، استخدام الإعدادات الافتراضية');
        }
    }

    /**
     * حفظ تفضيلات المستخدم
     */
    async savePreferences() {
        await db.saveSetting('notification_preferences', this.userPreferences);
    }

    /**
     * تسجيل Service Worker للإشعارات
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                // طلب إذن الإشعارات
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('✅ إذن الإشعارات مُنح بنجاح');
                    
                    // محاولة الاشتراك في إشعارات Push
                    try {
                        const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
                        });
                        
                        console.log('📩 تم الاشتراك في إشعارات Push:', subscription);
                    } catch (error) {
                        console.warn('⚠️ لا يمكن الاشتراك في إشعارات Push:', error);
                    }
                }
            } catch (error) {
                console.error('❌ خطأ في تسجيل Service Worker:', error);
            }
        }
    }

    /**
     * جدولة الإشعارات التلقائية
     */
    scheduleAutomaticNotifications() {
        this.clearScheduledTimers();

        // تذكير يومي
        if (this.userPreferences.dailyReminders) {
            this.scheduleDailyReminder();
        }

        // نصائح توفير (كل 3 أيام)
        if (this.userPreferences.savingTips) {
            this.scheduleSavingTips();
        }

        // إشعارات تحفيزية (عشوائية)
        this.scheduleRandomMotivations();

        console.log('⏰ تمت جدولة الإشعارات التلقائية');
    }

    /**
     * جدولة تذكير يومي
     */
    scheduleDailyReminder() {
        const now = new Date();
        const targetTime = new Date(now);
        
        // وقت التذكير: الساعة 8 مساءً
        targetTime.setHours(20, 0, 0, 0);
        
        if (targetTime < now) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilReminder = targetTime.getTime() - now.getTime();
        
        const timer = setTimeout(() => {
            if (this.isQuietHours()) {
                console.log('🤫 ساعات الهدوء نشطة، تأجيل الإشعار');
                this.scheduleDailyReminder();
                return;
            }
            
            this.sendDailyReminder();
            // كرر كل 24 ساعة
            this.scheduleDailyReminder();
        }, timeUntilReminder);
        
        this.scheduledTimers.push(timer);
    }

    /**
     * جدولة نصائح توفير
     */
    scheduleSavingTips() {
        const now = new Date();
        const targetTime = new Date(now);
        
        // كل 3 أيام في الساعة 10 صباحاً
        targetTime.setHours(10, 0, 0, 0);
        targetTime.setDate(targetTime.getDate() + 3);
        
        const timeUntilTip = targetTime.getTime() - now.getTime();
        
        const timer = setTimeout(() => {
            if (!this.isQuietHours()) {
                this.sendSavingTip();
            }
            // كرر كل 3 أيام
            this.scheduleSavingTips();
        }, timeUntilTip);
        
        this.scheduledTimers.push(timer);
    }

    /**
     * جدولة تحفيز عشوائي
     */
    scheduleRandomMotivations() {
        // إشعار تحفيزي عشوائي كل 6-12 ساعة
        const randomInterval = 6 * 60 * 60 * 1000 + Math.random() * 6 * 60 * 60 * 1000;
        
        const timer = setTimeout(() => {
            if (!this.isQuietHours()) {
                this.sendRandomMotivation();
            }
            this.scheduleRandomMotivations();
        }, randomInterval);
        
        this.scheduledTimers.push(timer);
    }

    /**
     * بدء مراقبة الأحداث
     */
    startEventMonitoring() {
        // مراقبة إضافة مدخرات جديدة
        document.addEventListener('savingAdded', (event) => {
            this.onSavingAdded(event.detail);
        });

        // مراقبة إنجاز التحديات
        document.addEventListener('challengeCompleted', (event) => {
            this.onChallengeCompleted(event.detail);
        });

        // مراقبة الأيام المتتالية
        document.addEventListener('streakUpdated', (event) => {
            this.onStreakUpdated(event.detail);
        });

        // مراقبة المعالم
        document.addEventListener('milestoneReached', (event) => {
            this.onMilestoneReached(event.detail);
        });
    }

    /**
     * التحقق من ساعات الهدوء
     */
    isQuietHours() {
        if (!this.userPreferences.quietHours.enabled) {
            return false;
        }

        const now = new Date();
        const currentHour = now.getHours();
        const { start, end } = this.userPreferences.quietHours;

        if (start <= end) {
            return currentHour >= start && currentHour < end;
        } else {
            return currentHour >= start || currentHour < end;
        }
    }

    /**
     * التحقق من التبريد (لمنع الإشعارات المتكررة)
     */
    isCooldownActive() {
        if (!this.lastNotificationTime) return false;
        
        const now = Date.now();
        const timeSinceLastNotification = now - this.lastNotificationTime;
        
        return timeSinceLastNotification < this.notificationCooldown;
    }

    /**
     * إرسال إشعار
     */
    async sendNotification(type, data = {}) {
        // التحقق من ساعات الهدوء
        if (this.isQuietHours()) {
            console.log('🤫 ساعات الهدوء نشطة، تخطي الإشعار');
            return;
        }

        // التحقق من التبريد
        if (this.isCooldownActive() && type !== this.types.SYSTEM) {
            console.log('⏳ التبريد نشط، تخطي الإشعار');
            return;
        }

        // التحقق من تفضيلات المستخدم
        if (!this.shouldSendNotification(type)) {
            return;
        }

        // إنشاء محتوى الإشعار
        const notification = this.createNotificationContent(type, data);
        if (!notification) return;

        // تحديث وقت الإشعار الأخير
        this.lastNotificationTime = Date.now();

        // إرسال إشعار المتصفح
        this.sendBrowserNotification(notification);

        // حفظ في قاعدة البيانات
        await this.saveToDatabase(notification, data.userId);

        // إظهار إشعار في التطبيق
        this.showInAppNotification(notification);

        console.log('📤 تم إرسال إشعار:', notification.title);
    }

    /**
     * التحقق مما إذا كان يجب إرسال الإشعار
     */
    shouldSendNotification(type) {
        switch (type) {
            case this.types.DAILY_REMINDER:
                return this.userPreferences.dailyReminders;
            case this.types.MILESTONE:
                return this.userPreferences.milestoneAlerts;
            case this.types.STREAK:
                return this.userPreferences.streakNotifications;
            case this.types.TIP:
                return this.userPreferences.savingTips;
            case this.types.CHALLENGE_UPDATE:
                return this.userPreferences.challengeUpdates;
            case this.types.ACHIEVEMENT:
            case this.types.MOTIVATION:
            case this.types.SYSTEM:
                return true;
            default:
                return false;
        }
    }

    /**
     * إنشاء محتوى الإشعار
     */
    createNotificationContent(type, data) {
        const templates = {
            [this.types.DAILY_REMINDER]: {
                title: '⏰ وقت التوفير!',
                body: this.getRandomDailyReminder(),
                icon: '💰',
                color: '#10B981'
            },
            [this.types.MILESTONE]: {
                title: `🎉 ${data.percentage}% إنجاز!`,
                body: `وصلت إلى ${data.percentage}% من هدفك في ${data.challengeName}`,
                icon: '🏆',
                color: '#F59E0B'
            },
            [this.types.STREAK]: {
                title: `🔥 ${data.days} يوم متتالي!`,
                body: `أنت توفر لمدة ${data.days} يوم متتالي! استمر في هذا الزخم الرائع`,
                icon: '🔥',
                color: '#EF4444'
            },
            [this.types.ACHIEVEMENT]: {
                title: `🏆 ${data.title}`,
                body: data.description,
                icon: '🏆',
                color: '#8B5CF6'
            },
            [this.types.TIP]: {
                title: '💡 نصيحة توفير',
                body: this.getRandomTip(),
                icon: '💡',
                color: '#3B82F6'
            },
            [this.types.MOTIVATION]: {
                title: '💪 كلمة تحفيز',
                body: this.getRandomMotivation(),
                icon: '🌟',
                color: '#8B5CF6'
            },
            [this.types.CHALLENGE_UPDATE]: {
                title: data.title || '📊 تحديث التحدي',
                body: data.message,
                icon: '📊',
                color: '#10B981'
            },
            [this.types.SYSTEM]: {
                title: data.title,
                body: data.message,
                icon: '🔔',
                color: '#6B7280'
            }
        };

        const template = templates[type];
        if (!template) return null;

        return {
            ...template,
            type,
            timestamp: new Date().toISOString(),
            data
        };
    }

    /**
     * إرسال إشعار المتصفح
     */
    sendBrowserNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const options = {
            body: notification.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'saving-challenge',
            renotify: true,
            vibrate: [200, 100, 200],
            data: {
                url: window.location.href,
                type: notification.type
            },
            actions: notification.type === this.types.DAILY_REMINDER ? [
                {
                    action: 'add-saving',
                    title: 'إضافة توفير'
                },
                {
                    action: 'later',
                    title: 'تذكير لاحقاً'
                }
            ] : []
        };

        const browserNotification = new Notification(notification.title, options);

        // التعامل مع نقرات الإشعار
        browserNotification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            
            if (notification.type === this.types.DAILY_REMINDER) {
                this.openAddSavingModal();
            }
            
            browserNotification.close();
        };

        // إغلاق تلقائي بعد 10 ثواني
        setTimeout(() => {
            browserNotification.close();
        }, 10000);
    }

    /**
     * إظهار إشعار في التطبيق
     */
    showInAppNotification(notification) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            border-right: 4px solid ${notification.color};
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        `;

        toast.innerHTML = `
            <div class="toast-icon" style="font-size: 24px;">${notification.icon}</div>
            <div class="toast-content" style="flex: 1;">
                <div class="toast-title" style="font-weight: 600; margin-bottom: 4px; color: #1F2937;">
                    ${notification.title}
                </div>
                <div class="toast-body" style="color: #6B7280; font-size: 14px; line-height: 1.4;">
                    ${notification.body}
                </div>
                <div class="toast-time" style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">
                    ${this.formatTime(new Date())}
                </div>
            </div>
            <button class="toast-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #9CA3AF;">
                ×
            </button>
        `;

        document.body.appendChild(toast);

        // إضافة أنيميشن
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // إغلاق الإشعار
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        });

        // إغلاق تلقائي بعد 5 ثوان
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    /**
     * حفظ الإشعار في قاعدة البيانات
     */
    async saveToDatabase(notification, userId) {
        try {
            await db.addNotification({
                userId: userId || 1,
                title: notification.title,
                body: notification.body,
                type: notification.type,
                icon: notification.icon,
                data: notification.data,
                isRead: false
            });
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعار:', error);
        }
    }

    /**
     * معالج إضافة توفير جديد
     */
    async onSavingAdded(savingData) {
        // إشعار نجاح الإضافة
        await this.sendNotification(this.types.SYSTEM, {
            title: '💰 توفير جديد!',
            message: `تم إضافة ${savingData.amount} جنيه بنجاح`,
            userId: savingData.userId
        });

        // التحقق من المعالم
        await this.checkMilestones(savingData.userId, savingData.challengeId);

        // إرسال تحفيز عشوائي (20% فرصة)
        if (Math.random() < 0.2) {
            await this.sendNotification(this.types.MOTIVATION, {
                userId: savingData.userId
            });
        }
    }

    /**
     * معالج إكمال التحدي
     */
    async onChallengeCompleted(challengeData) {
        await this.sendNotification(this.types.ACHIEVEMENT, {
            title: '🎯 التحدي مكتمل!',
            description: `مبروك! لقد أكملت تحدى "${challengeData.name}" بنجاح`,
            userId: challengeData.userId
        });
    }

    /**
     * معالج تحديث الأيام المتتالية
     */
    async onStreakUpdated(streakData) {
        const { days, userId } = streakData;

        // التحقق من معالم الأيام المتتالية
        if (this.streakMilestones.includes(days)) {
            await this.sendNotification(this.types.STREAK, {
                days,
                userId
            });
        }
    }

    /**
     * معالب الوصول إلى معلم
     */
    async onMilestoneReached(milestoneData) {
        await this.sendNotification(this.types.MILESTONE, milestoneData);
    }

    /**
     * التحقق من المعالم
     */
    async checkMilestones(userId, challengeId) {
        try {
            const challenge = await db.getChallenge(challengeId);
            if (!challenge || !challenge.targetAmount) return;

            const progress = Math.round((challenge.currentAmount / challenge.targetAmount) * 100);
            
            // التحقق من المعالم المحددة
            for (const milestone of this.milestones) {
                if (progress >= milestone && progress < milestone + 5) {
                    // تجنب إرسال نفس المعلم مرتين
                    const key = `milestone_${challengeId}_${milestone}`;
                    const lastSent = await db.getSetting(key);
                    
                    if (!lastSent) {
                        await this.sendNotification(this.types.MILESTONE, {
                            percentage: milestone,
                            challengeName: challenge.name,
                            userId
                        });
                        
                        await db.saveSetting(key, true);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('❌ خطأ في التحقق من المعالم:', error);
        }
    }

    /**
     * إرسال تذكير يومي
     */
    async sendDailyReminder() {
        await this.sendNotification(this.types.DAILY_REMINDER);
    }

    /**
     * إرسال نصيحة توفير
     */
    async sendSavingTip() {
        await this.sendNotification(this.types.TIP);
    }

    /**
     * إرسال تحفيز عشوائي
     */
    async sendRandomMotivation() {
        await this.sendNotification(this.types.MOTIVATION);
    }

    /**
     * الحصول على تذكير يومي عشوائي
     */
    getRandomDailyReminder() {
        const reminders = [
            'لا تنس إدخال مدخراتك اليومية. كل قرش يصنع فرقاً!',
            'حان وقت تحديث شجرة توفيرك! كم وفرت اليوم؟',
            'التوفير اليومي عادة رائعة، حافظ عليها!',
            'تذكر هدفك! كل يوم تقترب أكثر من حلمك',
            'مدخراتك الصغيرة تصنع مستقبلاً كبيراً، استمر!',
            'اليوم يوم جديد لتحقيق إنجاز في توفيرك',
            'شجرتك تنتظر رعايتك اليومية، أضف مدخراتك!'
        ];
        
        return reminders[Math.floor(Math.random() * reminders.length)];
    }

    /**
     * الحصول على نصيحة توفير عشوائية
     */
    getRandomTip() {
        const tips = [
            'اشترِ منتجات التنظيف من العطار بدلاً من السوبر ماركت لتوفير يصل لـ 40%',
            'خطط لقائمة طعام الأسبوع لتجنب الطلبات الخارجية غير المخطط لها',
            'استخدم تطبيقات كوبونات الخصم قبل أي شراء عبر الإنترنت',
            'جرب نظام "اليوم بدون إنفاق" مرة أسبوعياً',
            'قارن أسعار المحلات قبل الشراء، الفروقات قد تصل لـ 30%',
            'اشترِ بالجملة المنتجات التي تستخدمها بكثرة',
            'أعد استخدام الأشياء بدلاً من شراء جديدة عندما يكون ذلك ممكناً',
            'تعلم إصلاح الأشياء البسيطة بنفسك',
            'استخدم وسائل النقل العام أو المشي عندما تكون المسافة قصيرة',
            'احمل زجاجة ماء معك لتجنب شراء المشروبات الغالية'
        ];
        
        return tips[Math.floor(Math.random() * tips.length)];
    }

    /**
     * الحصول على تحفيز عشوائي
     */
    getRandomMotivation() {
        const motivations = [
            'رحلة الألف ميل تبدأ بخطوة، وكل توفير هو خطوة نحو هدفك',
            'التوفير ليس حرماناً، بل هو استثمار في حريتك المستقبلية',
            'القادة لا يولدون، بل يُصنعون بقرارات يومية مثل قرارك بالتوفير',
            'المستقبل يصنعه أولئك الذين يؤمنون بجمال أحلامهم، وأنت منهم',
            'النجاح ليس مصادفة، بل هو عمل شاق ومثابرة وتوفير مستمر',
            'كل جنيه تدخره اليوم هو لبنة في بناء مستقبلك المالي الآمن',
            'أنت أقوى مما تظن، وقدرتك على التوفير تثبت ذلك كل يوم'
        ];
        
        return motivations[Math.floor(Math.random() * motivations.length)];
    }

    /**
     * فتح نافذة إضافة توفير
     */
    openAddSavingModal() {
        const event = new Event('openAddSavingModal');
        document.dispatchEvent(event);
    }

    /**
     * تنسيق الوقت
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

    /**
     * تحويل VAPID key
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * تنظيف المؤقتات
     */
    clearScheduledTimers() {
        this.scheduledTimers.forEach(timer => clearTimeout(timer));
        this.scheduledTimers = [];
    }

    /**
     * تحديث تفضيلات المستخدم
     */
    updatePreferences(newPreferences) {
        this.userPreferences = { ...this.userPreferences, ...newPreferences };
        this.savePreferences();
        this.scheduleAutomaticNotifications();
    }

    /**
     * إرسال إشعار مخصص
     */
    async sendCustomNotification(title, message, userId, type = this.types.SYSTEM) {
        await this.sendNotification(type, {
            title,
            message,
            userId
        });
    }

    /**
     * الحصول على إحصائيات الإشعارات
     */
    async getNotificationStats(userId) {
        const notifications = await db.getNotifications(userId);
        
        const stats = {
            total: notifications.length,
            unread: notifications.filter(n => !n.isRead).length,
            byType: {},
            today: 0
        };

        const today = new Date().toISOString().split('T')[0];
        
        notifications.forEach(notification => {
            // حسب النوع
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
            
            // اليوم
            if (notification.createdAt.startsWith(today)) {
                stats.today++;
            }
        });

        return stats;
    }

    /**
     * إشعارات الاختبار (للتطوير)
     */
    async testAllNotifications(userId = 1) {
        console.log('🧪 بدء اختبار جميع أنواع الإشعارات...');
        
        const testData = [
            {
                type: this.types.DAILY_REMINDER,
                data: {}
            },
            {
                type: this.types.MILESTONE,
                data: {
                    percentage: 50,
                    challengeName: 'تحدي رمضان',
                    userId
                }
            },
            {
                type: this.types.STREAK,
                data: {
                    days: 7,
                    userId
                }
            },
            {
                type: this.types.ACHIEVEMENT,
                data: {
                    title: 'إنجاز الاختبار',
                    description: 'هذا إشعار اختبار للإنجازات',
                    userId
                }
            },
            {
                type: this.types.TIP,
                data: {}
            },
            {
                type: this.types.MOTIVATION,
                data: {}
            },
            {
                type: this.types.SYSTEM,
                data: {
                    title: 'اختبار النظام',
                    message: 'هذا إشعار اختبار للنظام',
                    userId
                }
            }
        ];

        for (const test of testData) {
            await this.sendNotification(test.type, test.data);
            await new Promise(resolve => setTimeout(resolve, 1000)); // تأخير ثانية بين كل إشعار
        }

        console.log('✅ تم اختبار جميع أنواع الإشعارات');
    }
}

// إنشاء نسخة عامة من نظام الإشعارات
const notifications = new SmartNotifications();

// التصدير للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = notifications;
} else {
    window.SmartNotifications = notifications;
}