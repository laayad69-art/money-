/**
 * شجرة التوفير التفاعلية
 * شجرة تنمو مع زيادة مدخرات المستخدم
 */

class SavingsTree {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`❌ العنصر #${containerId} غير موجود`);
            return;
        }

        this.options = {
            initialSize: 100,
            maxSize: 300,
            growthRate: 0.5, // نسبة النمو لكل 1% تقدم
            leafCount: 20,
            particleCount: 50,
            colors: {
                trunk: '#8B4513',
                leaves: ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A'],
                particles: ['#FFD700', '#FFC107', '#FFB300', '#FFA000']
            },
            animations: {
                enabled: true,
                speed: 1,
                wind: 0.5
            },
            ...options
        };

        this.progress = 0;
        this.currentSize = this.options.initialSize;
        this.leaves = [];
        this.particles = [];
        this.windOffset = 0;
        this.isGrowing = false;
        this.animationId = null;

        this.init();
    }

    /**
     * تهيئة الشجرة
     */
    init() {
        this.container.innerHTML = '';
        
        // إنشاء عنصر الشجرة
        this.treeElement = document.createElement('div');
        this.treeElement.className = 'savings-tree';
        this.treeElement.style.cssText = `
            position: relative;
            width: ${this.options.maxSize}px;
            height: ${this.options.maxSize}px;
            margin: 0 auto;
        `;

        // إنصال الجذع
        this.trunk = this.createTrunk();
        this.treeElement.appendChild(this.trunk);

        // إنصال الأوراق
        this.leavesContainer = document.createElement('div');
        this.leavesContainer.className = 'tree-leaves';
        this.leavesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        this.treeElement.appendChild(this.leavesContainer);

        // إنصال الجسيمات
        this.particlesContainer = document.createElement('div');
        this.particlesContainer.className = 'tree-particles';
        this.particlesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        this.treeElement.appendChild(this.particlesContainer);

        // إنصال مؤشر التقدم
        this.createProgressIndicator();

        this.container.appendChild(this.treeElement);

        // بدء الرسوم المتحركة
        if (this.options.animations.enabled) {
            this.startAnimation();
        }

        console.log('🌳 تم تهيئة شجرة التوفير');
    }

    /**
     * إنشاء جذع الشجرة
     */
    createTrunk() {
        const trunk = document.createElement('div');
        trunk.className = 'tree-trunk';
        trunk.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: ${this.currentSize * 0.1}px;
            height: ${this.currentSize * 0.6}px;
            background: linear-gradient(to right, ${this.options.colors.trunk} 0%, #A0522D 100%);
            border-radius: 10px;
            z-index: 1;
        `;

        // إضافة تفاصيل الجذع
        const barkDetails = document.createElement('div');
        barkDetails.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(0,0,0,0.1) 20%, 
                transparent 40%, 
                rgba(0,0,0,0.15) 60%, 
                transparent 80%, 
                rgba(0,0,0,0.1) 100%);
            border-radius: 10px;
        `;
        trunk.appendChild(barkDetails);

        return trunk;
    }

    /**
     * تحديث الشجرة بناء على التقدم
     */
    update(progress) {
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;

        const oldProgress = this.progress;
        this.progress = progress;

        // حساب الحجم الجديد
        const targetSize = this.options.initialSize + 
                         (this.options.maxSize - this.options.initialSize) * 
                         (progress / 100) * this.options.growthRate;
        
        this.growToSize(targetSize);

        // تحديث عدد الأوراق
        const targetLeafCount = Math.floor(this.options.leafCount * (progress / 100));
        this.updateLeaves(targetLeafCount);

        // إضافة جسيمات إذا كان هناك تقدم
        if (progress > oldProgress) {
            this.addGrowthParticles(progress - oldProgress);
        }

        // تحديث مؤشر التقدم
        this.updateProgressIndicator();

        // تحديث مرحلة الشجرة
        this.updateTreeStage();

        return this;
    }

    /**
     * نمو الشجرة إلى حجم معين
     */
    growToSize(targetSize) {
        if (this.isGrowing) return;

        this.isGrowing = true;
        const startSize = this.currentSize;
        const sizeDiff = targetSize - startSize;
        const duration = 1000; // 1 ثانية
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // استخدام easing function لنمو طبيعي
            const easeProgress = this.easeOutCubic(progress);
            this.currentSize = startSize + (sizeDiff * easeProgress);

            // تحديث حجم الجذع
            this.trunk.style.width = `${this.currentSize * 0.1}px`;
            this.trunk.style.height = `${this.currentSize * 0.6}px`;

            // تحديث موضع الأوراق
            this.updateLeavesPosition();

            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.isGrowing = false;
            }
        };

        animate();
    }

    /**
     * تحديث الأوراق
     */
    updateLeaves(targetCount) {
        const currentCount = this.leaves.length;

        if (targetCount > currentCount) {
            // إضافة أوراق جديدة
            for (let i = currentCount; i < targetCount; i++) {
                this.addLeaf();
            }
        } else if (targetCount < currentCount) {
            // إزالة الأوراق الزائدة (لا نزيلها في الواقع، نخفيها فقط)
            for (let i = targetCount; i < currentCount; i++) {
                if (this.leaves[i]) {
                    this.leaves[i].style.opacity = '0';
                }
            }
        }

        // تحديث ألوان الأوراق بناء على التقدم
        this.updateLeavesColor();
    }

    /**
     * إضافة ورقة جديدة
     */
    addLeaf() {
        const leaf = document.createElement('div');
        leaf.className = 'tree-leaf';
        
        // حجم عشوائي
        const size = 15 + Math.random() * 20;
        
        // لون عشوائي من الألوان المتاحة
        const colorIndex = Math.floor(Math.random() * this.options.colors.leaves.length);
        const color = this.options.colors.leaves[colorIndex];
        
        // موضع عشوائي
        const angle = Math.random() * Math.PI * 2;
        const distance = (this.currentSize * 0.3) + (Math.random() * this.currentSize * 0.2);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        leaf.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: ${size}px 0;
            transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
            left: 50%;
            top: 50%;
            margin-left: ${x}px;
            margin-top: ${y}px;
            opacity: 0;
            transition: opacity 0.5s ease;
            z-index: 2;
        `;

        // إضافة تأثير الظل
        leaf.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

        this.leavesContainer.appendChild(leaf);
        this.leaves.push(leaf);

        // إظهار الورقة تدريجياً
        setTimeout(() => {
            leaf.style.opacity = '0.8';
        }, 100);
    }

    /**
     * تحديث مواضع الأوراق
     */
    updateLeavesPosition() {
        this.leaves.forEach((leaf, index) => {
            if (leaf.style.opacity !== '0') {
                const angle = (index / this.leaves.length) * Math.PI * 2;
                const distance = (this.currentSize * 0.3) + 
                               ((index % 3) * this.currentSize * 0.1);
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;

                leaf.style.marginLeft = `${x}px`;
                leaf.style.marginTop = `${y}px`;
            }
        });
    }

    /**
     * تحديث ألوان الأوراق
     */
    updateLeavesColor() {
        const progress = this.progress / 100;
        
        this.leaves.forEach((leaf, index) => {
            if (leaf.style.opacity !== '0') {
                // تحويل اللون بناء على التقدم
                const hue = 120 + (progress * 60); // من أخضر إلى أصفر
                const saturation = 70 + (progress * 20);
                const lightness = 40 + (progress * 20);
                
                leaf.style.background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            }
        });
    }

    /**
     * إضافة جسيمات النمو
     */
    addGrowthParticles(progressAmount) {
        const particleCount = Math.min(Math.floor(progressAmount * 2), 10);
        
        for (let i = 0; i < particleCount; i++) {
            this.addParticle();
        }
    }

    /**
     * إضافة جسيم
     */
    addParticle() {
        const particle = document.createElement('div');
        particle.className = 'growth-particle';
        
        // حجم عشوائي
        const size = 5 + Math.random() * 10;
        
        // لون عشوائي
        const colorIndex = Math.floor(Math.random() * this.options.colors.particles.length);
        const color = this.options.colors.particles[colorIndex];
        
        // موضع بداية (من أسفل الجذع)
        const startX = 50 + (Math.random() * 20 - 10);
        const startY = 100;
        
        // موضع نهاية عشوائي
        const endX = startX + (Math.random() * 40 - 20);
        const endY = Math.random() * 60;

        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            left: ${startX}%;
            top: ${startY}%;
            transform: translate(-50%, -50%);
            opacity: 0;
            z-index: 3;
            box-shadow: 0 0 10px ${color};
        `;

        this.particlesContainer.appendChild(particle);
        this.particles.push({ element: particle, startX, startY, endX, endY, life: 0 });

        // إظهار الجسيم
        setTimeout(() => {
            particle.style.opacity = '1';
        }, 10);
    }

    /**
     * إنشاء مؤشر التقدم
     */
    createProgressIndicator() {
        this.progressIndicator = document.createElement('div');
        this.progressIndicator.className = 'tree-progress-indicator';
        this.progressIndicator.style.cssText = `
            position: absolute;
            bottom: -40px;
            left: 0;
            width: 100%;
            text-align: center;
            font-family: 'Cairo', sans-serif;
            color: #374151;
        `;

        this.progressText = document.createElement('div');
        this.progressText.className = 'progress-text';
        this.progressText.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        `;

        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        this.progressBar.style.cssText = `
            width: 100%;
            height: 8px;
            background: #E5E7EB;
            border-radius: 4px;
            overflow: hidden;
            margin: 0 auto;
            max-width: 200px;
        `;

        this.progressFill = document.createElement('div');
        this.progressFill.className = 'progress-fill';
        this.progressFill.style.cssText = `
            width: ${this.progress}%;
            height: 100%;
            background: linear-gradient(90deg, #10B981, #34D399);
            border-radius: 4px;
            transition: width 0.5s ease;
        `;

        this.progressBar.appendChild(this.progressFill);
        this.progressIndicator.appendChild(this.progressText);
        this.progressIndicator.appendChild(this.progressBar);

        this.treeElement.appendChild(this.progressIndicator);
        this.updateProgressIndicator();
    }

    /**
     * تحديث مؤشر التقدم
     */
    updateProgressIndicator() {
        this.progressText.textContent = `شجرة توفيرك (${this.progress}%)`;
        this.progressFill.style.width = `${this.progress}%`;
    }

    /**
     * تحديث مرحلة الشجرة
     */
    updateTreeStage() {
        let stage = 'seed';
        let message = '';

        if (this.progress < 10) {
            stage = 'seed';
            message = '🌱 البذرة المزروعة! ابدأ ري شجرتك بالتوفير';
        } else if (this.progress < 30) {
            stage = 'sprout';
            message = '🌿 الشتلة الصغيرة! شجرتك بدأت تنمو';
        } else if (this.progress < 60) {
            stage = 'young';
            message = '🌳 الشجرة الفتية! تقدم رائع، استمر!';
        } else if (this.progress < 90) {
            stage = 'mature';
            message = '🌲 الشجرة الناضجة! إنجاز مذهل!';
        } else {
            stage = 'flourishing';
            message = '🎉 الشجرة المزهرة! أنت أسطورة في التوفير!';
        }

        // إرسال حدث تحديث المرحلة
        const event = new CustomEvent('treeStageUpdated', {
            detail: { stage, message, progress: this.progress }
        });
        document.dispatchEvent(event);

        return { stage, message };
    }

    /**
     * بدء الرسوم المتحركة
     */
    startAnimation() {
        const animate = () => {
            this.windOffset += 0.02 * this.options.animations.speed;
            
            // تحريك الأوراق مع الريح
            this.leaves.forEach((leaf, index) => {
                if (leaf.style.opacity !== '0') {
                    const windEffect = Math.sin(this.windOffset + (index * 0.5)) * 
                                     this.options.animations.wind * 2;
                    leaf.style.transform = `translate(-50%, -50%) rotate(${windEffect}deg)`;
                }
            });

            // تحديث الجسيمات
            this.updateParticles();

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * تحديث الجسيمات
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life += 0.02;

            if (particle.life > 1) {
                // إزالة الجسيمات القديمة
                particle.element.remove();
                this.particles.splice(i, 1);
            } else {
                // تحريك الجسيم
                const x = particle.startX + (particle.endX - particle.startX) * particle.life;
                const y = particle.startY + (particle.endY - particle.startY) * particle.life;
                
                // تأثير الارتداد
                const bounce = Math.sin(particle.life * Math.PI);
                
                particle.element.style.left = `${x}%`;
                particle.element.style.top = `${y - (bounce * 10)}%`;
                particle.element.style.opacity = `${1 - particle.life}`;
                particle.element.style.transform = `translate(-50%, -50%) scale(${1 + bounce * 0.5})`;
            }
        }
    }

    /**
     * توقيف الرسوم المتحركة
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * إعادة تعيين الشجرة
     */
    reset() {
        this.stopAnimation();
        this.progress = 0;
        this.currentSize = this.options.initialSize;
        this.leaves = [];
        this.particles = [];
        this.init();
    }

    /**
     * الحصول على معلومات الشجرة
     */
    getTreeInfo() {
        return {
            progress: this.progress,
            size: this.currentSize,
            leafCount: this.leaves.filter(l => l.style.opacity !== '0').length,
            particleCount: this.particles.length,
            stage: this.updateTreeStage().stage
        };
    }

    /**
     * حفظ حالة الشجرة
     */
    saveState() {
        const state = {
            progress: this.progress,
            currentSize: this.currentSize,
            options: this.options,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('savingsTreeState', JSON.stringify(state));
        return state;
    }

    /**
     * تحميل حالة الشجرة
     */
    loadState() {
        const savedState = localStorage.getItem('savingsTreeState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.progress = state.progress;
                this.currentSize = state.currentSize;
                this.update(this.progress);
                return true;
            } catch (error) {
                console.error('❌ خطأ في تحميل حالة الشجرة:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * دالة التسهيل (easing)
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * إضافة حدث للنقر على الشجرة
     */
    addClickListener(handler) {
        this.treeElement.addEventListener('click', (event) => {
            const rect = this.treeElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            handler({ x, y, progress: this.progress });
        });
    }

    /**
     * إضافة تأثير خاص
     */
    addSpecialEffect(effectType) {
        switch (effectType) {
            case 'sparkle':
                this.addSparkleEffect();
                break;
            case 'rain':
                this.addRainEffect();
                break;
            case 'celebration':
                this.addCelebrationEffect();
                break;
            default:
                console.warn(`⚠️ تأثير غير معروف: ${effectType}`);
        }
    }

    /**
     * تأثير البريق
     */
    addSparkleEffect() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.addParticle();
            }, i * 50);
        }
    }

    /**
     * تأثير المطر
     */
    addRainEffect() {
        // إنشاء قطرات مطر
        for (let i = 0; i < 30; i++) {
            const drop = document.createElement('div');
            drop.style.cssText = `
                position: absolute;
                width: 2px;
                height: 15px;
                background: linear-gradient(to bottom, transparent, #3B82F6);
                top: -20px;
                left: ${Math.random() * 100}%;
                animation: rainFall 1s linear forwards;
                z-index: 4;
            `;

            // إضافة أنيميشن المطر
            const style = document.createElement('style');
            style.textContent = `
                @keyframes rainFall {
                    to {
                        top: 100%;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);

            this.particlesContainer.appendChild(drop);
            
            // إزالة القطرة بعد الأنيميشن
            setTimeout(() => {
                if (drop.parentNode) {
                    drop.remove();
                }
            }, 1000);
        }
    }

    /**
     * تأثير الاحتفال
     */
    addCelebrationEffect() {
        // إضافة confetti
        const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 5 + Math.random() * 10;
            const rotation = Math.random() * 360;
            
            confetti.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(${rotation}deg);
                animation: confettiFly 2s ease-out forwards;
                z-index: 5;
            `;

            // إضافة أنيميشن confetti
            const style = document.createElement('style');
            style.textContent = `
                @keyframes confettiFly {
                    0% {
                        transform: translate(-50%, -50%) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(
                            ${Math.random() * 200 - 100}px, 
                            ${Math.random() * 200 + 100}px
                        ) rotate(${rotation + 720}deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);

            this.particlesContainer.appendChild(confetti);
            
            // إزالة confetti بعد الأنيميشن
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            }, 2000);
        }
    }

    /**
     * تدمير الشجرة (تنظيف الذاكرة)
     */
    destroy() {
        this.stopAnimation();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.leaves = [];
        this.particles = [];
        
        console.log('🗑️ تم تدمير شجرة التوفير');
    }
}

// إنشاء نسخة عامة من الشجرة
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SavingsTree;
} else {
    window.SavingsTree = SavingsTree;
}

// تهيئة تلقائية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // البحث عن عنصر الشجرة في الصفحة
    const treeContainer = document.getElementById('savings-tree');
    if (treeContainer) {
        // إنشاء شجرة جديدة
        const tree = new SavingsTree('savings-tree');
        
        // محاولة تحميل الحالة المحفوظة
        tree.loadState();
        
        // حفظ الشجرة في المتغير العام
        window.savingsTree = tree;
        
        // إضافة حدث للحفظ التلقائي
        window.addEventListener('beforeunload', () => {
            tree.saveState();
        });
        
        // إضافة حدث النقر على الشجرة
        tree.addClickListener((data) => {
            console.log('🌳 تم النقر على الشجرة:', data);
            
            // إضافة تأثير عند النقر
            tree.addSpecialEffect('sparkle');
            
            // إرسال إشعار
            if (window.notifications) {
                window.notifications.sendCustomNotification(
                    '🌳 شجرة توفيرك',
                    'شجرتك تنمو بفضل توفيرك المستمر!',
                    1
                );
            }
        });
    }
});