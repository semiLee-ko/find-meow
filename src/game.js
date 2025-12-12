// 게임 로직 모듈
import { config } from './config.js';
import { playSound } from './audio.js';
import { prepareInterstitialAd, showInterstitialAd } from './bedrock.js';

// ==================== 게임 데이터 ====================
const channelImages = [];
for (let i = 1; i <= 82; i++) {
    const paddedNum = i.toString().padStart(4, '0');
    channelImages.push(`channel${paddedNum}.jpg`);
}

// 고양이 사운드 풀
let currentCatSoundIndex = 0;

// 게임 상태
export let totalPlayers = 3;
export let currentPlayerIndex = 0;
export let currentChannel = '';
export let currentImage = '';
export let players = [];
export let catPositions = {};
export let usedImages = [];
let isGameInitialized = false;

/**
 * 게임 시스템 초기화
 */
export async function initializeGame() {
    if (isGameInitialized) {
        console.log('⚠️ 게임이 이미 초기화되어 있습니다.');
        return;
    }

    console.log('🎮 게임 시스템 초기화...');
    isGameInitialized = true;

    try {
        const response = await fetch('point/json/pointInfo.json');
        if (response.ok) {
            catPositions = await response.json();
            console.log('고양이 위치 정보 로드 완료');
        }
    } catch (error) {
        console.warn('고양이 위치 정보 로드 실패:', error);
    }

    setupCustomDropdown();
    prepareInterstitialAd(); // 광고 미리 로드
    setupAccessibility(); // 접근성 설정
    setTimeout(startContinuousWalking, 2000);

    // 전역 함수로 내보내기 (HTML에서 호출용)
    window.startGame = startGame;
    window.pressNumber = pressNumber;
    window.backspace = backspace;
    window.changeChannel = changeChannel;
    window.confirmPlayer = confirmPlayer;
    window.resetGame = resetGame;
    window.randomChannel = randomChannel;
    window.openInfoPopup = openInfoPopup;
    window.closeInfoPopup = closeInfoPopup;
    window.showCustomAlert = showCustomAlert;
    window.closeCustomAlert = closeCustomAlert;
    window.showCustomAlert = showCustomAlert;
    window.closeCustomAlert = closeCustomAlert;

    // 초기 화면 설정 (기본 이미지 + 자막)
    const tvImage = document.getElementById('tvImage');
    const tvSubtitle = document.getElementById('tvSubtitle');

    tvImage.src = 'images/basicCn.png';
    tvImage.style.display = 'block';

    if (tvSubtitle) {
        tvSubtitle.classList.remove('hidden');
    }
}

// ==================== 이름 유효성 검사 ====================
function validatePlayerName(name) {
    if (!name || name.trim() === '') {
        return { valid: false, message: '이름을 입력해주세요!' };
    }

    const trimmedName = name.trim();
    const validCharsRegex = /^[가-힣a-zA-Z0-9]+$/;
    if (!validCharsRegex.test(trimmedName)) {
        return { valid: false, message: '한글, 영문, 숫자만 사용 가능합니다!' };
    }

    const koreanChars = trimmedName.match(/[가-힣]/g) || [];
    const otherChars = trimmedName.match(/[a-zA-Z0-9]/g) || [];

    if (koreanChars.length > 0) {
        const totalLength = koreanChars.length + otherChars.length;
        if (totalLength < 2 || totalLength > 10) {
            return { valid: false, message: '한글 포함 시 2~10자로 입력해주세요!' };
        }
    } else {
        if (otherChars.length < 2 || otherChars.length > 20) {
            return { valid: false, message: '영문/숫자만 사용 시 2~20자로 입력해주세요!' };
        }
    }

    return { valid: true, message: '' };
}

