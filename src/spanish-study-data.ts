export const spanishStudyQuestionTypes = ['multiple-choice', 'fill-blank', 'sentence-writing'] as const

export type SpanishStudyQuestionType = (typeof spanishStudyQuestionTypes)[number]
export type SpanishStudyLevel = 'A1' | 'A2'

export interface SpanishStudyOption {
  id: string
  text: string
}

interface SpanishStudyQuestionBase {
  id: string
  type: SpanishStudyQuestionType
  level: SpanishStudyLevel
  topic: string
  question: string
  correctAnswer: string
  acceptedAnswers: readonly string[]
  explanation: string
  exampleSentence: string
}

export interface MultipleChoiceQuestion extends SpanishStudyQuestionBase {
  type: 'multiple-choice'
  options: readonly SpanishStudyOption[]
}

export interface FillBlankQuestion extends SpanishStudyQuestionBase {
  type: 'fill-blank'
}

export interface SentenceWritingQuestion extends SpanishStudyQuestionBase {
  type: 'sentence-writing'
}

export type SpanishStudyQuestion = MultipleChoiceQuestion | FillBlankQuestion | SentenceWritingQuestion

export interface SpanishDailyStudySet {
  id: string
  questions: readonly [SpanishStudyQuestion, SpanishStudyQuestion, SpanishStudyQuestion]
}

const multipleChoice = (
  id: string,
  level: SpanishStudyLevel,
  topic: string,
  question: string,
  options: readonly SpanishStudyOption[],
  correctAnswer: string,
  explanation: string,
  exampleSentence: string,
): MultipleChoiceQuestion => ({
  id,
  type: 'multiple-choice',
  level,
  topic,
  question,
  options,
  correctAnswer,
  acceptedAnswers: [correctAnswer],
  explanation,
  exampleSentence,
})

const fillBlank = (
  id: string,
  level: SpanishStudyLevel,
  topic: string,
  question: string,
  correctAnswer: string,
  acceptedAnswers: readonly string[],
  explanation: string,
  exampleSentence: string,
): FillBlankQuestion => ({
  id,
  type: 'fill-blank',
  level,
  topic,
  question,
  correctAnswer,
  acceptedAnswers,
  explanation,
  exampleSentence,
})

const sentenceWriting = (
  id: string,
  level: SpanishStudyLevel,
  topic: string,
  question: string,
  correctAnswer: string,
  acceptedAnswers: readonly string[],
  explanation: string,
  exampleSentence: string,
): SentenceWritingQuestion => ({
  id,
  type: 'sentence-writing',
  level,
  topic,
  question,
  correctAnswer,
  acceptedAnswers,
  explanation,
  exampleSentence,
})

/**
 * Fourteen authored daily sets. Their date allocation is handled by the local
 * provider so this content can later be replaced by an API without changing UI.
 */
