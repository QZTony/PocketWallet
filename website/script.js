// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards and security items
document.querySelectorAll('.feature-card, .security-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// 3D Coverflow functionality
const coverflowItems = document.querySelectorAll('.coverflow-item');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');
const dotsContainer = document.querySelector('.carousel-dots');

let currentIndex = 3; // Start with middle item
const totalItems = coverflowItems.length;

// Create dots
for (let i = 0; i < totalItems; i++) {
    const dot = document.createElement('div');
    dot.classList.add('carousel-dot');
    if (i === currentIndex) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
}

const dots = document.querySelectorAll('.carousel-dot');

function updateCoverflow() {
    coverflowItems.forEach((item, index) => {
        const offset = index - currentIndex;

        // Remove active class from all
        item.classList.remove('active');

        if (offset === 0) {
            // Center item (active)
            item.classList.add('active');
            item.style.transform = 'translateX(0) translateZ(0) rotateY(0deg) scale(1.2)';
            item.style.zIndex = 10;
        } else if (offset < 0) {
            // Left side items
            const distance = Math.abs(offset);
            item.style.transform = `translateX(${offset * 200 - 100}px) translateZ(-${distance * 150}px) rotateY(45deg) scale(${1 - distance * 0.15})`;
            item.style.zIndex = 10 - distance;
        } else {
            // Right side items
            const distance = offset;
            item.style.transform = `translateX(${offset * 200 + 100}px) translateZ(-${distance * 150}px) rotateY(-45deg) scale(${1 - distance * 0.15})`;
            item.style.zIndex = 10 - distance;
        }
    });

    // Update dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });
}

function goToSlide(index) {
    currentIndex = index;
    updateCoverflow();
}

function nextSlide() {
    currentIndex = (currentIndex + 1) % totalItems;
    updateCoverflow();
}

function prevSlide() {
    currentIndex = (currentIndex - 1 + totalItems) % totalItems;
    updateCoverflow();
}

nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

// Click on item to bring it to center
coverflowItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        if (index !== currentIndex) {
            goToSlide(index);
        }
    });
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevSlide();
    } else if (e.key === 'ArrowRight') {
        nextSlide();
    }
});

// Auto-rotate
let autoRotateInterval = setInterval(nextSlide, 3500);

// Pause on hover
const coverflowContainer = document.querySelector('.coverflow-container');
coverflowContainer.addEventListener('mouseenter', () => {
    clearInterval(autoRotateInterval);
});

coverflowContainer.addEventListener('mouseleave', () => {
    autoRotateInterval = setInterval(nextSlide, 3500);
});

// Initialize
updateCoverflow();