// ==================== 게임 시작 ====================
export function startGame() {
    const gameStartSound = document.getElementById('gameStartSound');
    gameStartSound.currentTime = 0;
    playSound(gameStartSound);

    totalPlayers = parseInt(document.getElementById('playerCount').value);
    currentPlayerIndex = 0;
    players = [];
    usedImages = [];

    document.getElementById('initialScreen').classList.add('slide-out');
    setTimeout(() => {
        document.getElementById('initialScreen').classList.add('hidden');
        const remoteControl = document.getElementById('remoteControl');
        remoteControl.style.display = 'block';
        remoteControl.classList.add('slide-in');
        updatePlayerInfo();
        setDefaultPlayerName();
    }, 500);
}

// ==================== 기본 플레이어 이름 설정 ====================
function setDefaultPlayerName() {
    const nameInput = document.getElementById('playerName');
    if (currentPlayerIndex < config.DEFAULT_PLAYER_NAMES.length) {
        nameInput.value = config.DEFAULT_PLAYER_NAMES[currentPlayerIndex];
    } else {
        nameInput.value = `플레이어${currentPlayerIndex + 1}`;
    }
}

// ==================== 플레이어 정보 업데이트 ====================
function updatePlayerInfo() {
    const playerInfo = document.getElementById('playerInfo');
    playerInfo.textContent = `플레이어 ${currentPlayerIndex + 1} / ${totalPlayers}`;
}

let isInteractionBlocked = false;

// ==================== 숫자 패드 입력 처리 ====================
export function pressNumber(num) {
    if (isInteractionBlocked) return; // Block input during animation

    const btn = document.getElementById(`btn${num}`);
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 200);

    // Click Sound
    const clickSound = document.getElementById('clickSound');
    if (clickSound) {
        clickSound.currentTime = 0;
        playSound(clickSound);
    }

    if (currentChannel.length === 0 && num === '0') {
        return;
    }

    if (currentChannel.length < 3) {
        currentChannel += num;
        updateChannelDisplay();
    }
}

export function backspace() {
    if (isInteractionBlocked) return;
    currentChannel = currentChannel.slice(0, -1);
    updateChannelDisplay();
}


export function randomChannel() {
    if (isInteractionBlocked) return;

    // 1. Block interaction (keep buttons enabled visually)
    isInteractionBlocked = true;

    // 2. Clear current
    currentChannel = '';
    updateChannelDisplay();

    // 3. Generate Random Number
    const randomNum = Math.floor(Math.random() * 999) + 1;
    const targetChannel = String(randomNum).padStart(3, '0');
    const digits = targetChannel.split('');

    // 4. Animate Sequence
    digits.forEach((digit, index) => {
        setTimeout(() => {
            const btnId = `btn${digit}`;
            const btn = document.getElementById(btnId);

            if (btn) {
                // Visual Press Effect
                btn.classList.add('pressed');
                setTimeout(() => btn.classList.remove('pressed'), 200);

                // Add Paw Print Overlay
                const paw = document.createElement('div');
                paw.className = 'button-paw-print';
                const rotation = (Math.random() - 0.5) * 40;
                paw.style.setProperty('--paw-rotation', `${rotation}deg`);
                btn.appendChild(paw);

                setTimeout(() => paw.remove(), 600);
            }

            currentChannel += digit;
            updateChannelDisplay();

            const clickSound = document.getElementById('clickSound');
            if (clickSound) {
                clickSound.currentTime = 0;
                playSound(clickSound);
            }

        }, index * 600); // 600ms gap (Slower)
    });

    // 5. Animate Channel Change Button & Finalize
    setTimeout(() => {
        const actionBtn = document.getElementById('btnChannelAction');
        if (actionBtn) {
            // Visual Press
            actionBtn.style.transform = 'translateY(2px)';
            setTimeout(() => actionBtn.style.transform = '', 200);

            // Paw Print on Action Button
            const paw = document.createElement('div');
            paw.className = 'button-paw-print';
            const rotation = (Math.random() - 0.5) * 40;
            paw.style.setProperty('--paw-rotation', `${rotation}deg`);
            actionBtn.appendChild(paw);
            setTimeout(() => paw.remove(), 800); // Matches CSS duration

            const clickSound = document.getElementById('clickSound');
            if (clickSound) {
                clickSound.currentTime = 0;
                playSound(clickSound);
            }
        }

        // Execute Change
        setTimeout(() => {
            isInteractionBlocked = false;
            changeChannel();
        }, 500);

    }, digits.length * 600); // Adjust total wait time
}

