export interface Exercise {
  id: string;
  title: string;
  durationMin: number;
  description: string;
  steps: string[];
  icon: string; // Ionicons name for the placeholder video card
  /** Only shown as a contextual card when the current session is long. */
  contextual?: boolean;
}

export const exercises: Exercise[] = [
  {
    id: 'neck_warmup',
    title: 'Разминка для шеи',
    durationMin: 5,
    description:
      'Короткая разминка снимает напряжение в шее и верхней части спины, накопленное за время сидячей работы.',
    steps: [
      'Сядьте прямо, расслабьте плечи',
      'Медленно наклоните голову к правому плечу, задержитесь на 10 секунд',
      'Повторите наклон к левому плечу',
      'Аккуратно опустите подбородок к груди на 10 секунд',
      'Сделайте по 5 медленных кругов головой в каждую сторону',
    ],
    icon: 'body',
  },
  {
    id: 'back_exercise',
    title: 'Упражнение для спины',
    durationMin: 3,
    description:
      'Простое упражнение укрепляет мышцы спины и помогает дольше удерживать правильную осанку без усилий.',
    steps: [
      'Встаньте прямо, ноги на ширине плеч',
      'Сведите лопатки вместе и задержитесь на 5 секунд',
      'Плавно расслабьте плечи',
      'Повторите 10 раз',
      'Завершите лёгким наклоном вперёд, чтобы растянуть спину',
    ],
    icon: 'fitness',
  },
  {
    id: 'cat_cow',
    title: 'Кошка-корова',
    durationMin: 4,
    description:
      'Классическое упражнение из йоги для гибкости позвоночника — снимает скованность после долгого сидения.',
    steps: [
      'Встаньте на четвереньки',
      'На вдохе прогните спину вниз, поднимите голову и таз (поза «корова»)',
      'На выдохе округлите спину вверх, опустите голову (поза «кошка»)',
      'Повторите 10-15 раз в медленном темпе, синхронизируя движение с дыханием',
    ],
    icon: 'accessibility',
  },
  {
    id: 'walk_break',
    title: 'Пора пройтись',
    durationMin: 2,
    description: 'Вы сидите уже час. Короткая прогулка разгружает спину и восстанавливает кровообращение.',
    steps: [
      'Встаньте из-за стола',
      'Пройдитесь по комнате или коридору 2-3 минуты',
      'Сделайте несколько глубоких вдохов у окна',
      'Вернитесь к работе с прямой спиной',
    ],
    icon: 'walk',
    contextual: true,
  },
];

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(e => e.id === id);
}

export function getNextExercise(currentId: string): Exercise {
  const idx = exercises.findIndex(e => e.id === currentId);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % exercises.length;
  return exercises[nextIdx];
}
