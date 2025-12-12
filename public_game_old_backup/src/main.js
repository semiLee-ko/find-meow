// 메인 진입점
import { initializeBedrock } from './bedrock.js';
import { initializeGame } from './game.js';
import { initializeAudio } from './audio.js';

/**
 * 앱 초기화
 */
async function initApp() {
    console.log('🚀 Find Meow 앱 시작...');

    try {
        // 1. Bedrock SDK 초기화
        await initializeBedrock();

        // 2. 오디오 시스템 초기화
        initializeAudio();

        // 3. 게임 시스템 초기화
        initializeGame();

        console.log('✅ 앱 초기화 완료');
    } catch (error) {
        console.error('❌ 앱 초기화 실패:', error);
    }
}

// DOM 로드 완료 시 앱 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/**
 * 브릿지 뷰 (Intro) 종료 및 게임 진입
 */
window.enterGame = function () {
    const bridge = document.getElementById('bridgeScreen');
    if (bridge) {
        bridge.classList.add('hidden');
        setTimeout(() => {
            bridge.remove();
        }, 500);
    }
    console.log('🎮 Game Entered (Bridge Closed)');
};