function updateChannelDisplay() {
    const display = document.getElementById('channelDisplay');
    if (currentChannel.length > 0) {
        display.textContent = currentChannel.padStart(3, '0');
        display.classList.add('active');
    } else {
        display.textContent = '000';
        display.classList.remove('active');
    }
}

// ==================== 채널 변경 ====================
export function changeChannel() {
    if (isInteractionBlocked) return;

    const channelNum = parseInt(currentChannel);

    if (!currentChannel || channelNum < 1 || channelNum > 999) {
        showCustomAlert('채널 번호는 1~999 사이로 입력해주세요!');
        return;
    }

    const usedChannels = players.map(p => p.channel);
    if (usedChannels.includes(currentChannel.padStart(3, '0'))) {
        showCustomAlert(`채널 ${currentChannel.padStart(3, '0')}번은 이미 선택되었습니다!\n\n사용된 채널: ${usedChannels.join(', ')}`);
        return;
    }

    const availableImages = channelImages.filter(img => !usedImages.includes(img));

    if (availableImages.length === 0) {
        showCustomAlert('사용 가능한 이미지가 모두 소진되었습니다!');
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableImages.length);
    currentImage = availableImages[randomIndex];

    const tvImage = document.getElementById('tvImage');
    tvImage.src = `images/channels/${currentImage}`;
    tvImage.style.display = 'block';

    // 자막 숨기기
    const tvSubtitle = document.getElementById('tvSubtitle');
    if (tvSubtitle) {
        tvSubtitle.classList.add('hidden');
    }

    tvImage.onload = () => {
        displayCatScanAnimation(currentImage);
        setNumberPadEnabled(false);
    };

    tvImage.onerror = () => {
        showCustomAlert('이미지를 불러올 수 없습니다!');
        tvImage.style.display = 'none';
    };
}

// ==================== 스캔 애니메이션 (타이밍 수정 적용됨) ====================
function displayCatScanAnimation(imageName) {
    // 기존 펄스와 스캔 라인 제거
    const existingPulses = document.querySelectorAll('.cat-pulse');
    existingPulses.forEach(pulse => pulse.remove());

    const existingScanLine = document.querySelector('.scan-line');
    if (existingScanLine) existingScanLine.remove();

    if (!catPositions[imageName]) {
        console.warn(`${imageName}에 대한 고양이 위치 정보가 없습니다.`);
        setNumberPadEnabled(true);
        setNextButtonEnabled(true);
        updateNextButtonText();
        return;
    }

    const cats = catPositions[imageName].cats || [];
    const tvScreen = document.getElementById('tvScreen');
    const scanSound = document.getElementById('scanSound');
    const catSoundPool = Array.from(document.querySelectorAll('.catSound'));

    updateCatCounter(0);

    scanSound.currentTime = 0;
    playSound(scanSound);

    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    tvScreen.appendChild(scanLine);

    let animationTime = 2000;
    // scanMove 애니메이션: linear로 변경하여 타이밍 일치시킴
    scanLine.style.animation = `scanMove ${animationTime}ms linear forwards`;

    // 고양이가 없으면 스캔만 실행
    if (cats.length === 0) {
        setTimeout(() => {
            scanLine.remove();
            scanSound.pause();
            scanSound.currentTime = 0;

            // FIX: Play fail sound
            const failSound = document.getElementById('failSound');
            if (failSound) {
                failSound.currentTime = 0;
                playSound(failSound);
            }

            updateCatCounter(0);
            // setNumberPadEnabled(true);
            setNextButtonEnabled(true);
            updateNextButtonText();
        }, animationTime);
        return;
    }

    // 스캔 라인이 각 고양이 x 좌표를 지나갈 때 포인트 생성
    let catDetectedCount = 0;

    cats.forEach((cat) => {
        // 스캔 라인이 고양이 x 좌표에 도달하는 시간 계산
        const pulseDelay = animationTime * cat.x;

        setTimeout(() => {
            const pulse = document.createElement('div');
            pulse.className = 'cat-pulse';
            pulse.style.left = `${cat.x * 100}%`;
            pulse.style.top = `${cat.y * 100}%`;
            tvScreen.appendChild(pulse);

            // CSS 애니메이션(1.5s) 완료 후 자동 제거 (무한반복 방지 보조)
            setTimeout(() => {
                pulse.remove();
            }, 1500);

            // 사운드 재생
            const currentSound = catSoundPool[currentCatSoundIndex % catSoundPool.length];
            currentSound.currentTime = 0;
            playSound(currentSound);
            currentCatSoundIndex++;

            catDetectedCount++;
            updateCatCounter(catDetectedCount);

            // 모든 고양이 감지 완료 후 버튼 활성화
            if (catDetectedCount === cats.length) {
                setTimeout(() => {
                    // 숫자 패드는 비활성화 유지 (다음 버튼 누를 때까지)
                    // setNumberPadEnabled(true); 
                    setNextButtonEnabled(true);
                    updateNextButtonText();
                }, 500);
            }
        }, pulseDelay);
    });

    // 스캔 라인은 애니메이션 종료 후 제거
    setTimeout(() => {
        scanLine.remove();
        scanSound.pause();
        scanSound.currentTime = 0;
    }, animationTime);
}