export const spanishDailyStudySets: readonly SpanishDailyStudySet[] = [
  {
    id: 'a1-core-verbs',
    questions: [
      multipleChoice(
        'a1d01-q1-tener-yo', 'A1', '불규칙 동사 tener',
        '¿Cuál es la forma correcta de "tener" para "yo"?',
        [{ id: 'A', text: 'tienes' }, { id: 'B', text: 'tengo' }, { id: 'C', text: 'tiene' }, { id: 'D', text: 'tenemos' }],
        'tengo',
        'tener는 현재시제 yo 형태에서 tengo로 불규칙하게 변해.',
        'Yo tengo una clase de español hoy.',
      ),
      fillBlank(
        'a1d01-q2-estudiar', 'A1', '현재시제',
        'Yo ___ español todos los días.', 'estudio', ['estudio'],
        'estudiar의 현재시제 yo 형태는 estudio야.',
        'Estudio español después del trabajo.',
      ),
      sentenceWriting(
        'a1d01-q3-levantarse', 'A1', '재귀동사와 시간',
        '나는 매일 아침 7시에 일어난다.',
        'Me levanto a las siete de la mañana todos los días.',
        ['Me levanto a las siete de la mañana todos los días.', 'Todos los días me levanto a las siete de la mañana.'],
        'levantarse는 재귀동사라 yo와 함께 me levanto를 사용해. a las siete는 “7시에”, todos los días는 “매일”이야.',
        'Todos los días me levanto a las siete de la mañana.',
      ),
    ],
  },
  {
    id: 'a1-ser-and-vivir',
    questions: [
      multipleChoice(
        'a1d02-q1-ser-ella', 'A1', '동사 ser',
        '¿Cuál es la forma correcta de "ser" para "ella"?',
        [{ id: 'A', text: 'soy' }, { id: 'B', text: 'eres' }, { id: 'C', text: 'es' }, { id: 'D', text: 'somos' }],
        'es',
        'ser의 ella 형태는 es야. 사람의 정체성이나 성격을 말할 때 자주 써.',
        'Ella es muy amable.',
      ),
      fillBlank(
        'a1d02-q2-vivir', 'A1', '현재시제',
        'Yo ___ en Seúl.', 'vivo', ['vivo'],
        'vivir의 현재시제 yo 형태는 vivo야.',
        'Vivo cerca de la estación.',
      ),
      sentenceWriting(
        'a1d02-q3-amable', 'A1', '성격 표현',
        '내 여동생은 아주 친절하다.',
        'Mi hermana es muy amable.',
        ['Mi hermana es muy amable.', 'Mi hermana menor es muy amable.'],
        '사람의 성격은 ser로 표현해. hermana는 여성 명사이므로 mi hermana라고 해.',
        'Mi hermana es muy amable.',
      ),
    ],
  },
  {
    id: 'a1-estar-location',
    questions: [
      multipleChoice(
        'a1d03-q1-estar-ubicacion', 'A1', '동사 estar',
        '“도서관은 어디에 있나요?”를 가장 잘 표현한 문장은?',
        [{ id: 'A', text: '¿Dónde es la biblioteca?' }, { id: 'B', text: '¿Dónde está la biblioteca?' }, { id: 'C', text: '¿Qué está la biblioteca?' }, { id: 'D', text: '¿Dónde hay la biblioteca?' }],
        '¿Dónde está la biblioteca?',
        '장소나 일시적인 위치는 estar를 사용해. ¿Dónde está ...?는 “...은 어디에 있나요?”야.',
        'La biblioteca está cerca del parque.',
      ),
      fillBlank(
        'a1d03-q2-estar-cafe', 'A1', '동사 estar',
        'Yo ___ en el café ahora.', 'estoy', ['estoy'],
        'estar의 현재시제 yo 형태는 estoy야.',
        'Estoy en casa ahora.',
      ),
      sentenceWriting(
        'a1d03-q3-estoy', 'A1', '위치 표현',
        '나는 카페에 있다.',
        'Estoy en el café.',
        ['Estoy en el café.', 'Yo estoy en el café.'],
        '현재 위치는 estar + en으로 말해. café는 남성 명사라 el café가 돼.',
        'Estoy en el café.',
      ),
    ],
  },
  {
    id: 'a1-hay-and-rooms',
    questions: [
      multipleChoice(
        'a1d04-q1-hay', 'A1', 'hay',
        '“테이블 위에 책 한 권이 있다.”에 알맞은 표현은?',
        [{ id: 'A', text: 'Está un libro en la mesa.' }, { id: 'B', text: 'Hay un libro en la mesa.' }, { id: 'C', text: 'Es un libro en la mesa.' }, { id: 'D', text: 'Tiene un libro en la mesa.' }],
        'Hay un libro en la mesa.',
        'hay는 “있다/있습니다”처럼 존재를 처음 소개할 때 사용해.',
        'Hay una planta junto a la ventana.',
      ),
      fillBlank(
        'a1d04-q2-hay-sillas', 'A1', 'hay',
        'En mi habitación ___ dos sillas.', 'hay', ['hay'],
        '여러 개가 있어도 hay 형태는 변하지 않아.',
        'En la clase hay veinte estudiantes.',
      ),
      sentenceWriting(
        'a1d04-q3-habitacion', 'A1', '방과 가구',
        '방에 의자가 두 개 있다.',
        'Hay dos sillas en la habitación.',
        ['Hay dos sillas en la habitación.', 'En la habitación hay dos sillas.'],
        '새로운 사물의 존재는 hay로 말해. dos sillas처럼 수량을 함께 쓸 수 있어.',
        'En la habitación hay dos sillas.',
      ),
    ],
  },
  {
    id: 'a1-articles-agreement',
    questions: [
      multipleChoice(
        'a1d05-q1-articulo-mochila', 'A1', '관사와 성',
        '빈칸에 알맞은 관사를 고르세요: ___ mochila es nueva.',
        [{ id: 'A', text: 'El' }, { id: 'B', text: 'La' }, { id: 'C', text: 'Los' }, { id: 'D', text: 'Unos' }],
        'La',
        'mochila는 여성 단수 명사라 정관사 la를 사용해.',
        'La mochila está en la silla.',
      ),
      fillBlank(
        'a1d05-q2-libros-rojos', 'A1', '형용사 일치',
        'Los libros son ___.', 'rojos', ['rojos'],
        'libros는 남성 복수이므로 rojo도 rojos로 성·수 일치를 해.',
        'Tengo dos cuadernos rojos.',
      ),
      sentenceWriting(
        'a1d05-q3-libros-rojos', 'A1', '관사와 형용사',
        '나는 빨간 책 몇 권을 산다.',
        'Compro unos libros rojos.',
        ['Compro unos libros rojos.', 'Yo compro unos libros rojos.'],
        'unos는 남성 복수의 “몇몇”이라는 뜻이야. rojos는 libros에 맞춰 남성 복수형을 써.',
        'Compro unos libros rojos.',
      ),
    ],
  },
  {
    id: 'a1-reflexive-routine',
    questions: [
      multipleChoice(
        'a1d06-q1-ducharse', 'A1', '재귀동사',
        '“나는 아침에 샤워한다.”에 알맞은 표현은?',
        [{ id: 'A', text: 'Yo ducho por la mañana.' }, { id: 'B', text: 'Me ducho por la mañana.' }, { id: 'C', text: 'Te duchas por la mañana.' }, { id: 'D', text: 'Se ducha por la mañana.' }],
        'Me ducho por la mañana.',
        'ducharse처럼 스스로 하는 행동은 재귀대명사 me를 함께 사용해.',
        'Me ducho antes de desayunar.',
      ),
      fillBlank(
        'a1d06-q2-acostarse', 'A1', '재귀동사',
        'Él ___ a las once.', 'se acuesta', ['se acuesta'],
        'acostarse의 él 형태는 se acuesta야. o가 ue로 바뀌는 어간 변화도 기억해.',
        'Mi padre se acuesta tarde.',
      ),
      sentenceWriting(
        'a1d06-q3-acostarse', 'A1', '일상생활',
        '그는 11시에 잠자리에 든다.',
        'Se acuesta a las once.',
        ['Se acuesta a las once.', 'Él se acuesta a las once.'],
        '3인칭 재귀대명사는 se야. 시간 앞에는 a las를 사용해.',
        'Él se acuesta a las once.',
      ),
    ],
  },
  {
    id: 'a1-near-future',
    questions: [
      multipleChoice(
        'a1d07-q1-ir-nosotros', 'A1', '동사 ir',
        '¿Cuál es la forma correcta de "ir" para "nosotros"?',
        [{ id: 'A', text: 'vamos' }, { id: 'B', text: 'vais' }, { id: 'C', text: 'van' }, { id: 'D', text: 'voy' }],
        'vamos',
        'ir의 nosotros 형태는 vamos야.',
        'Vamos al museo el sábado.',
      ),
      fillBlank(
        'a1d07-q2-voy-a', 'A1', '가까운 미래',
        'Mañana voy ___ estudiar español.', 'a', ['a'],
        '가까운 미래는 ir a + 동사원형으로 표현해. voy a estudiar는 “공부할 거야”야.',
        'Voy a cocinar esta noche.',
      ),
      sentenceWriting(
        'a1d07-q3-manana', 'A1', '가까운 미래',
        '내일 나는 스페인어를 공부할 것이다.',
        'Mañana voy a estudiar español.',
        ['Mañana voy a estudiar español.', 'Voy a estudiar español mañana.'],
        'ir a + 동사원형으로 가까운 미래를 만들 수 있어. mañana는 문장 앞이나 뒤에 둘 수 있어.',
        'Voy a estudiar español mañana.',
      ),
    ],
  },
  {
    id: 'a1-time-and-meals',
    questions: [
      multipleChoice(
        'a1d08-q1-ocho-media', 'A1', '시간',
        '¿Qué hora es? 8:30',
        [{ id: 'A', text: 'Son las ocho y media.' }, { id: 'B', text: 'Es las ocho y media.' }, { id: 'C', text: 'Son la ocho media.' }, { id: 'D', text: 'Está ocho y media.' }],
        'Son las ocho y media.',
        '1시를 제외한 시간에는 son las를 써. y media는 “30분”이야.',
        'Son las nueve y cuarto.',
      ),
      fillBlank(
        'a1d08-q2-desayunar', 'A1', '시간과 일상',
        'Yo ___ a las ocho y media.', 'desayuno', ['desayuno'],
        'desayunar의 yo 형태는 desayuno야.',
        'Desayuno con mi familia.',
      ),
      sentenceWriting(
        'a1d08-q3-desayuno', 'A1', '시간',
        '나는 8시 30분에 아침을 먹는다.',
        'Desayuno a las ocho y media.',
        ['Desayuno a las ocho y media.', 'Yo desayuno a las ocho y media.'],
        'a las + 시간으로 행동하는 시각을 말해. 8시 30분은 ocho y media야.',
        'Yo desayuno a las ocho y media.',
      ),
    ],
  },
  {
    id: 'a1-frequency-transport',
    questions: [
      multipleChoice(
        'a1d09-q1-siempre', 'A1', '빈도부사',
        '“나는 항상 버스로 학교에 간다.”의 siempre 위치로 알맞은 것은?',
        [{ id: 'A', text: 'Siempre voy al colegio en autobús.' }, { id: 'B', text: 'Voy al siempre colegio en autobús.' }, { id: 'C', text: 'Voy al colegio en siempre autobús.' }, { id: 'D', text: 'Voy siempre al colegio en el autobús.' }],
        'Siempre voy al colegio en autobús.',
        '빈도부사는 보통 활용된 동사 앞에 놓아. en autobús는 “버스로”야.',
        'Normalmente estudio por la noche.',
      ),
      fillBlank(
        'a1d09-q2-normalmente', 'A1', '빈도부사',
        'Nosotros ___ vamos en autobús.', 'normalmente', ['normalmente'],
        'normalmente는 “보통, 대개”라는 빈도부사야.',
        'Normalmente llego temprano.',
      ),
      sentenceWriting(
        'a1d09-q3-autobus', 'A1', '교통수단',
        '우리는 보통 버스로 간다.',
        'Normalmente vamos en autobús.',
        ['Normalmente vamos en autobús.', 'Vamos normalmente en autobús.'],
        'vamos는 ir의 nosotros 형태야. 교통수단에는 en autobús를 사용해.',
        'Normalmente vamos en autobús.',
      ),
    ],
  },
  {
    id: 'a1-prepositions-city',
    questions: [
      multipleChoice(
        'a1d10-q1-vivir-en', 'A1', '전치사 en',
        '빈칸에 알맞은 전치사를 고르세요: Vivo ___ Madrid.',
        [{ id: 'A', text: 'a' }, { id: 'B', text: 'de' }, { id: 'C', text: 'en' }, { id: 'D', text: 'con' }],
        'en',
        '도시나 국가 안에 사는 곳을 말할 때 en을 사용해.',
        'Vivo en España.',
      ),
      fillBlank(
        'a1d10-q2-al-lado', 'A1', '위치 전치사',
        'La farmacia está ___ lado del banco.', 'al', ['al'],
        'a + el은 al로 줄여 써. al lado de는 “~의 옆에”야.',
        'El café está al lado de la biblioteca.',
      ),
      sentenceWriting(
        'a1d10-q3-farmacia', 'A1', '위치 표현',
        '약국은 은행 옆에 있다.',
        'La farmacia está al lado del banco.',
        ['La farmacia está al lado del banco.'],
        '위치는 estar로 표현해. de + el도 del로 줄어들어 al lado del banco가 돼.',
        'El hotel está al lado del parque.',
      ),
    ],
  },
  {
    id: 'a1-gustar-hobbies',
    questions: [
      multipleChoice(
        'a1d11-q1-gustar', 'A1', '동사 gustar',
        '“나는 음악 듣는 것을 좋아한다.”에 알맞은 표현은?',
        [{ id: 'A', text: 'Me gusta escuchar música.' }, { id: 'B', text: 'Yo gusto escuchar música.' }, { id: 'C', text: 'Me gustan escuchar música.' }, { id: 'D', text: 'Me gusta escucho música.' }],
        'Me gusta escuchar música.',
        'gustar는 좋아하는 대상이 동사원형 하나일 때 gusta를 사용해. me는 “나에게”라는 뜻이야.',
        'Me gusta leer novelas.',
      ),
      fillBlank(
        'a1d11-q2-gusta-leer', 'A1', '동사 gustar',
        'Me ___ leer por la tarde.', 'gusta', ['gusta'],
        'leer라는 동사원형 활동 하나를 좋아하므로 gusta를 사용해.',
        'Me gusta cocinar.',
      ),
      sentenceWriting(
        'a1d11-q3-leer-tarde', 'A1', '취미',
        '나는 오후에 읽는 것을 좋아한다.',
        'Me gusta leer por la tarde.',
        ['Me gusta leer por la tarde.', 'A mí me gusta leer por la tarde.'],
        'gustar 뒤에는 동사원형을 쓸 수 있어. por la tarde는 “오후/저녁에”라는 뜻이야.',
        'A mí me gusta leer por la tarde.',
      ),
    ],
  },
  {
    id: 'a1-food-ordering',
    questions: [
      multipleChoice(
        'a1d12-q1-quiero', 'A1', '카페 표현',
        '카페에서 “물 한 잔을 원해요.”라고 할 때 알맞은 것은?',
        [{ id: 'A', text: 'Quiero un vaso de agua.' }, { id: 'B', text: 'Tengo un vaso de agua.' }, { id: 'C', text: 'Soy un vaso de agua.' }, { id: 'D', text: 'Voy un vaso de agua.' }],
        'Quiero un vaso de agua.',
        'quiero는 querer의 yo 형태로 “원하다”라는 뜻이야.',
        'Quiero un café, por favor.',
      ),
      fillBlank(
        'a1d12-q2-comer', 'A1', '현재시제',
        'Nosotros ___ paella los domingos.', 'comemos', ['comemos'],
        'comer의 nosotros 형태는 comemos야.',
        'Comemos juntos los domingos.',
      ),
      sentenceWriting(
        'a1d12-q3-agua', 'A1', '음식 주문',
        '물 한 잔을 원합니다.',
        'Quiero un vaso de agua.',
        ['Quiero un vaso de agua.', 'Quisiera un vaso de agua.'],
        'un vaso de agua는 “물 한 잔”이야. Quisiera는 더 공손한 대안 표현이야.',
        'Quisiera un vaso de agua, por favor.',
      ),
    ],
  },
  {
    id: 'a1-dates-and-days',
    questions: [
      multipleChoice(
        'a1d13-q1-dia-hoy', 'A1', '요일과 날짜',
        '“오늘은 무슨 요일인가요?”를 스페인어로 말하면?',
        [{ id: 'A', text: '¿Qué día es hoy?' }, { id: 'B', text: '¿Qué hora es hoy?' }, { id: 'C', text: '¿Dónde es hoy?' }, { id: 'D', text: '¿Quién día es hoy?' }],
        '¿Qué día es hoy?',
        'Qué día es hoy?는 오늘의 요일이나 날짜를 물을 때 쓰는 표현이야.',
        'Hoy es lunes.',
      ),
      fillBlank(
        'a1d13-q2-lunes', 'A1', '요일',
        'Hoy ___ lunes.', 'es', ['es'],
        '요일을 말할 때는 ser의 es를 사용해. 스페인어 요일은 보통 소문자로 써.',
        'Mañana es martes.',
      ),
      sentenceWriting(
        'a1d13-q3-fecha', 'A1', '날짜',
        '오늘은 10월 12일이다.',
        'Hoy es doce de octubre.',
        ['Hoy es doce de octubre.', 'Hoy es el doce de octubre.'],
        '날짜는 ser로 말하고, 스페인어에서는 숫자를 보통 기수로 읽어. el을 넣는 표현도 가능해.',
        'Mañana es trece de octubre.',
      ),
    ],
  },
  {
    id: 'a2-saber-and-language',
    questions: [
      multipleChoice(
        'a2d14-q1-saber-yo', 'A2', '불규칙 동사 saber',
        '¿Cuál es la forma correcta de "saber" para "yo"?',
        [{ id: 'A', text: 'sabes' }, { id: 'B', text: 'sé' }, { id: 'C', text: 'sabe' }, { id: 'D', text: 'sabemos' }],
        'sé',
        'saber의 yo 형태는 sé야. 악센트가 있는 형태를 기억해.',
        'Sé hablar un poco de español.',
      ),
      fillBlank(
        'a2d14-q2-conocer', 'A2', '동사 conocer',
        '¿Tú ___ Madrid?', 'conoces', ['conoces'],
        'conocer는 사람이나 장소를 “알다/알고 있다”라고 할 때 써. tú 형태는 conoces야.',
        'Conozco bien este barrio.',
      ),
      sentenceWriting(
        'a2d14-q3-hablar', 'A2', '언어 능력',
        '나는 스페인어를 조금 말할 줄 안다.',
        'Sé hablar un poco de español.',
        ['Sé hablar un poco de español.', 'Yo sé hablar un poco de español.'],
        'saber + 동사원형은 “~할 줄 알다”를 뜻해. un poco de는 “조금의”라는 표현이야.',
        'Sé escribir un poco en español.',
      ),
    ],
  },
]
