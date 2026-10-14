# Room Rendering Standard

이 문서는 향후 Baseball Room과 Knitting Room을 PNG 기반 방으로 전환할 때 사용할 공통 제작·배치 규격이다. 현재 화면의 CSS나 방 배치를 변경하기 위한 문서가 아니다.

## 1. 현재 코드에서 확인한 기준값

측정 기준은 현재 앱을 `1440 × 1000 CSS px` 뷰포트에서 실제로 렌더링한 결과다. CSS px와 이미지의 logical px은 서로 다른 단위다.

| 항목 | 실제 값 | 근거 |
| --- | ---: | --- |
| Overview map | `476 × 476 CSS px` | `min(480px, calc(35vw - 28px))` |
| Overview Room container (01/02/03 모두) | `199.90625 × 199.90625 CSS px` | map 폭의 `42%`, `aspect-ratio: 1` |
| 01 Baseball 중심 | `(719.984375, 384.984375) CSS px` | viewport 좌표 |
| 02 Spanish 중심 | `(586.703125, 599.1875) CSS px` | viewport 좌표 |
| 03 Knitting 중심 | `(853.296875, 599.1875) CSS px` | viewport 좌표 |
| Detail panel | `899.59375 × 868 CSS px` | stage 폭의 `65%` |
| Spanish Detail canvas | `822 × 822 CSS px` | `min(100%, 860px, 100svh - 178px)` |
| Detail / Overview Room scale | `4.111927466×` | `822 / 199.90625` |

위 픽셀 측정값은 기준 뷰포트에서만 고정이다. 실제 앱은 반응형이므로 다른 viewport에서는 아래 CSS 수식이 최종 표시 크기를 결정한다.

- Desktop Overview map: `min(480px, calc(35vw - 28px))`
- Mobile (`max-width: 760px`) Overview map: `min(100%, 480px)`
- 모든 Overview Room container: map 폭의 `42%`, 정사각형
- Detail panel: stage 폭의 `65%`
- Desktop Detail canvas: `min(100%, 860px, calc(100svh - 178px))`
- Mobile Detail canvas: `min(100%, 560px, calc(100svh - 246px))`

현재 Overview의 앵커는 map 좌표계에서 Baseball `top 4% / left 29%`, Spanish `top 49% / left 1%`, Knitting `top 49% / right 1%`이다. 방 번호도 같은 map 좌표계에서 Baseball `top 1% / left 28%`, Spanish `top 46% / left 0`, Knitting `top 46% / right 0`에 놓인다. 이 값은 새 PNG 제작 과정에서 변경하지 않는다.

## 2. Room Shell Standard

공통 **Visual Stage**는 정사각형 컨테이너이며, 왼쪽 위가 원점이다. Overview와 Detail은 이 stage를 서로 다른 CSS 크기로 표시할 뿐, 내부 논리 좌표를 다시 계산하지 않는다.

```text
logical stage: 1052 × 1052
origin:        (0, 0), top-left
x axis:        right
y axis:        down
stage anchor:  (526, 526)
```

현재 CSS 기반 Baseball/Knitting shell은 별도의 polygon으로 그려져 있고, Spanish는 PNG다. 그러므로 세 방의 픽셀 외곽을 이미 동일한 alpha bounding box로 통일한 상태는 아니다. 앞으로 새 PNG를 만들 때는 현재 정상인 Spanish의 **측정된 가시 외곽**을 공통 참조로 사용한다.

| reference | logical bounds | 비고 |
| --- | --- | --- |
| Spanish visible room envelope | `x: 17, y: 1, width: 1018, height: 1051` | 현재 `spanish-room-bg.png`의 alpha > 0 bounds |
| visible envelope centre | `(526, 526.5)` | stage centre와 실질적으로 일치 |

새 Background는 방의 벽·바닥·외곽이 위 envelope 안에서 Spanish와 같은 방향·여백·시각적 중심을 갖도록 제작한다. 가구가 없는 Background의 방 바깥은 alpha `0`이어야 한다. 미세한 anti-aliasing 때문에 alpha bounds가 1px 달라질 경우, 시각적인 외곽과 중앙 정렬을 우선하고 무작정 확대/이동하지 않는다.

## 3. Asset Canvas Standard

### 현재 브라우저 런타임 규격 — 사용해야 하는 규격