// ==================== 플레이어 확정 ====================
export function confirmPlayer() {
    const name = document.getElementById('playerName').value.trim();
    const validation = validatePlayerName(name);

    if (!validation.valid) {
        showCustomAlert(validation.message);
        return;
    }

    if (!currentChannel || !currentImage) {
        showCustomAlert('채널을 선택해주세요!');
        return;
    }

    const catCount = catPositions[currentImage]?.cats?.length || 0;

    players.push({
        name: name,
        channel: currentChannel.padStart(3, '0'),
        imageName: currentImage,
        catCount: catCount
    });

    usedImages.push(currentImage);

    if (currentPlayerIndex < totalPlayers - 1) {
        currentPlayerIndex++;
        currentChannel = '';
        currentImage = '';

        const tvImage = document.getElementById('tvImage');
        tvImage.onload = null; // Prevent previous onload from firing
        tvImage.style.display = 'block';
        tvImage.src = 'images/basicCn.png'; // Show default standby image

        // 자막 표시 (기본 화면 상태)
        const tvSubtitle = document.getElementById('tvSubtitle');
        if (tvSubtitle) {
            tvSubtitle.classList.remove('hidden');
        }

        updatePlayerInfo();
        setDefaultPlayerName();

        const catCounter = document.getElementById('catCounter');
        catCounter.classList.remove('active', 'pop');
        catCounter.textContent = '0';

        const channelDisplay = document.getElementById('channelDisplay');
        channelDisplay.classList.remove('active');
        channelDisplay.textContent = '000';

        const existingPulses = document.querySelectorAll('.cat-pulse');
        existingPulses.forEach(pulse => pulse.remove());

        setNumberPadEnabled(true);
        setNextButtonEnabled(false);
        updateNextButtonText();
    } else {
        showResults();
    }
}

