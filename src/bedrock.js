// Bedrock SDK 초기화 및 앱 설정
import { config } from './config.js';
import { resetGame } from './game.js';
import { GoogleAdMob } from '@apps-in-toss/web-framework';

let isBedrockInitialized = false;

/**
 * Bedrock SDK 초기화
 */
export async function initializeBedrock() {
    if (isBedrockInitialized) return;

    // [DEBUG] 환경 진단 로그
    console.log('--- Environment Check (Framework) ---');
    console.log('UA:', navigator.userAgent);

    let supported = false;
    try {
        supported = GoogleAdMob.loadAppsInTossAdMob.isSupported();
    } catch (e) {
        console.warn('⚠️ Framework isSupported check failed, falling back to mock:', e);
        supported = false;
    }

    console.log('GoogleAdMob Supported:', supported);
    console.log('-------------------------');

    if (!supported) {
        console.warn('⚠️ GoogleAdMob not supported. Initializing Mock SDK.');
        setupMockBedrock();
    } else {
        console.log('✅ GoogleAdMob logic enabled.');
    }

    // Framework handles init implicitly or via other modules (Granite starts automatically)
    // We just mark initialized here.
    isBedrockInitialized = true;
    console.log('✅ Bedrock (Framework) initialized');

    // 내비게이션 바 설정 (if needed via framework, but keeping legacy window check for safe measure or assume handled)
    setupNavigationBar();
    setupAudioFocusListener();
}

// ... existing exports ...
window.resetGame = resetGame;
window.showExitConfirmation = showExitConfirmation;

// ==================== 광고 (AdMob 2.0 - Framework Usage) ====================
let isAdLoaded = false;
let adCleanup = null;

/**
 * 전면 광고 로드 준비
 */
export async function prepareInterstitialAd() {
    let isSupported = false;
    try {
        isSupported = GoogleAdMob.loadAppsInTossAdMob.isSupported();
    } catch (e) {
        console.warn('⚠️ Framework check failed:', e);
    }

    if (isSupported !== true) {
        // Fallback to Window Mock if set up, or just log
        if (window.Bedrock && window.Bedrock.loadAppsInTossAdMob) {
            // Mock Bedrock path
            console.log('Using Mock Bedrock for Ad Load');
            window.Bedrock.loadAppsInTossAdMob({
                options: { adGroupId: config.ADMOB_INTERSTITIAL_ID },
                onEvent: (evt) => { if (evt.type === 'loaded') isAdLoaded = true; }
            });
            return;
        }
        console.warn('⚠️ AdMob not supported in this environment');
        return;
    }

    console.log('⏳ Loading Interstitial Ad (Framework)...');

    try {
        const cleanup = GoogleAdMob.loadAppsInTossAdMob({
            options: {
                adGroupId: config.ADMOB_INTERSTITIAL_ID
            },
            onEvent: (event) => {
                if (event.type === 'loaded') {
                    isAdLoaded = true;
                    console.log('✅ Interstitial Ad Loaded (Framework)');
                    adCleanup = cleanup; // Save cleanup to call later if needed
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
 * 전면 광고 표시
 */
export function showInterstitialAd() {
    return new Promise((resolve) => {
        if (!isAdLoaded) {
            console.log('⚠️ Ad not loaded, skipping...');
            prepareInterstitialAd();
            resolve();
            return;
        }

        let isShowSupported = false;
        try {
            isShowSupported = GoogleAdMob.showAppsInTossAdMob.isSupported();
        } catch (e) {
            console.warn('⚠️ Framework check failed (show):', e);
        }

        if (isShowSupported !== true) {
            // Mock Path
            if (window.Bedrock && window.Bedrock.showAppsInTossAdMob) {
                window.Bedrock.showAppsInTossAdMob({
                    options: { adGroupId: config.ADMOB_INTERSTITIAL_ID },
                    onEvent: (e) => {
                        if (e.type === 'dismissed') {
                            isAdLoaded = false;
                            prepareInterstitialAd();
                            resolve();
                        }
                    }
                });
                return;
            }
            resolve();
            return;
        }

        try {
            console.log('📺 Showing Interstitial Ad (Framework)...');
            GoogleAdMob.showAppsInTossAdMob({
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
                            prepareInterstitialAd(); // Preload next
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
    // Keep existing mock implementation but only populate window.Bedrock for fallback
    // The framework calls won't use this, but our fallback logic above might.
    if (window.Bedrock) return;

    window.Bedrock = {
        init: () => Promise.resolve(),
        exit: () => console.log('Mock Exit'),
        loadAppsInTossAdMob: (params) => {
            console.log('📦 [Mock] loadAppsInTossAdMob:', params);
            setTimeout(() => params.onEvent?.({ type: 'loaded', data: {} }), 1000);
            return () => { };
        },
        showAppsInTossAdMob: (params) => {
            console.log('📺 [Mock] showAppsInTossAdMob:', params);
            setTimeout(() => params.onEvent?.({ type: 'show' }), 500);
            setTimeout(() => {
                console.log('✅ [Mock] Ad dismissed');
                params.onEvent?.({ type: 'dismissed' });
            }, 2500);
        }
    };
    // ... NavigationBar mock ...
    window.NavigationBar = {
        setTitle: (t) => console.log('Mock Title:', t),
        setBackButton: (opt) => window.mockPressBackButton = opt.onPress
    };
    window.OnAudioFocusChanged = (cb) => {
        window.addEventListener('focus', () => cb(true));
        window.addEventListener('blur', () => cb(false));
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
