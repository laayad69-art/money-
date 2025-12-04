/**
 * Service Worker لتطبيق تحدى التوفير الذكي
 * يدعم العمل بدون اتصال، الإشعارات، والتخزين المؤقت
 */

const CACHE_NAME = 'saving-challenge-v2.0';
const APP_VERSION = '2.0.0';
const OFFLINE_PAGE = '/index.html';

// الملفات التي سيتم تخزينها مؤقتاً
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    
    // CSS
    '/css/style.css',
    '/css/pwa.css',
    
    // JavaScript
    '/js/app.js',
    '/js/db.js',
    '/js/notifications.js',
    '/js/savingsTree.js',
    '/js/service-worker.js',
    
    // الأيقونات
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    
    // الخطوط (إذا كانت محلية)
    '/fonts/Cairo-Regular.woff2',
    '/fonts/Cairo-Bold.woff2'
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
    PRECACHE: 'precache',        // الملفات الأساسية
    RUNTIME: 'runtime',          // الملفات الديناميكية
    STATIC: 'static'            // الملفات الثابتة
};

// رسائل Service Worker
const SW_MESSAGES = {
    UPDATE_AVAILABLE: 'update_available',
    UPDATE_ACTIVATED: 'update_activated',
    CACHE_CLEARED: 'cache_cleared',
    SYNC_COMPLETED: 'sync_completed'
};

/**
 * تثبيت Service Worker
 */
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker جاري التثبيت...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 جاري تخزين الملفات الأساسية في الكاش...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('✅ تم تثبيت Service Worker بنجاح');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ خطأ في تثبيت Service Worker:', error);
            })
    );
});

/**
 * تفعيل Service Worker
 */
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker جاري التفعيل...');
    
    event.waitUntil(
        Promise.all([
            // تنظيف الكاش القديم
            clearOldCaches(),
            
            // تأكيد السيطرة على جميع التبويبات
            self.clients.claim(),
            
            // إرسال رسالة تفعيل التحديث
            sendMessageToClients({
                type: SW_MESSAGES.UPDATE_ACTIVATED,
                version: APP_VERSION,
                timestamp: new Date().toISOString()
            })
        ])
        .then(() => {
            console.log('✅ Service Worker مفعل وجاهز للعمل');
        })
    );
});

/**
 * اعتراض طلبات الشبكة
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // تجاهل الطلبات غير GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // تجاهل طلبات التحقق من التحديثات
    if (url.pathname.includes('service-worker.js')) {
        return;
    }
    
    // استراتيجيات التخزين المؤقت
    if (shouldCache(event.request)) {
        event.respondWith(
            handleFetchWithCache(event.request)
        );
    }
});

/**
 * معالجة طلبات Push
 */
self.addEventListener('push', (event) => {
    console.log('📩 تم استقبال رسالة Push');
    
    let data = {};
    
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (error) {
        data = {
            title: 'تحدي التوفير الذكي',
            body: 'رسالة جديدة من تطبيق التوفير',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            timestamp: new Date().toISOString()
        };
    }
    
    const options = {
        body: data.body || 'رسالة جديدة من تطبيق تحدى التوفير',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            type: data.type || 'general',
            timestamp: data.timestamp || new Date().toISOString()
        },
        actions: data.actions || [
            {
                action: 'open',
                title: 'فتح التطبيق'
            },
            {
                action: 'dismiss',
                title: 'تجاهل'
            }
        ],
        tag: data.tag || 'saving-notification',
        renotify: true,
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'تحدي التوفير الذكي', options)
    );
});

/**
 * معالجة نقرات الإشعارات
 */
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ تم النقر على الإشعار:', event.notification.tag);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data.url || '/';
    
    // فتح التطبيق أو التبويب المناسب
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then((clientList) => {
            // البحث عن تبويب مفتوح
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // إذا لم يوجد تبويب مفتوح، فتح تبويب جديد
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
    
    // معالجة الإجراءات
    if (event.action === 'add-saving') {
        // إرسال رسالة لفتح نافذة إضافة توفير
        sendMessageToClients({
            type: 'OPEN_ADD_SAVING_MODAL',
            source: 'notification'
        });
    }
});

