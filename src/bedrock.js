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

    // ... (omitted for brevity, assume unchanged until setupNavigationBar logic)

    // Using window.Config if available (Framework), otherwise NavigationBar (Legacy)
    setupNavigationBar();
    setupAudioFocusListener();
}

// ... existing exports ...

// Ad state management
let isAdLoaded = false;
let adCleanup = null;

/**
 * 전면 광고 로드 준비
 */
export async function prepareInterstitialAd() {
    try {
        if (!GoogleAdMob || !GoogleAdMob.loadAppsInTossAdMob) {
            console.warn('⚠️ GoogleAdMob not supported');
            return;
        }

        // 기존 cleanup 실행
        if (adCleanup) {
            adCleanup();
            adCleanup = null;
        }

        console.log('⏳ Preparing Interstitial Ad...');

        adCleanup = GoogleAdMob.loadAppsInTossAdMob({
            options: {
                adGroupId: config.ADMOB_INTERSTITIAL_ID
            },
            onEvent: (event) => {
                if (event.type === 'loaded') {
                    console.log('✅ Interstitial Ad Loaded');
                    isAdLoaded = true;
                    // miracle-3min 패턴: 로드 성공 후 cleanup 호출
                    if (adCleanup) {
                        adCleanup();
                        adCleanup = null;
                    }
                }
            },
            onError: (error) => {
                console.warn('Failed to prepare interstitial ad:', error);
                isAdLoaded = false;
                if (adCleanup) {
                    adCleanup();
                    adCleanup = null;
                }
            }
        });
    } catch (error) {
        console.warn('Failed to prepare interstitial ad:', error);
    }
}

/**
 * 전면 광고 표시
 */
export function showInterstitialAd() {
    return new Promise((resolve) => {
        if (!isAdLoaded) {
            console.warn('⚠️ Ad not loaded, skipping.');
            prepareInterstitialAd(); // 다음을 위해 로드 시도
            resolve();
            return;
        }

        try {
            console.log('📺 Showing Interstitial Ad...');
            GoogleAdMob.showAppsInTossAdMob({
                options: {
                    adGroupId: config.ADMOB_INTERSTITIAL_ID
                },
                onEvent: (event) => {
                    if (event.type === 'dismissed') {
                        console.log('✅ Ad Dismissed');
                        isAdLoaded = false;
                        prepareInterstitialAd(); // 다음 광고 준비
                        resolve();
                    } else if (event.type === 'failedToShow') {
                        console.warn('⚠️ Ad Failed to Show');
                        isAdLoaded = false;
                        prepareInterstitialAd();
                        resolve();
                    }
                },
                onError: (error) => {
                    console.warn('Failed to show interstitial ad:', error);
                    isAdLoaded = false;
                    resolve();
                }
            });
        } catch (error) {
            console.warn('Error calling showInterstitialAd:', error);
            resolve();
        }
    });
}

// ... mock setup ...

/**
 * 내비게이션 바 설정 (Config API / Legacy Support)
 */
function setupNavigationBar() {
    try {
        console.log('⚙️ Configuration Navigation Bar...');

        // 1. Try Config API (Framework Global)
        if (window.Config && typeof window.Config.configure === 'function') {
            console.log('✅ Using window.Config.configure');
            window.Config.configure({
                navigationBar: {
                    title: 'Find Meow',
                    titleColor: '#191f28',
                    backgroundColor: '#ffffff'
                }
            });
            return;
        }

        // 2. Fallback to Legacy NavigationBar
        const { NavigationBar } = window;
        if (NavigationBar) {
            console.log('✅ Using window.NavigationBar (Legacy)');
            NavigationBar.setTitle('Find Meow');
            NavigationBar.setBackButton({
                visible: true,
                onPress: handleBackButton
            });
        } else {
            console.warn('⚠️ No NavigationBar API found.');
        }

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