```text
PNG canvas: 1052 × 1052 px, RGBA
Background / every furniture layer: identical dimensions and origin
object placement: identical logical coordinate system
```

현재 실제로 번들에 포함되는 Spanish 파일은 모두 `1052 × 1052 px`다.

| runtime asset | alpha bounds |
| --- | --- |
| `src/assets/spanish-room-bg.png` | `x:17, y:1, w:1018, h:1051` |
| `src/assets/spanish-bookshelf-layer.png` | `x:169, y:109, w:319, h:559` |
| `src/assets/spanish-desk-layer.png` | `x:520, y:478, w:326, h:303` |

따라서 **새로 프로젝트에 적용할 PNG room asset의 권장 캔버스는 1052 × 1052px**다. 새 파일이 1254px이거나 가구 레이어만 다른 크기이면 `object-fit: contain`이 여백을 다르게 해석하여 가구가 어긋난다.

### 1254 × 1254px에 대한 기록

승인된 Spanish 원본 작업 캔버스는 `1254 × 1254px`였다. 현재 화면 크기를 보정할 때 세 파일을 모두 같은 원본 영역 `x:101, y:90, w:1052, h:1052`로 lossless crop하여 런타임 파일을 만들었다. 보관본은 `src/assets/.spanish-room-1254-backup/`에 있다.

1254px 원본은 이력·재편집용이며, 현재 렌더러의 공통 PNG 규격은 아니다. 원본을 다시 쓰려면 **Background와 모든 furniture layer를 함께** 동일한 1052px runtime 좌표계로 변환해야 한다. 한 방 안에서 1254과 1052 좌표계를 섞지 않는다.

## 4. Background와 Furniture Layer 제작 규칙

한 방은 다음 순서의 독립 레이어로 구성한다.

```text
Room Visual Stage (1052 × 1052)
├─ Background PNG
├─ Interactive Furniture PNG layers (0–2)
├─ Interaction hit areas (HTML/SVG)
└─ UI layer (HTML)
```

1. Background와 모든 furniture PNG는 `1052 × 1052`, RGBA, 같은 `(0,0)` 원점을 사용한다.
2. Furniture PNG는 가구와 그 가구에 속한 소품만 그린다. 나머지 픽셀의 alpha는 반드시 `0`이다.
3. 레이어 자체에 `translate`, 개별 `scale`, 별도의 `object-position`을 넣지 않는다. 모든 `<img>`는 stage에 `inset: 0; width: 100%; height: 100%; object-fit: contain`으로 겹친다.
4. 책장·책상처럼 미래에 상호작용할 가구는 각각 별도 PNG로 보관한다. Background에 합성해 복제하지 않는다.
5. 배경과 가구의 레이어 순서는 Background → furniture → hit areas → UI다. furniture 사이 순서가 필요한 경우 DOM 순서로만 정하고, asset 좌표는 바꾸지 않는다.
6. 현재 Spanish PNG는 `image-rendering: auto`로 동일하게 resample된다. 새 PNG room도 이 처리를 적용해 승인된 픽셀 cluster를 유지한다. generic `.isometric-room`의 `pixelated` 상속에만 의존하지 않는다.

## 5. Overview / Detail Rendering Standard

Overview와 Detail은 동일한 이미지 파일과 동일한 logical stage를 재사용한다.

```text
Overview CSS scale = (0.42 × overview map CSS width) / 1052
Detail CSS scale   = detail canvas CSS width / 1052
```

기준 viewport에서 Spanish는 Overview에서 logical px 하나당 `0.19002495 CSS px`, Detail에서 `0.78136882 CSS px`로 렌더링됐다. 그 결과 Detail은 Overview보다 `4.111927466×` 크다. 이는 고정 상수가 아니라 viewport 및 `svh`에 따라 변하는 계산 결과다.

규칙은 다음과 같다.

- 방의 Overview 위치·크기·번호 위치는 기존 CSS 앵커를 보존한다.
- Detail은 기존 오른쪽 `65%` panel과 정사각 canvas를 그대로 사용한다.
- Background와 모든 furniture layer는 Overview와 Detail 모두 원점 `(0,0)`에 한 번씩만 렌더링한다.
- `object-fit: contain`을 유지하고 `width/height`를 다르게 주지 않는다. 비율 왜곡·자르기·개별 `transform`을 금지한다.
- 현재 Detail 전환에는 panel/overview의 opacity 및 translate 애니메이션만 있다. asset 또는 stage 좌표에 scale transform은 없다.

