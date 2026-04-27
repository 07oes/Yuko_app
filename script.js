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

let viewportWidth = window.innerWidth;
let currentIndex = 1; 
let startPos = 0;
let currentTranslate = currentIndex * -viewportWidth;
let prevTranslate = currentTranslate;
let isDragging = false;
let isPlaying = false;
let playingSlideIndex = -1;
let startTime = 0;
let lastPreloadedIndex = -1;

let ms_slides = [];
let dots = [];
let activeStations = [];

//! === 2. БАЗА ДАННЫХ СТАНЦИЙ ===
// Функция для автоматической генерации ссылок на треки из Cloudflare R2
function generateCloudflareUrls(baseUrl, folder, prefix, count, extension = '.mp3') {
    const urls = [];
    for (let i = 1; i <= count; i++) {
        // Добавляем нули спереди (001, 002... 010...)
        const paddedNumber = String(i).padStart(3, '0');
        // Кодируем пробелы в %20 для URL
        const encodedFolder = encodeURIComponent(folder);
        const encodedPrefix = encodeURIComponent(prefix);
        urls.push(`${baseUrl}/${encodedFolder}/${encodedPrefix}${paddedNumber}${extension}`);
    }
    return urls;
}

const CF_BASE_URL = 'https://pub-cefcacd7b279473ba737580dc2ba50d9.r2.dev';

const masterStations = [
    { 
        id: 'check_lofi_chill', name: 'LOFI CHILL', bgClass: 'img-lofi-chill', 
        audio: generateCloudflareUrls(CF_BASE_URL, 'LOFI CHILL', 'ms-lofi chill ', 17)
    },
    { 
        id: 'check_lofi_hip-hop', name: 'LOFI HIP-HOP', bgClass: 'img-lofi-hip-hop', 
        audio: generateCloudflareUrls(CF_BASE_URL, 'LOFI HIP-HOP', 'ms-lofi hip-hop ', 10)
    },
    { 
        id: 'check_phonk', name: 'PHONK', bgClass: 'img-phonk', 
        audio: generateCloudflareUrls(CF_BASE_URL, 'PHONK', 'ms-phonk ', 16)
    },
    { 
        id: 'check_cyberpunk', name: 'CYBERPUNK', bgClass: 'img-cyberpunk', 
        audio: generateCloudflareUrls(CF_BASE_URL, 'CYBERPUNK', 'ms-cyberpunk ', 7)
    },
    { 
    id: 'check_the_witcher_original_relax', name: 'THE WITCHER RELAX', bgClass: 'img-the-witcher-original-relax', 
    audio: generateCloudflareUrls(CF_BASE_URL, 'The Witcher: Original relax', 'ms-the-witcher-original-relax ', 24)
    },
    { 
        id: 'check_witcher_lofi', name: 'THE WITCHER LOFI REMIX', bgClass: 'img-the-witcher-lofi-remix', 
        audio: generateCloudflareUrls(CF_BASE_URL, 'The Witcher: LOFI REMIX', 'ms-the-witcher-lofi-remix ', 3)
    }
    ];

// Оптимизация: вешаем события один раз на контейнер (Делегирование)
style_container.addEventListener('touchstart', touchStart, { passive: false });
style_container.addEventListener('touchmove', touchMove, { passive: false });
style_container.addEventListener('touchend', touchEnd);
style_container.addEventListener('mousedown', touchStart);

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
        slide.className = `ms-slides`; // Убираем немедленное назначение класса фона
        slide.dataset.bg = station.bgClass; // Сохраняем имя класса в атрибут
        style_container.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = 'dot';
        navDotsContainer.appendChild(dot);
    });

    ms_slides = document.querySelectorAll('.ms-slides');
    dots = document.querySelectorAll('.dot');

    // Проверка границ: всего слайдов = ms_slides.length + 1 (инфо)
    if (currentIndex >= style_container.children.length) {
        currentIndex = 1;
        if(audio) audio.pause();
        isPlaying = false;
        playingSlideIndex = -1;
    }

    currentTranslate = currentIndex * -viewportWidth;
    prevTranslate = currentTranslate;
    style_container.style.transition = 'none';
    setSliderPosition();
    updateUI(currentIndex);
}