/**
 * معالجة رسائل التزامن في الخلفية
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 حدث تزامن:', event.tag);
    
    if (event.tag === 'sync-savings') {
        event.waitUntil(syncSavings());
    } else if (event.tag === 'sync-settings') {
        event.waitUntil(syncSettings());
    }
});

/**
 * معالجة الرسائل من الصفحة الرئيسية
 */
self.addEventListener('message', (event) => {
    console.log('📨 رسالة من الصفحة:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches();
            break;
            
        case 'GET_CACHE_INFO':
            getCacheInfo().then(info => {
                event.ports[0].postMessage(info);
            });
            break;
            
        case 'CHECK_FOR_UPDATES':
            checkForUpdates();
            break;
            
        case 'BACKGROUND_SYNC':
            registerBackgroundSync(data.tag);
            break;
    }
});

/**
 * دالة مساعدة: التحقق مما إذا كان يجب تخزين الطلب مؤقتاً
 */
function shouldCache(request) {
    const url = new URL(request.url);
    
    // تخزين الطلبات من نفس المصدر
    if (url.origin === self.location.origin) {
        return true;
    }
    
    // تخزين بعض الطلبات الخارجية المهمة
    const externalCache = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
    ];
    
    return externalCache.some(origin => url.origin === origin);
}

/**
 * دالة مساعدة: معالجة الطلب مع التخزين المؤقت
 */
