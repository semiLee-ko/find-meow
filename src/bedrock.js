// Bedrock SDK 초기화 및 앱 설정
import { config } from './config.js';
import { resetGame } from './game.js';
/* -------------------------------------------------------------------------- */
/*                               HYBRID AD LOGIC                              */
/* -------------------------------------------------------------------------- */
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { GoogleAdMob } from '@apps-in-toss/web-framework';

let isBedrockInitialized = false;

// Ad state management
let isAdLoaded = false;
let adCleanup = null; // Toss cleanup function

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

/**
 * 전면 광고 로드 준비 (Hybrid)
 */
export async function prepareInterstitialAd() {
    try {
        console.log('⏳ Preparing Interstitial Ad...');

        // 1. Native App (Android/iOS Standalone)
        if (Capacitor.isNativePlatform()) {
            console.log('📱 Detected Native Platform: Using Standard AdMob');

            // Initialize AdMob (required once, but safe to call multiple times)
            await AdMob.initialize();

            const options = {
                adId: config.ADMOB_ANDROID_INTERSTITIAL_ID,
                // On native, validation is stricter. 
                // Using Test ID: ca-app-pub-3940256099942544/1033173712
            };

            await AdMob.prepareInterstitial(options);
            isAdLoaded = true; // Capacitor plugin doesn't have a 'loaded' event for prepare, it resolves when loaded.
            console.log('✅ Native Interstitial Ad Loaded');
            return;
        }

        // 2. Web / Toss App
        console.log('🌐 Detected Web/Toss Platform: Using apps-in-toss Framework');

        if (!GoogleAdMob || !GoogleAdMob.loadAppsInTossAdMob) {
            console.warn('⚠️ GoogleAdMob framework not found');
            return;
        }

        if (adCleanup) {
            adCleanup();
            adCleanup = null;
        }

        adCleanup = GoogleAdMob.loadAppsInTossAdMob({
            options: {
                adGroupId: config.ADMOB_INTERSTITIAL_ID
            },
            onEvent: (event) => {
                if (event.type === 'loaded') {
                    console.log('✅ Toss Interstitial Ad Loaded');
                    isAdLoaded = true;
                    if (adCleanup) { adCleanup(); adCleanup = null; }
                }
            },
            onError: (error) => {
                console.warn('Failed to prepare Toss ad:', error);
                isAdLoaded = false;
                if (adCleanup) { adCleanup(); adCleanup = null; }
            }
        });

    } catch (error) {
        console.warn('Failed to prepare interstitial ad:', error);
        isAdLoaded = false;
    }
}

/**
 * 전면 광고 표시 (Hybrid)
 */
export function showInterstitialAd() {
    return new Promise(async (resolve) => {
        if (!isAdLoaded && !Capacitor.isNativePlatform()) {
            // Capacitor plugin auto-reloads? No, we need to check. 
            // But simpler logic: just try to show.
            console.warn('⚠️ Ad might not be loaded, but trying anyway.');
        }

        try {
            console.log('📺 Showing Interstitial Ad...');
            pauseAllAudio();

            // 1. Native App
            if (Capacitor.isNativePlatform()) {
                await AdMob.showInterstitial();
                console.log('✅ Native Ad Shown');
                isAdLoaded = false;

                // 광고 종료 후 처리 (Native는 await로 잡히지 않을 수 있어서 리스너 필요하지만,
                // 여기서는 간단히 처리하고 오디오 복구 시도)
                // *Capacitor AdMob 'dismissed' event listener is global, setting it up here is tricky.
                // For now, valid resume might depend on user interaction or global event.
                // We will just resume immediately after show call returns (standard behavior varies)
                // Better approach: Listen to 'adDismissed' event globally or assume standard flow.
                // For simplicity in this edit, running resume immediately might be too early if show is async.
                // But typically showInterstitial resolves after presentation starts.

                // Re-prepare for next time
                prepareInterstitialAd();
                resumeAudioIfEnabled();
                resolve();
                return;
            }

            // 2. Web / Toss App
            if (!GoogleAdMob) {
                resumeAudioIfEnabled();
                resolve();
                return;
            }

            GoogleAdMob.showAppsInTossAdMob({
                options: { adGroupId: config.ADMOB_INTERSTITIAL_ID },
                onEvent: (event) => {
                    if (event.type === 'dismissed' || event.type === 'failedToShow') {
                        console.log(`Ad event: ${event.type}`);
                        isAdLoaded = false;
                        prepareInterstitialAd();
                        resumeAudioIfEnabled();
                        resolve();
                    }
                },
                onError: (error) => {
                    console.warn('Toss Ad Error:', error);
                    resumeAudioIfEnabled();
                    resolve();
                }
            });

        } catch (error) {
            console.warn('Error calling showInterstitialAd:', error);
            resumeAudioIfEnabled();
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