// ==================== 결과 표시 ====================
function showResults() {
    const gameEndSound = document.getElementById('gameEndSound');
    gameEndSound.currentTime = 0;
    playSound(gameEndSound);

    players.sort((a, b) => b.catCount - a.catCount);

    const resultList = document.getElementById('resultList');
    resultList.innerHTML = '';

    let currentRank = 1;
    let previousCatCount = -1;
    let sameRankCount = 0;

    players.forEach((player) => {
        const isTied = player.catCount === previousCatCount;

        if (!isTied) {
            currentRank += sameRankCount;
            sameRankCount = 1;
        } else {
            sameRankCount++;
        }

        previousCatCount = player.catCount;

        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        let rankClass = '';
        let rankEmoji = '';
        let rankText = `${currentRank}등`;

        if (currentRank === 1) {
            rankClass = 'first';
            rankEmoji = '🥇';
            rankText = isTied ? '공동 1등' : '1등';
        } else if (currentRank === 2) {
            rankClass = 'second';
            rankEmoji = '🥈';
            rankText = isTied ? '공동 2등' : '2등';
        } else if (currentRank === 3) {
            rankClass = 'third';
            rankEmoji = '🥉';
            rankText = isTied ? '공동 3등' : '3등';
        } else {
            rankText = isTied ? `공동 ${currentRank}등` : `${currentRank}등`;
        }

        resultItem.innerHTML = `
      <div class="result-rank ${rankClass}">
        ${rankEmoji ? `<span class="rank-emoji">${rankEmoji}</span>` : ''}
        <span class="rank-text">${rankText}</span>
      </div>
      <div class="result-info">
        <div class="result-name">${player.name}</div>
        <div class="result-details">
          <span class="result-channel">채널 ${player.channel}</span>
          <span class="result-score">🐱 ${player.catCount}마리</span>
        </div>
      </div>
      <div class="result-thumbnail">
        <img src="images/channels/${player.imageName}" alt="채널 ${player.channel}">
      </div>
    `;

        resultList.appendChild(resultItem);
    });

    document.getElementById('remoteControl').style.display = 'none';
    document.getElementById('resultScreen').classList.add('active');
}

// ==================== 게임 리셋 ====================
export function resetGame() {
    showInterstitialAd().then(() => {
        performGameReset();
    });
}

function performGameReset() {
    totalPlayers = 3;
    currentPlayerIndex = 0;
    currentChannel = '';
    currentImage = '';
    players = [];
    usedImages = [];

    document.getElementById('resultScreen').classList.remove('active');
    document.getElementById('remoteControl').style.display = 'none';
    document.getElementById('remoteControl').classList.remove('slide-in');
    document.getElementById('initialScreen').classList.remove('slide-out', 'hidden');

    const tvImage = document.getElementById('tvImage');
    tvImage.style.display = 'block'; // Reset to visible for basicCn
    tvImage.src = 'images/basicCn.png';

    // 자막 다시 표시
    const tvSubtitle = document.getElementById('tvSubtitle');
    if (tvSubtitle) {
        tvSubtitle.classList.remove('hidden');
    }

    tvImage.onload = null;
    tvImage.onerror = null;

    const counter = document.getElementById('catCounter');
    counter.classList.remove('active', 'pop');
    counter.textContent = '0';

    const channelDisplay = document.getElementById('channelDisplay');
    channelDisplay.classList.remove('active');
    channelDisplay.textContent = '000';

    document.getElementById('playerCount').value = '3';
    document.getElementById('playerName').value = '';

    setNumberPadEnabled(true);
    setNextButtonEnabled(false);

    const existingPulses = document.querySelectorAll('.cat-pulse');
    existingPulses.forEach(pulse => pulse.remove());

    const existingScanLine = document.querySelector('.scan-line');
    if (existingScanLine) existingScanLine.remove();
}

// ==================== 버튼 활성화/비활성화 ====================
function setNumberPadEnabled(enabled) {
    const buttons = ['btn1', 'btn2', 'btn3', 'btn4', 'btn5', 'btn6', 'btn7', 'btn8', 'btn9', 'btn0', 'btnBackspace', 'btnRandom', 'btnChannelAction'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !enabled;
    });
}

function setNextButtonEnabled(enabled) {
    document.getElementById('btnNext').disabled = !enabled;
}

function updateNextButtonText() {
    // Button is now an arrow icon, so we don't change text content.
    // We could change aria-label or color if needed.
    const btnNext = document.getElementById('btnNext');
    if (currentPlayerIndex === totalPlayers - 1) {
        btnNext.setAttribute('aria-label', '결과 확인');
        // Optional: Change icon to Checkmark?
    } else {
        btnNext.setAttribute('aria-label', '다음');
    }
}