## 6. Interactive Furniture 좌표 규칙

Spanish Room의 책장과 책상은 현재 이 규칙으로 Detail Mode에서만 클릭 가능하다. hit area는 PNG 전체를 버튼으로 만들지 않고, 같은 1052 logical 좌표계의 SVG path에서 생성한다. Overview에는 hit area DOM을 렌더링하지 않는다.

```text
CSS left   = (logicalX / 1052) × 100%
CSS top    = (logicalY / 1052) × 100%
CSS width  = (logicalWidth / 1052) × 100%
CSS height = (logicalHeight / 1052) × 100%
```

현재 Spanish의 alpha-derived 배치 가이드는 다음과 같다. 실제 hit path는 `src/room-rendering.ts`의 `furnitureHitAreas.spanish`에 정의되어 있으며, 책장은 전체 외곽 path, 책상은 상판·본체 path만 사용한다. 의자는 독립 hit area가 없다.

| furniture | logical hit-area guide |
| --- | --- |
| Bookshelf | `x:169, y:109, w:319, h:559` |
| Desk + chair + props | `x:520, y:478, w:326, h:303` |

hit area는 `.room-ui-layer` 또는 전용 hit-area layer에 두고, detail에서만 pointer event를 활성화한다. 이 방식은 Overview/Detail의 CSS scale이 달라도 동일한 백분율 좌표를 사용하므로 실제 가구 위치와 맞는다.

## 7. 새 PNG Room 제작 절차

1. `1052 × 1052 RGBA` 파일을 만든다.
2. Spanish reference shell envelope (`17,1,1018,1051`)과 stage anchor `(526,526)`에 맞춰 벽·바닥의 원근과 외곽을 배치한다.
3. 가구 없는 Background를 하나 만든다. 방 외부 alpha가 `0`인지 확인한다.
4. Interactive furniture마다 같은 1052 캔버스의 투명 PNG를 만든다. furniture 바깥은 alpha `0`으로 둔다.
5. 각 layer를 `(0,0)`에 합성해 색·원근·바닥 접점·중앙 정렬을 검토한다. 개별 layer 이동으로 맞추지 않는다.
6. alpha bounds, canvas 크기, 모든 레이어의 dimensions를 검사한다.
7. 기존 `roomDefinitions`에 Background와 `visualLayers`를 등록하고 Spanish와 같은 full-canvas layer markup을 사용한다. DOM/CSS 방을 제거하는 변경은 PNG 검수가 끝난 후 별도 작업으로 한다.
8. 기준 viewport와 실제 대상 viewport에서 Overview/Detail을 확인한다. Baseball/Knitting의 앵커와 room number 위치는 바꾸지 않는다.

## 8. Codex 이미지 제작 요청에 넣을 공통 규격

아래 블록을 새 Room PNG 제작 요청에 포함한다.

```text
Create an RGBA transparent PNG layer for the current Room Rendering Standard.
Canvas: 1052 × 1052 px.
Coordinate system: origin (0,0) at top-left; x grows right, y grows down.
Reference visible room envelope: x=17, y=1, width=1018, height=1051.
Visual-stage anchor: (526,526).
Match the existing Spanish Room camera angle, pixel scale, and isometric direction.
For a furniture layer, draw only the specified furniture; every other pixel must have alpha 0.
Do not crop, scale, translate, or redraw the Background. All supplied layers must align when stacked at (0,0).
Use the same 1052 × 1052 coordinate system for Background, every furniture layer, and hit-area coordinates.
```

## 9. Source of truth

- Central metadata: `src/room-rendering.ts`
- Runtime room definitions and asset order: `src/rooms.ts`
- Layer markup: `src/main.ts`
- Responsive placement and display formulas: `src/style.css`

`room-rendering.ts` is the shared coordinate source for authored assets and Spanish furniture hit paths. It does not alter PNG pixels, layer placement, room layout, or Overview/Detail sizing. When a future room is converted, read the standard from that module instead of inventing per-room canvas, anchor, or hit-area coordinates.
