// 오디오 관리 모듈

/**
 * 오디오 시스템 초기화
 */
export function initializeAudio() {
    console.log('🔊 오디오 시스템 초기화...');

    // 전역 변수 초기화 (window 객체를 single source of truth로 사용)
    window.isAudioEnabled = false;
    window.isMusicPlaying = false;

    // 앱 생명주기 관리 (백그라운드/포그라운드)
    setupVisibilityListener();

    // 버튼 이벤트 리스너 명시적 연결 (HTML onclick 보완)
    const toggleBtn = document.getElementById('audioToggleButton');
    if (toggleBtn) {
        toggleBtn.onclick = (e) => {
            e.preventDefault();
            toggleAllAudio();
        };
    }
}

/**
 * 전체 오디오 토글
 */
export function toggleAllAudio() {
    window.isAudioEnabled = !window.isAudioEnabled;

    const audioOnIcon = document.getElementById('audioOnIcon');
    const audioOffIcon = document.getElementById('audioOffIcon');
    const audioToggleButton = document.getElementById('audioToggleButton');

    if (window.isAudioEnabled) {
        // 사운드 켜기
        audioOnIcon.style.display = 'block';
        audioOffIcon.style.display = 'none';
        audioToggleButton.classList.remove('disabled');
        audioToggleButton.setAttribute('aria-checked', 'true'); // A11y
        console.log('🔊 All audio enabled');
    } else {
        // 사운드 끄기 - 모든 오디오 정지
        audioOnIcon.style.display = 'none';
        audioOffIcon.style.display = 'block';
        audioToggleButton.classList.add('disabled');
        audioToggleButton.setAttribute('aria-checked', 'false'); // A11y

        // 배경음악이 재생 중이면 정지
        const bgMusic = document.getElementById('bgMusic');
        if (bgMusic && window.isMusicPlaying) {
            bgMusic.pause();
            const powerButton = document.getElementById('powerButton');
            const ledIndicator = document.getElementById('ledIndicator');
            const soundWaves = document.getElementById('soundWaves');
            powerButton.classList.remove('active');
            ledIndicator.classList.remove('active');
            soundWaves.classList.remove('active');
            window.isMusicPlaying = false;
        }

        console.log('🔇 All audio disabled');
    }
}

/**
 * 배경 음악 토글 (UX 개선: 자동으로 오디오 활성화)
 */
export function toggleMusic() {
    const bgMusic = document.getElementById('bgMusic');
    const bgMusicSrc = document.getElementById('bgMusicSrc');
    const powerButton = document.getElementById('powerButton');
    const ledIndicator = document.getElementById('ledIndicator');
    const soundWaves = document.getElementById('soundWaves');

    if (!bgMusic) return;

    if (window.isMusicPlaying) {
        // 음악 끄기
        bgMusic.pause();
        powerButton.classList.remove('active');
        ledIndicator.classList.remove('active');
        soundWaves.classList.remove('active');
        window.isMusicPlaying = false;
    } else {
        // 전체 사운드가 꺼져있으면 재생하지 않고 알림 표시
        if (!window.isAudioEnabled) {
            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert('상단의 사운드 버튼을 먼저 켜주세요!');
            } else {
                alert('상단의 사운드 버튼을 먼저 켜주세요!');
            }
            return;
        }

        // 시각적 효과 먼저 활성화
        powerButton.classList.add('active');
        ledIndicator.classList.add('active');
        soundWaves.classList.add('active');
        window.isMusicPlaying = true;

        // 음악 재생 시도
        if (bgMusicSrc && bgMusicSrc.src) {
            bgMusic.play()
                .then(() => console.log('배경음 재생 시작'))
                .catch(error => console.warn('음악 재생 실패:', error));
        }
    }
}

/**
 * 사운드 재생 헬퍼 함수
 */
export function playSound(audioElement) {
    if (!window.isAudioEnabled) {
        console.log('⚠️ Audio is disabled');
        return Promise.resolve();
    }
    if (audioElement && typeof audioElement.play === 'function') {
        return audioElement.play().catch(err => {
            console.warn('Audio play failed:', err);
        });
    }
    return Promise.resolve();
}

/**
 * 가시성 변경 리스너 설정
 */
function setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
        const bgMusic = document.getElementById('bgMusic');
        const scanSound = document.getElementById('scanSound');
        const gameStartSound = document.getElementById('gameStartSound');
        const gameEndSound = document.getElementById('gameEndSound');
        const failSound = document.getElementById('failSound');

        if (document.hidden) {
            // 앱이 백그라운드로 갔을 때 - 모든 오디오 일시정지
            window.wasMusicPlaying = bgMusic && !bgMusic.paused;

            if (bgMusic) bgMusic.pause();
            if (scanSound) scanSound.pause();
            if (gameStartSound) gameStartSound.pause();
            if (gameEndSound) gameEndSound.pause();
            if (failSound) failSound.pause();

            console.log('앱 백그라운드 - 모든 오디오 일시정지');
        } else {
            console.log('앱 포그라운드 복귀');

            // 배경음악이 재생 중이었다면 다시 재생
            if (window.wasMusicPlaying && window.isMusicPlaying && bgMusic) {
                bgMusic.play()
                    .then(() => console.log('배경음악 자동 재개'))
                    .catch(error => console.warn('배경음악 재개 실패:', error));
            }
        }
    });
}

// 전역 함수로 내보내기 (HTML에서 호출용)
window.toggleAllAudio = toggleAllAudio;
window.toggleMusic = toggleMusic;