function updateCatCounter(count) {
    const counter = document.getElementById('catCounter');
    counter.textContent = count;
    counter.classList.add('active');

    // 0일 때는 애니메이션 효과 제외 (초기화 시)
    if (count > 0) {
        counter.classList.remove('pop');
        void counter.offsetWidth;
        counter.classList.add('pop');
    } else {
        counter.classList.remove('pop');
    }
}

// ==================== 팝업 ====================
// ==================== 팝업 & Focus Management ====================
let lastFocusedElement = null;

export function openInfoPopup() {
    lastFocusedElement = document.activeElement; // Save focus
    const popup = document.getElementById('infoPopup');
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Move focus to close button
    const closeBtn = popup.querySelector('.close-button');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100);
    }
}

export function closeInfoPopup() {
    const popup = document.getElementById('infoPopup');
    popup.classList.remove('active');
    document.body.style.overflow = '';

    // Restore focus
    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}

export function showCustomAlert(message) {
    lastFocusedElement = document.activeElement; // Save focus
    const overlay = document.getElementById('customAlertOverlay');
    const messageEl = document.getElementById('customAlertMessage');
    const confirmBtn = overlay.querySelector('.custom-alert-button');

    messageEl.textContent = message;
    overlay.classList.add('active');

    if (confirmBtn) {
        setTimeout(() => confirmBtn.focus(), 100);
    }
}

export function closeCustomAlert() {
    const overlay = document.getElementById('customAlertOverlay');
    overlay.classList.remove('active');

    // Restore focus
    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}

// ==================== 커스텀 드롭다운 ====================
let isDropdownInitialized = false;

function setupCustomDropdown() {
    if (isDropdownInitialized) {
        console.log('⚠️ 드롭다운이 이미 초기화되어 있습니다.');
        return;
    }

    const customDropdown = document.getElementById('customDropdown');
    const dropdownButton = document.getElementById('dropdownButton');
    const dropdownList = document.getElementById('dropdownList');
    const dropdownValue = document.getElementById('dropdownValue');
    const nativeSelect = document.getElementById('playerCount');

    if (dropdownButton) {
        // A11y Init
        dropdownButton.setAttribute('aria-expanded', 'false');

        dropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            customDropdown.classList.toggle('open');
            // A11y Toggle
            const isOpen = customDropdown.classList.contains('open');
            dropdownButton.setAttribute('aria-expanded', isOpen);
        });
    }

    if (dropdownList) {
        // A11y: Options roles
        const options = dropdownList.querySelectorAll('.custom-dropdown-option');
        options.forEach(opt => {
            opt.setAttribute('role', 'option');
            opt.setAttribute('aria-selected', opt.classList.contains('selected'));
        });

        dropdownList.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;

                dropdownValue.textContent = text;
                nativeSelect.value = value;

                document.querySelectorAll('.custom-dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                    opt.setAttribute('aria-selected', 'false'); // A11y
                });
                e.target.classList.add('selected');
                e.target.setAttribute('aria-selected', 'true'); // A11y

                customDropdown.classList.remove('open');
                if (dropdownButton) dropdownButton.setAttribute('aria-expanded', 'false'); // A11y
            }
        });
    }

    document.addEventListener('click', () => {
        if (customDropdown) {
            customDropdown.classList.remove('open');
            if (dropdownButton) dropdownButton.setAttribute('aria-expanded', 'false'); // A11y
        }
    });

    const selectedOption = document.querySelector('.custom-dropdown-option[data-value="3"]');
    if (selectedOption) {
        selectedOption.classList.add('selected');
        selectedOption.setAttribute('aria-selected', 'true'); // A11y
    }

    isDropdownInitialized = true;
}

