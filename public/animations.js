// ==================== ANIMACIONES ====================

class AnimationManager {
    constructor() {
        this.animationSpeed = 0.3;
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
    }

    animateElementIn(element, delay = 0) {
        element.style.animation = `slideInUp 0.6s ease-out ${delay}s forwards`;
        element.style.opacity = '0';
    }

    fadeIn(element, duration = 0.5) {
        element.style.animation = `fadeIn ${duration}s ease-in forwards`;
        element.style.opacity = '0';
    }

    bounce(element) {
        element.style.animation = 'bounce 0.6s ease-in-out';
    }

    pulse(element, duration = 1) {
        element.style.animation = `pulse ${duration}s ease-in-out infinite`;
    }

    removeAnimation(element) {
        element.style.animation = '';
        element.style.opacity = '1';
    }

    smoothScroll(target, duration = 1000) {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return;

        const startPosition = window.scrollY;
        const endPosition = element.offsetTop - 100;
        const distance = endPosition - startPosition;
        let start = null;

        const animation = (currentTime) => {
            if (start === null) start = currentTime;
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            window.scrollBy(0, distance * progress - (distance * (start === null ? 0 : 1)));
            
            if (elapsed < duration) {
                requestAnimationFrame(animation);
            }
        };

        requestAnimationFrame(animation);
    }

    animateNumber(element, target, duration = 1500) {
        const increment = target / (duration / 16);
        let current = 0;

        const counter = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(counter);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }

    addRippleEffect(element) {
        element.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            const ripple = document.createElement('span');
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    }

    animateTableRows(tableSelector) {
        const rows = document.querySelectorAll(tableSelector + ' tbody tr');
        rows.forEach((row, index) => {
            row.style.animation = `slideInUp 0.5s ease-out ${index * 0.1}s forwards`;
            row.style.opacity = '0';
        });
    }

    animateCards(selector) {
        const cards = document.querySelectorAll(selector);
        cards.forEach((card, index) => {
            card.style.animation = `scaleIn 0.5s ease-out ${index * 0.15}s forwards`;
            card.style.opacity = '0';
            card.style.transformOrigin = 'center';
        });
    }

    addHoverEffect(element) {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'translateY(-3px)';
            element.style.boxShadow = '0 8px 20px rgba(33, 146, 184, 0.3)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        });
    }

    animateFormInputs() {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach((input, index) => {
            input.addEventListener('focus', () => {
                input.style.transform = 'scale(1.01)';
            });
            input.addEventListener('blur', () => {
                input.style.transform = 'scale(1)';
            });
        });
    }

    showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    animateModalIn(modal) {
        modal.style.animation = 'fadeInModal 0.3s ease-out forwards';
    }

    animateModalOut(modal) {
        modal.style.animation = 'fadeOutModal 0.3s ease-out forwards';
        setTimeout(() => {
            modal.classList.remove('show');
        }, 300);
    }

    showProgressBar(element, percentage, duration = 1000) {
        const start = 0;
        const end = percentage;
        const range = end - start;
        const increment = end / (duration / 16);
        let current = start;

        const progress = setInterval(() => {
            current += increment;
            if (current >= end) {
                element.style.width = end + '%';
                clearInterval(progress);
            } else {
                element.style.width = current + '%';
            }
        }, 16);
    }

    createSkeletonLoader(parent, count = 3) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-loader';
        
        for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            item.className = 'skeleton-item';
            item.style.animation = `pulse 1.5s ease-in-out ${i * 0.2}s infinite`;
            skeleton.appendChild(item);
        }
        
        parent.appendChild(skeleton);
        return skeleton;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const animationMgr = window.animationManager = new AnimationManager();

    addAnimationStyles();

    const header = document.querySelector('.header');
    if (header) animationMgr.fadeIn(header, 0.5);

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.animation = 'slideInLeft 0.6s ease-out';
    }

    document.querySelectorAll('.btn-primary, .btn-secondary, .btn-edit, .btn-danger').forEach(btn => {
        animationMgr.addRippleEffect(btn);
        animationMgr.addHoverEffect(btn);
    });

    animationMgr.animateFormInputs();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('form-section')) {
                    entry.target.style.animation = 'slideInUp 0.6s ease-out forwards';
                }
                observer.unobserve(entry.target);
            }
        });
    }, animationMgr.observerOptions);

    document.querySelectorAll('.form-section').forEach(section => {
        section.style.opacity = '0';
        observer.observe(section);
    });
});

function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideInLeft {
            from {
                opacity: 0;
                transform: translateX(-50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes fadeInModal {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes fadeOutModal {
            from {
                opacity: 1;
                transform: scale(1);
            }
            to {
                opacity: 0;
                transform: scale(0.95);
            }
        }

        @keyframes bounce {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-10px);
            }
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }

        @keyframes scaleIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: rippleAnimation 0.6s ease-out;
            pointer-events: none;
        }

        @keyframes rippleAnimation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(100px);
            transition: all 0.3s ease;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        .toast-success {
            border-left: 4px solid #4CAF50;
            color: #4CAF50;
        }

        .toast-error {
            border-left: 4px solid #f44336;
            color: #f44336;
        }

        .toast-info {
            border-left: 4px solid #2192B8;
            color: #2192B8;
        }

        .toast i {
            font-size: 18px;
        }

        .skeleton-loader {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .skeleton-item {
            height: 12px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            border-radius: 4px;
        }

        * {
            transition: all 0.3s ease;
        }

        button, a {
            position: relative;
            overflow: hidden;
        }

        button:focus-visible {
            outline: 2px solid #2192B8;
            outline-offset: 2px;
        }

        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible {
            outline: none;
        }

        html {
            scroll-behavior: smooth;
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid #2192B8;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    `;
    document.head.appendChild(style);
}

function showNotification(message, type = 'success') {
    if (window.animationManager) {
        window.animationManager.showToast(message, type);
    }
}

window.AnimationManager = AnimationManager;
window.showNotification = showNotification;
