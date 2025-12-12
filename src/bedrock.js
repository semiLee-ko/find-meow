// Bedrock SDK 초기화 및 앱 설정
import { config } from './config.js';
import { resetGame } from './game.js';

let isBedrockInitialized = false;

/**
 * Bedrock SDK 초기화
 */
export async function initializeBedrock() {
    if (isBedrockInitialized) {
        console.log('Bedrock already initialized');
        return;
    }

    // [DEBUG] 환경 진단 로그 (화면 출력)
    console.log('--- Environment Check ---');
    console.log('UA:', navigator.userAgent);
    console.log('Bedrock:', !!window.Bedrock);
    console.log('Toss:', !!window.Toss);
    console.log('BedrockNative:', !!window.BedrockNative);
    console.log('Location:', document.location.href);
    console.log('-------------------------');

    // 로컬 개발 환경을 위한 Mock SDK 설정
    if (!window.Bedrock) {
        console.warn('⚠️ Bedrock SDK not found. Initializing Mock SDK for development.');
        setupMockBedrock();
    }

    try {
        const { Bedrock } = window;

        // Bedrock 초기화
        await Bedrock.init({
            appKey: config.APPENTOS_APP_KEY,
            env: config.ENV
        });

        console.log('✅ Bedrock initialized successfully');
        isBedrockInitialized = true;

        // 내비게이션 바 설정
        setupNavigationBar();

        // 오디오 포커스 감지 설정
        setupAudioFocusListener();

    } catch (error) {
        console.error('❌ Bedrock initialization failed:', error);
        console.warn('Running in development mode with limited Bedrock features');
    }
}

// 전역 함수로 내보내기
window.resetGame = resetGame;
window.showExitConfirmation = showExitConfirmation;

// ==================== 광고 (AdMob 2.0 - Window Usage) ====================
let isAdLoaded = false;

/**
 * 전면 광고 로드 준비 (Window Interface)
 */
export async function prepareInterstitialAd() {
    if (!window.Bedrock) {
        console.warn('⚠️ window.Bedrock missing');
        return;
    }

    // 메서드 존재 확인
    if (!window.Bedrock.loadAppsInTossAdMob) {
        console.warn('⚠️ loadAppsInTossAdMob not found on window.Bedrock');
        return;
    }

    console.log('⏳ Loading Interstitial Ad (Window)...');

    try {
        const cleanup = window.Bedrock.loadAppsInTossAdMob({
            options: {
                adGroupId: config.ADMOB_INTERSTITIAL_ID
            },
            onEvent: (event) => {
                if (event.type === 'loaded') {
                    isAdLoaded = true;
                    console.log('✅ Interstitial Ad Loaded (Window)');
                    cleanup && cleanup();
                }
            },
            onError: (error) => {
                console.warn('❌ Failed to load Interstitial Ad:', error);
                isAdLoaded = false;
                cleanup && cleanup();
            }
        });
    } catch (error) {
        console.warn('❌ Error calling loadAppsInTossAdMob:', error);
    }
}

/**
 * 전면 광고 표시 (Window Interface)
 */
export function showInterstitialAd() {
    return new Promise((resolve) => {
        if (!isAdLoaded) {
            console.log('⚠️ Ad not loaded, skipping...');
            prepareInterstitialAd();
            resolve();
            return;
        }

        if (!window.Bedrock || !window.Bedrock.showAppsInTossAdMob) {
            console.warn('⚠️ showAppsInTossAdMob not supported');
            resolve();
            return;
        }

        try {
            console.log('📺 Showing Interstitial Ad (Window)...');
            window.Bedrock.showAppsInTossAdMob({
                options: {
                    adGroupId: config.ADMOB_INTERSTITIAL_ID
                },
                onEvent: (event) => {
                    console.log('Ad Event:', event.type);
                    switch (event.type) {
                        case 'show':
                            console.log('광고 표시됨');
                            break;
                        case 'dismissed':
                            console.log('광고 닫힘');
                            isAdLoaded = false;
                            prepareInterstitialAd();
                            resolve();
                            break;
                        case 'failedToShow':
                            console.warn('광고 표시 실패');
                            resolve();
                            break;
                    }
                },
                onError: (error) => {
                    console.warn('❌ Failed to show Ad:', error);
                    resolve();
                }
            });
        } catch (error) {
            console.warn('❌ Error calling showAd:', error);
            resolve();
        }
    });
}


/**
 * Mock Bedrock SDK 설정 (로컬 테스트용)
 */
function setupMockBedrock() {
    window.Bedrock = {
        init: () => Promise.resolve(),
        exit: () => {
            console.log('🛑 [Mock] Bedrock.exit() called');
            const confirmed = confirm('앱 종료 (Mock)');
        },
        // Mock Ads (Options + Callbacks)
        loadAppsInTossAdMob: (params) => {
            console.log('📦 [Mock] loadAppsInTossAdMob:', params);
            // Simulate callback after delay
            setTimeout(() => {
                params.onEvent?.({ type: 'loaded', data: {} });
            }, 1000);
            // Return cleanup function
            return () => console.log('[Mock] cleanup called');
        },
        showAppsInTossAdMob: (params) => {
            console.log('📺 [Mock] showAppsInTossAdMob:', params);
            // Simulate show event
            setTimeout(() => {
                params.onEvent?.({ type: 'show' });
            }, 500);
            // Simulate auto-dismiss after 2 seconds
            setTimeout(() => {
                console.log('✅ [Mock] Ad dismissed');
                params.onEvent?.({ type: 'dismissed' });
            }, 2500);
        }
    };

    window.NavigationBar = {
        setTitle: (title) => console.log(`🏷️ [Mock] NavigationBar.setTitle: ${title}`),
        setBackButton: (options) => {
            console.log(`⬅️ [Mock] NavigationBar.setBackButton:`, options);
            // 테스트를 위해 전역 함수로 노출
            window.mockPressBackButton = options.onPress;
            console.log('💡 테스트 팁: 개발자 도구 콘솔에서 window.mockPressBackButton() 을 실행하여 뒤로가기 동작을 테스트하세요.');
        }
    };

    window.OnAudioFocusChanged = (callback) => {
        console.log('🎧 [Mock] OnAudioFocusChanged listener registered');
        // 테스트용: 창 포커스 변경 시 트리거
        window.addEventListener('focus', () => callback(true));
        window.addEventListener('blur', () => callback(false));
    };
}