// ==================== 고양이 발자국 애니메이션 ====================
function createPawPrint(x, y, rotation = 0) {
    const tvScreen = document.querySelector('.tv-screen');
    if (tvScreen) {
        const tvRect = tvScreen.getBoundingClientRect();
        const pawSize = 50;

        if (x + pawSize > tvRect.left &&
            x < tvRect.right &&
            y + pawSize > tvRect.top &&
            y < tvRect.bottom) {
            return;
        }
    }

    const container = document.getElementById('pawPrintsContainer');
    const paw = document.createElement('div');
    paw.className = 'paw-print';
    paw.style.left = `${x}px`;
    paw.style.top = `${y}px`;
    paw.style.transform = `rotate(${rotation}deg) scaleX(-1)`;

    container.appendChild(paw);

    setTimeout(() => {
        paw.remove();
    }, 8000);
}

let catPosition = { x: 0, y: 0 };
let catAngle = 0;
let isWalking = false;

function initializeCatPosition() {
    catPosition.x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
    catPosition.y = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
    catAngle = Math.random() * 360;
}

function getNextDirection() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 100;

    if (catPosition.x < margin) {
        catAngle = -45 + Math.random() * 90;
    } else if (catPosition.x > screenWidth - margin) {
        catAngle = 135 + Math.random() * 90;
    } else if (catPosition.y < margin) {
        catAngle = 45 + Math.random() * 90;
    } else if (catPosition.y > screenHeight - margin) {
        catAngle = 225 + Math.random() * 90;
    } else {
        catAngle += (Math.random() - 0.5) * 90;
    }

    catAngle = ((catAngle % 360) + 360) % 360;
}

function createContinuousPawTrail() {
    const pawCount = 8;
    const stepSize = 45;
    const stepWidth = 12;

    getNextDirection();

    const rad = (catAngle * Math.PI) / 180;

    for (let i = 0; i < pawCount; i++) {
        setTimeout(() => {
            const side = (i % 2 === 0) ? -1 : 1;
            const offsetX = Math.cos(rad) * stepSize * i + Math.sin(rad) * stepWidth * side;
            const offsetY = Math.sin(rad) * stepSize * i - Math.cos(rad) * stepWidth * side;

            const x = catPosition.x + offsetX;
            const y = catPosition.y + offsetY;

            const rotation = catAngle + 90 + (Math.random() - 0.5) * 10;

            createPawPrint(x, y, rotation);

            if (i === pawCount - 1) {
                catPosition.x = x;
                catPosition.y = y;
            }
        }, i * 250);
    }
}

function startContinuousWalking() {
    if (!isWalking) {
        initializeCatPosition();
        isWalking = true;
    }

    createContinuousPawTrail();

    setTimeout(startContinuousWalking, 1800);
}

// ==================== 접근성 설정 ====================
function setupAccessibility() {
    // 1. Info Popup (Modal)
    const infoPopup = document.getElementById('infoPopup');
    if (infoPopup) {
        infoPopup.setAttribute('role', 'dialog');
        infoPopup.setAttribute('aria-modal', 'true');
        infoPopup.setAttribute('aria-labelledby', 'infoPopupTitle');
        const title = infoPopup.querySelector('.info-title');
        if (title) title.id = 'infoPopupTitle';
    }

    // 2. Custom Alert (Modal)
    const alertOverlay = document.getElementById('customAlertOverlay');
    if (alertOverlay) {
        alertOverlay.setAttribute('role', 'alertdialog');
        alertOverlay.setAttribute('aria-modal', 'true');
        alertOverlay.setAttribute('aria-describedby', 'customAlertMessage');
    }

    // 3. Audio Toggle (Switch)
    const audioBtn = document.getElementById('audioToggleButton');
    if (audioBtn) {
        audioBtn.setAttribute('role', 'switch');
        if (!audioBtn.hasAttribute('aria-label')) {
            audioBtn.setAttribute('aria-label', '전체 사운드 켜기/끄기');
        }
        // aria-checked is handled in audio.js
    }

    // 4. Dropdown (Listbox)
    const dropdownList = document.getElementById('dropdownList');
    if (dropdownList) {
        dropdownList.setAttribute('role', 'listbox');
    }

    // 5. Dropdown Button
    const dropdownBtn = document.getElementById('dropdownButton');
    if (dropdownBtn) {
        dropdownBtn.setAttribute('aria-haspopup', 'listbox');
    }
}

