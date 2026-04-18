//! === 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИКОНКИ ===
const style_container = document.querySelector('.style-container');
const navDotsContainer = document.querySelector('.navigation-dots');
const styleLabel = document.getElementById('music_styles_label');
const textElement = document.getElementById('msl_style_text');
const button = document.getElementById('button_for_music');
const audio = document.getElementById('source_reproductions');
const iconSvg = document.querySelector('.play-icon');
const volumeSlider = document.getElementById('volume_slider');
const volumeContainer = document.querySelector('.volume-control-pc');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const playIcon = `<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>`;
const pauseIcon = `<path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z"/>`;

let currentIndex = 1; 
let startPos = 0;
let currentTranslate = currentIndex * -window.innerWidth;
let prevTranslate = currentTranslate;
let isDragging = false;
let isPlaying = false;
let playingSlideIndex = -1;
let startTime = 0;

let ms_slides = [];
let dots = [];
let activeStations = [];

//! === 2. БАЗА ДАННЫХ СТАНЦИЙ ===
const masterStations = [
    { id: 'check_chill', name: 'LOFI CHILL', bgClass: 'img-lofi-chill', audio: 'http://usa9.fastcast4u.com/proxy/jamz?mp=/1' },
    { id: 'check_lofi_focus', name: 'LOFI FOCUS', bgClass: 'img-lofi-focus', audio: '' },
    { id: 'check_lofi_gameing', name: 'LOFI GAMEING', bgClass: 'img-lofi-gameing', audio: '' },   
    { id: 'check_phonk', name: 'PHONK', bgClass: 'img-phonk', audio: '' },
    { id: 'check_hiphop', name: 'LOFI HIP-HOP', bgClass: 'img-lofi-hip-hop', audio: '' },
    { id: 'check_fantasy', name: 'LOFI FANTASY', bgClass: 'img-lofi-fantasy', audio: '' },
    { id: 'check_cyberpunk', name: 'CYBERPUNK', bgClass: 'img-cyberpunk', audio: '' },
    { id: 'check_witcher_orig', name: 'The Witcher: Original relax', bgClass: 'img-the-witcher-original-relax', audio: '' },
    { id: 'check_witcher_lofi', name: 'The Witcher: LOFI REMIX', bgClass: 'img-the-witcher-lofi-remix', audio: '' }
];

//! === 3. ЛОГИКА ГЕНЕРАЦИИ ПЛЕЙЛИСТА ===
function buildPlaylist(e) {
    let checkedBoxes = masterStations.filter(station => {
        const cb = document.getElementById(station.id);
        return cb && cb.checked;
    });

    if (checkedBoxes.length === 0 && e && e.target) {
        e.target.checked = true; 
        return; 
    }

    if (checkedBoxes.length === 0) {
        const firstCb = document.getElementById(masterStations[0].id);
        if (firstCb) firstCb.checked = true;
        checkedBoxes = [masterStations[0]];
    }

    activeStations = checkedBoxes;

    masterStations.forEach(station => {
        const cb = document.getElementById(station.id);
        if (cb) {
            cb.disabled = (activeStations.length === 1 && cb.checked);
        }
    });

    const allSlides = Array.from(style_container.children);
    allSlides.forEach(slide => {
        if (!slide.classList.contains('info-content-block') && !slide.querySelector('.info-content-block')) {
            if (slide.classList.contains('ms-slides')) {
                slide.remove();
            }
        }
    });
    navDotsContainer.innerHTML = '';

    activeStations.forEach((station) => {
        const slide = document.createElement('div');
        slide.className = `ms-slides ${station.bgClass}`;
        style_container.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = 'dot';
        navDotsContainer.appendChild(dot);
    });

    ms_slides = document.querySelectorAll('.ms-slides');
    dots = document.querySelectorAll('.dot');

    ms_slides.forEach((slide) => {
ms_slides.forEach((slide) => {
        slide.addEventListener('touchstart', touchStart, { passive: false });
        slide.addEventListener('touchmove', touchMove, { passive: false });
        slide.addEventListener('touchend', touchEnd);
        slide.addEventListener('mousedown', touchStart);
    });
    });

    if (currentIndex >= ms_slides.length) {
        currentIndex = 1;
        if(audio) audio.pause();
        isPlaying = false;
        playingSlideIndex = -1;
    }

    currentTranslate = currentIndex * -window.innerWidth;
    prevTranslate = currentTranslate;
    style_container.style.transition = 'none';
    setSliderPosition();
    updateUI(currentIndex);
}

