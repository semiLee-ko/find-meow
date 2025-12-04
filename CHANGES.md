# Find Meow 게임 업데이트 완료 ✅

## 변경 사항

### 1. 이미지 파일명 형식 변경
- **이전**: `channel1.png`, `channel2.png`, ...
- **현재**: `channel0001.png`, `channel0002.png`, ... `channel0100.png`
- 4자리 숫자로 통일 (왼쪽에 0 채움)

### 2. 채널 번호와 이미지 분리
- 채널 번호는 사용자가 입력하는 값 (1~999)
- 실제 표시되는 이미지는 **랜덤으로 선택**
- 채널 번호는 결과 화면에 표시용으로만 사용

### 3. 중복 이미지 방지 기능 추가
- 한 게임 내에서 **같은 이미지가 두 번 나오지 않음**
- `usedImages` 배열로 이미 사용된 이미지 추적
- 각 플레이어가 채널 변경 시, 아직 선택되지 않은 이미지 중에서만 랜덤 선택
- 게임 리셋 시 `usedImages` 배열도 초기화

## 주요 코드 변경

### 이미지 목록 생성 (자동)
```javascript
const channelImages = [];
for (let i = 1; i <= 100; i++) {
    const paddedNum = String(i).padStart(4, '0');
    channelImages.push(`channel${paddedNum}.png`);
}
```

### 중복 방지 로직
```javascript
// 사용 가능한 이미지 필터링
const availableImages = channelImages.filter(img => !usedImages.includes(img));

// 랜덤 선택
const randomIndex = Math.floor(Math.random() * availableImages.length);
currentImage = availableImages[randomIndex];

// 사용된 이미지 목록에 추가
usedImages.push(currentImage);
```

## 사용 방법

### 이미지 파일 준비
1. `images/channels/` 폴더에 이미지 파일 저장
2. 파일명: `channel0001.png`, `channel0002.png`, ...
3. 필요한 만큼 준비 (참여 인원보다 많게)

### 고양이 위치 정보 설정
`point/json/pointInfo.json` 파일에 각 이미지의 고양이 좌표 입력:

```json
{
  "channel0001.png": {
    "cats": [
      { "id": 1, "x": 0.25, "y": 0.30 },
      { "id": 2, "x": 0.65, "y": 0.45 }
    ]
  },
  "channel0002.png": {
    "cats": [
      { "id": 1, "x": 0.50, "y": 0.50 }
    ]
  }
}
```

## 게임 플레이 흐름

1. **참여 인원 선택** (1~10명)
2. **각 플레이어 차례**:
   - 이름 입력
   - 채널 번호 입력 (1~999)
   - "채널변경" 버튼 클릭 → **랜덤 이미지 표시** (중복 제외)
   - 고양이 위치 포인터 자동 표시
   - "확정" 버튼으로 다음 플레이어로
3. **결과 확인**: 고양이 마릿수 순으로 순위 표시

## 주의사항

- 참여 인원이 많을 경우, 충분한 이미지를 준비해야 합니다
- 사용 가능한 이미지가 모두 소진되면 경고 메시지가 표시됩니다
- 이미지 개수를 변경하려면 `index.html`의 루프 최대값(100)을 수정하세요

## 파일 구조

```
find-meow/
├── index.html                    # 메인 게임 파일
├── README.md                     # 사용 설명서
├── images/
│   └── channels/                # 이미지 폴더
│       ├── channel0001.png
│       ├── channel0002.png
│       └── ...
└── point/
    └── json/
        └── pointInfo.json       # 고양이 위치 정보
```

## 테스트 방법

로컬 서버가 실행 중입니다:
```
http://localhost:8000/index.html
```

브라우저에서 접속하여 테스트하세요!