//! === 4. UI И СВАЙПЫ ===
function updateUI(index) {
    const buttonContainer = document.querySelector('.button-for-music-container');
    
    if (index === 0) {
        if (styleLabel) {
            styleLabel.style.opacity = '0';
            styleLabel.style.pointerEvents = 'none';
        }
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
        if (styleLabel) {
            styleLabel.style.opacity = '1';
            styleLabel.style.pointerEvents = 'auto';
        }
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

    manageBackgrounds(index);

    if (iconSvg) iconSvg.innerHTML = (isPlaying && index === playingSlideIndex) ? pauseIcon : playIcon;
}

// Выносим логику фонов в отдельную функцию для переиспользования
function manageBackgrounds(index) {
    ms_slides.forEach((slide, i) => {
        const slideUIIndex = i + 1;
        // Загружаем текущий и ДВА соседних слайда (дистанция 2)
        if (Math.abs(slideUIIndex - index) <= 2) {
            slide.classList.add(slide.dataset.bg);
        } else {
            slide.classList.remove(slide.dataset.bg);
        }
    });
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
    
    // ОПТИМИЗИРОВАННАЯ ПРЕДЗАГРУЗКА
    const direction = (currentPosition - startPos) < 0 ? 1 : -1;
    const totalSlides = style_container.children.length;
    const targetIndex = Math.max(0, Math.min(currentIndex + direction, totalSlides - 1));
    
    if (targetIndex !== lastPreloadedIndex) {
        manageBackgrounds(targetIndex);
        lastPreloadedIndex = targetIndex;
    }

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
    const totalSlides = style_container.children.length;

    if ((movedBy < -100 || (isFastSwipe && movedBy < 0)) && currentIndex < totalSlides - 1) {
        currentIndex += 1;
    } else if ((movedBy > 100 || (isFastSwipe && movedBy > 0)) && currentIndex > 0) {
        currentIndex -= 1;
    }

    currentTranslate = currentIndex * -viewportWidth;
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
                audio.play().catch(e => console.log("Audio play blocked"));
                isPlaying = true;
            } else {
                audio.pause();
                isPlaying = false;
            }
        } else {
            const activeStation = activeStations[currentIndex - 1];
            if (activeStation && activeStation.audio && activeStation.audio.length > 0) {
                // СБРОС БУФЕРА: Очищаем старый поток перед загрузкой нового
                audio.pause();
                audio.src = ''; 
                audio.load();

                const randomIndex = Math.floor(Math.random() * activeStation.audio.length);
                audio.src = activeStation.audio[randomIndex];
                audio.play().catch(e => console.log("Audio play blocked"));
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

// Автоматическое переключение треков и обработка ошибок (если трека нет)
if (audio) {
    const playNextTrack = () => {
        if (playingSlideIndex !== -1) {
            const activeStation = activeStations[playingSlideIndex - 1];
            if (activeStation && activeStation.audio && activeStation.audio.length > 0) {
                audio.pause();
                audio.src = ''; 
                audio.load();

                const randomIndex = Math.floor(Math.random() * activeStation.audio.length);
                audio.src = activeStation.audio[randomIndex];
                audio.play().catch(e => console.log("Audio play blocked"));
            }
        }
    };

    audio.addEventListener('ended', playNextTrack);
    audio.addEventListener('error', () => {
        console.warn("Track failed to load, playing next...");
        playNextTrack();
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

//! === 7. МОДАЛЬНОЕ ОКНО ДОПОЛНИТЕЛЬНЫХ ФУНКЦИЙ ===
const additionalBtn = document.querySelector('.button-additional-functions');
const additionalModal = document.getElementById('additional_functions_modal');
const closeAdditionalBtn = document.getElementById('close_additional_btn');

if (additionalBtn && additionalModal) {
    additionalBtn.addEventListener('click', () => additionalModal.classList.add('active'));
    if (closeAdditionalBtn) {
        closeAdditionalBtn.addEventListener('click', () => additionalModal.classList.remove('active'));
    }
    additionalModal.addEventListener('click', (e) => {
        if (e.target === additionalModal) additionalModal.classList.remove('active');
    });
}

masterStations.forEach(station => {
    const checkbox = document.getElementById(station.id);
    if (checkbox) checkbox.addEventListener('change', buildPlaylist);
});

buildPlaylist();

window.addEventListener('resize', () => {
    viewportWidth = window.innerWidth;
    // Пересчитываем координаты
    currentTranslate = currentIndex * -viewportWidth;
    prevTranslate = currentTranslate;
    
    // Моментально ставим активный слайд по центру, без плавной анимации
    style_container.style.transition = 'none';
    style_container.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
});

//! === 8. СМЕНА СТИЛЯ КНОПКИ PLAY ===
const playStyleBtns = document.querySelectorAll('.btn-play-style');
const buttonForMusic = document.getElementById('button_for_music');

if (playStyleBtns.length > 0 && buttonForMusic) {
    playStyleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем active у всех кнопок
            playStyleBtns.forEach(b => b.classList.remove('active'));
            // Добавляем active нажатой
            btn.classList.add('active');

            // Получаем выбранный стиль
            const selectedStyle = btn.getAttribute('data-style');

            const volumeControl = document.querySelector('.volume-control-pc');

            // Очищаем текущие стили (кроме базовых классов, если они есть, но у нас их нет, только id)
            // Надежнее просто удалить известные классы
            buttonForMusic.classList.remove('style-dark', 'style-neon');
            if (volumeControl) {
                volumeControl.classList.remove('style-dark', 'style-neon');
            }
        

            // Если не дефолтный, добавляем новый класс
            if (selectedStyle !== 'default') {
                buttonForMusic.classList.add(selectedStyle);
                if (volumeControl) {
                    volumeControl.classList.add(selectedStyle);
                }
            }
        });
    });
}

//! === 9. СМЕНА СТИЛЯ ТЕКСТА ===
const textStyleBtns = document.querySelectorAll('.btn-text-style');

if (textStyleBtns.length > 0 && textElement) {
    textStyleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем active у всех кнопок
            textStyleBtns.forEach(b => b.classList.remove('active'));
            // Добавляем active нажатой
            btn.classList.add('active');

            // Получаем выбранный стиль
            const selectedStyle = btn.getAttribute('data-style');

            // Очищаем текущие стили
            textElement.classList.remove('text-style-neon', 'text-style-radio');

            // Если не дефолтный, добавляем новый класс
            if (selectedStyle !== 'default') {
                textElement.classList.add(selectedStyle);
            }
        });
    });
}