//! === 4. UI И СВАЙПЫ ===
function updateUI(index) {
    const buttonContainer = document.querySelector('.button-for-music-container');
    
    if (index === 0) {
        if (styleLabel) styleLabel.style.opacity = '0';
        if (buttonContainer) {
            buttonContainer.style.opacity = '0';
            buttonContainer.style.pointerEvents = 'none';
        }
        if (navDotsContainer) navDotsContainer.style.opacity = '0';
        if (volumeContainer) {
            if (isMobile) volumeContainer.style.display = 'none';
            else { volumeContainer.style.opacity = '0'; volumeContainer.style.pointerEvents = 'none'; }
        }
    } else {
        if (styleLabel) styleLabel.style.opacity = '1';
        if (buttonContainer) {
            buttonContainer.style.opacity = '1';
            buttonContainer.style.pointerEvents = 'auto';
        }
        if (navDotsContainer) navDotsContainer.style.opacity = '1';
        if (volumeContainer) {
            if (isMobile) volumeContainer.style.display = 'none';
            else { volumeContainer.style.opacity = '1'; volumeContainer.style.pointerEvents = 'auto'; }
        }

        if (textElement && activeStations[index - 1]) {
            textElement.textContent = activeStations[index - 1].name;
        }
    }

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === (index - 1));
    });

    if (iconSvg) iconSvg.innerHTML = (isPlaying && index === playingSlideIndex) ? pauseIcon : playIcon;
}

let animationID; // Синхронизация кадров

function setSliderPosition() {
    // translate3d переносит отрисовку на видеокарту телефона
    style_container.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
}

function touchStart(event) {
    startPos = event.type.includes('mouse') ? event.clientX : event.touches[0].clientX;
    isDragging = true;
    startTime = new Date().getTime();
    style_container.style.transition = 'none';
    if (animationID) cancelAnimationFrame(animationID);
}

function touchMove(event) {
    if (!isDragging) return;
    
    // САМОЕ ВАЖНОЕ: отключаем стандартные подергивания браузера при свайпе
    if (event.type.includes('touch') && event.cancelable) {
        event.preventDefault(); 
    }

    const currentPosition = event.type.includes('mouse') ? event.clientX : event.touches[0].clientX;
    currentTranslate = prevTranslate + currentPosition - startPos;
    
    // requestAnimationFrame делает анимацию масляной (60 кадров в секунду)
    if (animationID) cancelAnimationFrame(animationID);
    animationID = requestAnimationFrame(setSliderPosition);
}

function touchEnd() {
    if (!isDragging) return;
    isDragging = false;
    
    if (animationID) cancelAnimationFrame(animationID);
    
    const movedBy = currentTranslate - prevTranslate;
    const timeElapsed = new Date().getTime() - startTime;
    const isFastSwipe = timeElapsed < 300 && Math.abs(movedBy) > 30;

    if ((movedBy < -100 || (isFastSwipe && movedBy < 0)) && currentIndex < ms_slides.length - 1) {
        currentIndex += 1;
    } else if ((movedBy > 100 || (isFastSwipe && movedBy > 0)) && currentIndex > 0) {
        currentIndex -= 1;
    }

    currentTranslate = currentIndex * -window.innerWidth;
    prevTranslate = currentTranslate;
    
    // Возвращаем плавный переход с GPU-ускорением
    style_container.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
    setSliderPosition();
    updateUI(currentIndex);
}

window.addEventListener('mousemove', touchMove);
window.addEventListener('mouseup', touchEnd);

//! === 5. ПЛЕЕР И КНОПКИ ===
if (button && audio) {
    button.addEventListener('click', () => {
        if (currentIndex === playingSlideIndex) {
            if (audio.paused) {
                audio.play();
                isPlaying = true;
            } else {
                audio.pause();
                isPlaying = false;
            }
        } else {
            const activeStation = activeStations[currentIndex - 1];
            if (activeStation && activeStation.audio !== "") {
                audio.src = activeStation.audio;
                audio.play();
                playingSlideIndex = currentIndex;
                isPlaying = true;
            }
        }
        updateUI(currentIndex);
    });
}

if (audio && volumeSlider) {
    audio.volume = volumeSlider.value;
    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value;
    });
}

//! === 6. МОДАЛЬНОЕ ОКНО TRACKLIST ===
const tracklistBtn = document.getElementById('info_tracklist_button');
const tracklistModal = document.getElementById('tracklist_modal');
const closeModalBtn = document.getElementById('close_modal_btn');

if (tracklistBtn && tracklistModal && closeModalBtn) {
    tracklistBtn.addEventListener('click', () => tracklistModal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => tracklistModal.classList.remove('active'));
    tracklistModal.addEventListener('click', (e) => {
        if (e.target === tracklistModal) tracklistModal.classList.remove('active');
    });
}

masterStations.forEach(station => {
    const checkbox = document.getElementById(station.id);
    if (checkbox) checkbox.addEventListener('change', buildPlaylist);
});

buildPlaylist();

window.addEventListener('resize', () => {
    // Пересчитываем координаты под новую ширину окна
    currentTranslate = currentIndex * -window.innerWidth;
    prevTranslate = currentTranslate;
    
    // Моментально ставим активный слайд по центру, без плавной анимации
    style_container.style.transition = 'none';
    style_container.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
});