async function handleFetchWithCache(request) {
    try {
        // محاولة الحصول من الشبكة أولاً
        const networkResponse = await fetch(request);
        
        // إذا نجح الطلب، تخزينه في الكاش
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('🌐 فشل الاتصال بالشبكة، جاري البحث في الكاش...');
        
        // البحث في الكاش
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // إذا لم يوجد في الكاش، عرض صفحة بدون اتصال
        if (request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
        }
        
        // للطلبات الأخرى، إرجاع رد افتراضي
        return new Response('لا يوجد اتصال بالإنترنت', {
            status: 408,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

/**
 * دالة مساعدة: تنظيف الكاش القديم
 */
async function clearOldCaches() {
    const cacheKeys = await caches.keys();
    
    return Promise.all(
        cacheKeys.map(cacheKey => {
            if (cacheKey !== CACHE_NAME) {
                console.log(`🗑️ جاري حذف الكاش القديم: ${cacheKey}`);
                return caches.delete(cacheKey);
            }
        })
    );
}

/**
 * دالة مساعدة: حذف جميع الكاشات
 */
async function clearAllCaches() {
    const cacheKeys = await caches.keys();
    
    return Promise.all(
        cacheKeys.map(cacheKey => {
            console.log(`🗑️ جاري حذف الكاش: ${cacheKey}`);
            return caches.delete(cacheKey);
        })
    ).then(() => {
        sendMessageToClients({
            type: SW_MESSAGES.CACHE_CLEARED,
            timestamp: new Date().toISOString()
        });
    });
}

/**
 * دالة مساعدة: الحصول على معلومات الكاش
 */
async function getCacheInfo() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    const cacheSize = await calculateCacheSize(cache);
    
    return {
        name: CACHE_NAME,
        version: APP_VERSION,
        assetCount: requests.length,
        cacheSize: formatBytes(cacheSize),
        cachedUrls: requests.map(req => req.url),
        lastUpdated: new Date().toISOString()
    };
}

/**
 * دالة مساعدة: حساب حجم الكاش
 */
async function calculateCacheSize(cache) {
    const requests = await cache.keys();
    let totalSize = 0;
    
    for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }
    
    return totalSize;
}

/**
 * دالة مساعدة: تنسيق الحجم بالبايت
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 بايت';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['بايت', 'ك.بايت', 'م.بايت', 'ج.بايت', 'ت.بايت'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * دالة مساعدة: إرسال رسالة للعملاء
 */
function sendMessageToClients(message) {
    self.clients.matchAll()
        .then(clients => {
            clients.forEach(client => {
                client.postMessage(message);
            });
        })
        .catch(error => {
            console.error('❌ خطأ في إرسال الرسالة:', error);
        });
}

/**
 * دالة مساعدة: تسجيل تزامن الخلفية
 */
function registerBackgroundSync(tag) {
    if ('SyncManager' in self.registration) {
        self.registration.sync.register(tag)
            .then(() => {
                console.log(`✅ تم تسجيل تزامن الخلفية: ${tag}`);
            })
            .catch(error => {
                console.error(`❌ خطأ في تسجيل تزامن الخلفية: ${error}`);
            });
    }
}

/**
 * دالة مساعدة: تزامن المدخرات
 */
async function syncSavings() {
    console.log('🔄 جاري مزامنة المدخرات...');
    
    // هنا سيتم إرسال البيانات المخزنة محلياً للخادم
    // هذه دالة افتراضية، يمكن تخصيصها حسب احتياجاتك
    
    sendMessageToClients({
        type: SW_MESSAGES.SYNC_COMPLETED,
        dataType: 'savings',
        timestamp: new Date().toISOString()
    });
    
    return Promise.resolve();
}

/**
 * دالة مساعدة: تزامن الإعدادات
 */
async function syncSettings() {
    console.log('🔄 جاري مزامنة الإعدادات...');
    
    // دالة افتراضية لتزامن الإعدادات
    
    sendMessageToClients({
        type: SW_MESSAGES.SYNC_COMPLETED,
        dataType: 'settings',
        timestamp: new Date().toISOString()
    });
    
    return Promise.resolve();
}

/**
 * دالة مساعدة: التحقق من التحديثات
 */
async function checkForUpdates() {
    console.log('🔍 جاري التحقق من التحديثات...');
    
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        const updatePromises = requests.map(async (request) => {
            try {
                const networkResponse = await fetch(request);
                
                if (networkResponse.status === 200) {
                    const cachedResponse = await cache.match(request);
                    
                    if (!cachedResponse || 
                        networkResponse.headers.get('ETag') !== cachedResponse.headers.get('ETag')) {
                        
                        console.log(`🔄 تم العثور على تحديث لـ: ${request.url}`);
                        cache.put(request, networkResponse.clone());
                        return true;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ خطأ في التحقق من تحديث ${request.url}:`, error);
            }
            
            return false;
        });
        
        const results = await Promise.all(updatePromises);
        const hasUpdates = results.some(result => result === true);
        
        if (hasUpdates) {
            sendMessageToClients({
                type: SW_MESSAGES.UPDATE_AVAILABLE,
                message: 'توجد تحديثات جديدة، جاري التحديث...',
                timestamp: new Date().toISOString()
            });
        }
        
        return hasUpdates;
    } catch (error) {
        console.error('❌ خطأ في التحقق من التحديثات:', error);
        return false;
    }
}

/**
 * التنظيف الدوري للكاش
 */
async function periodicCacheCleanup() {
    const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
    
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        const now = Date.now();
        
        const cleanupPromises = requests.map(async (request) => {
            const response = await cache.match(request);
            
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    
                    if (now - responseDate > WEEK_IN_MS) {
                        console.log(`🗑️ جاري حذف الملف القديم: ${request.url}`);
                        await cache.delete(request);
                    }
                }
            }
        });
        
        await Promise.all(cleanupPromises);
        console.log('🧹 تم تنظيف الكاش القديم');
    } catch (error) {
        console.error('❌ خطأ في تنظيف الكاش:', error);
    }
}

// تشغيل التنظيف الدوري كل يوم
if (self.registration && self.registration.periodicSync) {
    try {
        self.registration.periodicSync.register('cache-cleanup', {
            minInterval: 24 * 60 * 60 * 1000 // 24 ساعة
        }).then(() => {
            console.log('✅ تم تسجيل التنظيف الدوري للكاش');
        });
    } catch (error) {
        console.warn('⚠️ لا يدعم المتصفح التنظيف الدوري:', error);
    }
}

// بدء التنظيف الدوري عند التفعيل
self.addEventListener('activate', (event) => {
    event.waitUntil(periodicCacheCleanup());
});

console.log('🚀 Service Worker محمل وجاهز للعمل');