/**
 * 내비게이션 바 설정
 */
function setupNavigationBar() {
    try {
        const { NavigationBar } = window;
        if (!NavigationBar) return;

        NavigationBar.setTitle('Find Meow');
        NavigationBar.setBackButton({
            visible: true,
            onPress: handleBackButton
        });
        console.log('✅ Navigation bar configured');
    } catch (error) {
        console.warn('Navigation bar setup failed:', error);
    }
}

/**
 * 뒤로가기 버튼 핸들러
 */
function handleBackButton() {
    console.log('⬅️ Handle Back Button Pressed');
    const currentScreen = getCurrentScreen();

    console.log(`Current Screen detected as: ${currentScreen}`);

    if (currentScreen === 'game') {
        // 게임 중이면 확인 팝업 표시
        showExitConfirmation();
    } else if (currentScreen === 'result') {
        // 결과 화면에서는 다시 시작
        resetGame();
    } else {
        // 초기 화면에서는 앱 종료
        try {
            window.Bedrock.exit();
        } catch (error) {
            console.warn('Cannot exit (development mode):', error);
        }
    }
}

/**
 * 현재 화면 확인
 */
function getCurrentScreen() {
    const remoteControl = document.getElementById('remoteControl');
    const resultScreen = document.getElementById('resultScreen');

    // 게임 화면 (리모컨) 활성화 여부
    // styles.css: .remote-control.slide-in { display: block }
    if (remoteControl && remoteControl.classList.contains('slide-in')) {
        return 'game';
    }

    // 결과 화면 활성화 여부
    // styles.css: .result-screen.active { display: flex }
    if (resultScreen && resultScreen.classList.contains('active')) {
        return 'result';
    }

    return 'initial';
}

/**
 * 종료 확인 팝업
 */
function showExitConfirmation() {
    const message = '게임을 종료하시겠습니까?';
    if (confirm(message)) {
        try {
            window.Bedrock.exit();
        } catch (error) {
            console.warn('Cannot exit:', error);
            resetGame(); // Fallback
        }
    }
}

/**
 * 오디오 포커스 리스너 설정
 */
function setupAudioFocusListener() {
    try {
        const { OnAudioFocusChanged } = window;
        if (!OnAudioFocusChanged) return;

        OnAudioFocusChanged((hasFocus) => {
            console.log(`Audio focus changed: ${hasFocus}`);

            if (!hasFocus) {
                // 오디오 포커스를 잃었을 때 모든 사운드 일시정지
                pauseAllAudio();
            } else {
                // 포커스를 다시 얻었을 때 배경음악 재개 (사용자가 켜놓았던 경우)
                resumeAudioIfEnabled();
            }
        });
        console.log('✅ Audio focus listener configured');
    } catch (error) {
        console.warn('Audio focus listener setup failed:', error);
    }
}

/**
 * 모든 오디오 일시정지
 */
function pauseAllAudio() {
    const bgMusic = document.getElementById('bgMusic');
    const scanSound = document.getElementById('scanSound');

    // 안전하게 요소 확인
    if (!bgMusic) return;

    // 배경음악이 재생 중이었는지 기록
    if (!bgMusic.paused) {
        window.wasMusicPlaying = true;
        bgMusic.pause();
    }

    if (scanSound && !scanSound.paused) {
        scanSound.pause();
    }

    // 사운드바 시각 효과 업데이트
    const powerButton = document.getElementById('powerButton');
    const ledIndicator = document.getElementById('ledIndicator');
    const soundWaves = document.getElementById('soundWaves');

    if (powerButton) powerButton.classList.remove('active');
    if (ledIndicator) ledIndicator.classList.remove('active');
    if (soundWaves) soundWaves.classList.remove('active');

    console.log('🔇 All audio paused (Focus Lost)');
}

/**
 * 오디오 재개 (사용자가 활성화한 경우)
 */
function resumeAudioIfEnabled() {
    // 전역 오디오 활성화 여부 확인
    if (window.isAudioEnabled && window.wasMusicPlaying && window.isMusicPlaying) {
        const bgMusic = document.getElementById('bgMusic');
        if (bgMusic) {
            bgMusic.play()
                .then(() => {
                    console.log('🔊 Background music resumed (Focus Gained)');

                    // 사운드바 시각 효과 복원
                    const powerButton = document.getElementById('powerButton');
                    const ledIndicator = document.getElementById('ledIndicator');
                    const soundWaves = document.getElementById('soundWaves');

                    if (powerButton) powerButton.classList.add('active');
                    if (ledIndicator) ledIndicator.classList.add('active');
                    if (soundWaves) soundWaves.classList.add('active');
                })
                .catch(error => console.warn('Failed to resume music:', error));
        }
    }
}

// 전역 함수로 내보내기
window.resetGame = resetGame;
window.showExitConfirmation = showExitConfirmation;
