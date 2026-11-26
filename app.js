const GAME_DURATION = 90;
const STAGE_TARGET = 10;
const STORAGE_NAME_KEY = 'peastarvutaja-player-name';
const STORAGE_LEADERBOARD_KEY = 'peastarvutaja-leaderboard';

const setupPanel = document.querySelector('#setup-panel');
const gamePanel = document.querySelector('#game-panel');
const resultPanel = document.querySelector('#result-panel');
const modeChooser = document.querySelector('#mode-chooser');
const practicePicker = document.querySelector('#practice-picker');
const playerNameInput = document.querySelector('#player-name');
const leaderboardCard = document.querySelector('#leaderboard-card');
const leaderboardList = document.querySelector('#leaderboard-list');
const clearLeaderboardButton = document.querySelector('#clear-leaderboard-button');

const challengeProgressPanel = document.querySelector('#challenge-progress-panel');
const practiceLevelPanel = document.querySelector('#practice-level-panel');
const practiceLevelName = document.querySelector('#practice-level-name');
const practiceLevelDescription = document.querySelector('#practice-level-description');
const stageTitleDisplay = document.querySelector('#stage-title');
const stageCountDisplay = document.querySelector('#stage-count');
const stageProgressDisplay = document.querySelector('#stage-progress');
const stageMeter = document.querySelector('#stage-meter');
const stageMeterFill = document.querySelector('#stage-meter-fill');

const questionArea = document.querySelector('.question-area');
const questionCaption = document.querySelector('#mode-caption');
const equation = document.querySelector('#equation');
const answerForm = document.querySelector('#answer-form');
const answerInput = document.querySelector('#answer-input');
const numberPad = document.querySelector('#number-pad');
const feedback = document.querySelector('#feedback');

const timerWrap = document.querySelector('#timer-wrap');
const timerLabel = document.querySelector('#timer-label');
const timerDisplay = document.querySelector('#timer');
const timerUnit = document.querySelector('#timer-unit');
const timeProgress = document.querySelector('#time-progress');
const timeProgressFill = document.querySelector('#time-progress-fill');
const countdownOverlay = document.querySelector('#countdown-overlay');
const countdownNumber = document.querySelector('#countdown-number');

const mainScoreLabel = document.querySelector('#main-score-label');
const mainScoreUnit = document.querySelector('#main-score-unit');
const scoreDisplay = document.querySelector('#score');
const correctLiveDisplay = document.querySelector('#correct-live');
const accuracyLiveDisplay = document.querySelector('#accuracy-live');
const streakDisplay = document.querySelector('#streak');
const attemptsDisplay = document.querySelector('#attempts');

const resultModeLabel = document.querySelector('#result-mode-label');
const resultTitle = document.querySelector('#result-title');
const resultCopy = document.querySelector('#result-copy');
const finalPointsCard = document.querySelector('#final-points-card');
const finalPoints = document.querySelector('#final-points');
const finalCorrect = document.querySelector('#final-correct');
const finalAccuracy = document.querySelector('#final-accuracy');
const finalStreak = document.querySelector('#final-streak');
const finalAttempts = document.querySelector('#final-attempts');

const practiceLevelDescriptions = {
  1: { name: 'Kuni 10', description: 'Liitmine ja lahutamine arvude ning vastustega 0–10.' },
  2: { name: 'Kuni 20', description: 'Liitmine ja lahutamine arvude ning vastustega 0–20.' },
  3: { name: 'Kümnetega', description: 'Kümneliste liitmine ja lahutamine kuni 100-ni.' },
  4: { name: 'Kuni 100', description: 'Liitmine ja lahutamine eri täisarvudega vahemikus 0–100.' },
};

let currentMode = null;
let lastMode = 'challenge';
let selectedPracticeLevel = 1;
let currentLevel = 1;
let currentQuestionLevel = 1;
let questionBag = [];
let currentAnswer = 0;
let score = 0;
let correctAnswers = 0;
let attempts = 0;
let streak = 0;
let bestStreak = 0;
let correctInStage = 0;
let secondsLeft = GAME_DURATION;
let timerId = null;
let countdownTimerId = null;
let answerTimeoutId = null;
let locked = false;

playerNameInput.value = safeGet(STORAGE_NAME_KEY) || '';
renderLeaderboard();

document.querySelector('#challenge-mode-button').addEventListener('click', startChallenge);
document.querySelector('#practice-mode-button').addEventListener('click', openPracticePicker);
document.querySelector('#practice-start-button').addEventListener('click', startPractice);
document.querySelector('#back-to-modes-button').addEventListener('click', backToModeChoices);
document.querySelector('#leave-game-button').addEventListener('click', leaveGame);
document.querySelector('#again-button').addEventListener('click', replayLastMode);
document.querySelector('#home-button').addEventListener('click', returnToSetup);
clearLeaderboardButton.addEventListener('click', clearLeaderboard);

document.querySelectorAll('[data-practice-level]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedPracticeLevel = Number(button.dataset.practiceLevel);
    document.querySelectorAll('[data-practice-level]').forEach((option) => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  });
});

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (locked || answerInput.disabled || answerInput.value.trim() === '') return;

  attempts += 1;
  const answerWasCorrect = Number(answerInput.value) === currentAnswer;

  if (answerWasCorrect) {
    correctAnswers += 1;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);

    if (currentMode === 'challenge') {
      const pointsEarned = currentLevel;
      score += pointsEarned;

      if (currentLevel < 3 && currentQuestionLevel === currentLevel) {
        correctInStage += 1;
        if (correctInStage >= STAGE_TARGET) {
          currentLevel += 1;
          correctInStage = 0;
          questionBag = [];
          showFeedback(`Õige! +${pointsEarned} punkti. ${currentLevel}. tase on avatud!`, 'correct');
        } else {
          showFeedback(`Õige! +${pointsEarned} punkti.`, 'correct');
        }
      } else {
        showFeedback(`Õige! +${pointsEarned} punkti.`, 'correct');
      }
    } else {
      showFeedback('Õige! Hästi tehtud.', 'correct');
    }
  } else {
    streak = 0;
    showFeedback(`Peaaegu! Õige vastus oli ${currentAnswer}.`, 'wrong');
  }

  updateGameStats();
  locked = true;
  answerInput.disabled = true;

  window.clearTimeout(answerTimeoutId);
  answerTimeoutId = window.setTimeout(() => {
    if (!gameIsVisible() || (currentMode === 'challenge' && secondsLeft <= 0)) return;

    locked = false;
    answerInput.disabled = false;
    answerInput.value = '';
    makeQuestion();
    showFeedback('Sisesta vastus või kasuta numbriklahve');
    focusAnswerInput();
  }, answerWasCorrect ? 350 : 850);
});

numberPad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || locked || answerInput.disabled) return;

  if (button.dataset.action === 'submit') {
    answerForm.requestSubmit();
  } else if (button.dataset.action === 'delete') {
    answerInput.value = answerInput.value.slice(0, -1);
  } else if (button.dataset.digit !== undefined) {
    answerInput.value += button.dataset.digit;
  }
});

function startChallenge() {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    playerNameInput.focus();
    playerNameInput.reportValidity();
    return;
  }

  playerNameInput.value = playerName;
  safeSet(STORAGE_NAME_KEY, playerName);
  lastMode = 'challenge';
  startSession('challenge');
}

function openPracticePicker() {
  modeChooser.classList.add('hidden');
  practicePicker.classList.remove('hidden');
  leaderboardCard.classList.add('hidden');
}

function backToModeChoices() {
  practicePicker.classList.add('hidden');
  modeChooser.classList.remove('hidden');
  leaderboardCard.classList.remove('hidden');
}

function startPractice() {
  const playerName = playerNameInput.value.trim();
  if (playerName) {
    playerNameInput.value = playerName;
    safeSet(STORAGE_NAME_KEY, playerName);
  }
  lastMode = 'practice';
  startSession('practice');
}

function startSession(mode) {
  clearAllTimers();
  currentMode = mode;
  score = 0;
  correctAnswers = 0;
  attempts = 0;
  streak = 0;
  bestStreak = 0;
  correctInStage = 0;
  currentLevel = 1;
  currentQuestionLevel = mode === 'practice' ? selectedPracticeLevel : 1;
  questionBag = [];
  currentAnswer = 0;
  secondsLeft = GAME_DURATION;
  locked = mode === 'challenge';

  setupPanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  gamePanel.classList.remove('hidden');
  leaderboardCard.classList.add('hidden');
  document.body.classList.add('is-playing');

  answerInput.value = '';
  answerInput.disabled = mode === 'challenge';
  countdownOverlay.classList.add('hidden');

  if (mode === 'challenge') {
    timerWrap.classList.remove('untimed');
    timerLabel.textContent = 'AEGA';
    timerDisplay.textContent = secondsLeft;
    timerUnit.textContent = 'sek';
    timeProgress.classList.remove('hidden');
    timeProgressFill.style.transform = 'scaleX(1)';
    timeProgressFill.classList.remove('urgent');
    challengeProgressPanel.classList.remove('hidden');
    practiceLevelPanel.classList.add('hidden');
    mainScoreLabel.textContent = 'PUNKTE';
    mainScoreUnit.textContent = 'punkti';
    questionCaption.textContent = 'AJAVÕISTLUS';
    document.querySelector('#leave-game-button').textContent = '← Katkesta';
  } else {
    timerWrap.classList.add('untimed');
    timerLabel.textContent = 'AEG';
    timerDisplay.textContent = '∞';
    timerUnit.textContent = 'piiranguta';
    timeProgress.classList.add('hidden');
    challengeProgressPanel.classList.add('hidden');
    practiceLevelPanel.classList.remove('hidden');
    mainScoreLabel.textContent = 'ÕIGEID';
    mainScoreUnit.textContent = 'vastust';
    questionCaption.textContent = 'HARJUTAMINE';
    document.querySelector('#leave-game-button').textContent = 'Lõpeta harjutus';
    const details = practiceLevelDescriptions[selectedPracticeLevel];
    practiceLevelName.textContent = details.name;
    practiceLevelDescription.textContent = details.description;
  }

  updateGameStats();
  makeQuestion();

  if (mode === 'challenge') {
    beginCountdown();
  } else {
    locked = false;
    answerInput.disabled = false;
    showFeedback('Sisesta vastus või kasuta numbriklahve');
    focusAnswerInput();
  }
}

function beginCountdown() {
  window.clearInterval(countdownTimerId);
  let count = 3;
  countdownNumber.textContent = count;
  countdownOverlay.classList.remove('hidden');
  showFeedback('Ole valmis!');

  countdownTimerId = window.setInterval(() => {
    count -= 1;
    if (count > 0) {
      countdownNumber.textContent = count;
      return;
    }

    window.clearInterval(countdownTimerId);
    countdownOverlay.classList.add('hidden');
    locked = false;
    answerInput.disabled = false;
    showFeedback('Aeg algas! Edu!');
    focusAnswerInput();
    startChallengeTimer();
  }, 1000);
}

function startChallengeTimer() {
  window.clearInterval(timerId);
  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    timerDisplay.textContent = secondsLeft;
    timeProgressFill.style.transform = `scaleX(${secondsLeft / GAME_DURATION})`;
    timeProgressFill.classList.toggle('urgent', secondsLeft <= 10);

    if (secondsLeft <= 0) {
      finishSession(true);
    }
  }, 1000);
}

function makeQuestion() {
  if (currentMode === 'challenge') {
    if (questionBag.length === 0) {
      if (currentLevel === 1) {
        questionBag = [1, 1, 1, 1, 1, 1];
      } else if (currentLevel === 2) {
        questionBag = [1, 1, 1, 2, 2, 2];
      } else {
        questionBag = [1, 2, 2, 3, 3, 3];
      }
      shuffle(questionBag);
    }
    currentQuestionLevel = questionBag.pop();
  } else {
    currentQuestionLevel = selectedPracticeLevel;
  }

  let first;
  let second;
  let max;

  if (currentQuestionLevel === 3) {
    first = randomInteger(0, 10) * 10;
    second = randomInteger(0, 10) * 10;
    max = 100;
  } else {
    max = currentQuestionLevel === 1 ? 10 : currentQuestionLevel === 2 ? 20 : 100;
    first = randomInteger(0, max);
    second = randomInteger(0, max);
  }

  if (Math.random() >= 0.5) {
    if (first + second > max) {
      second = randomInteger(0, max - first);
    }
    currentAnswer = first + second;
    equation.innerHTML = `${first} + ${second} <span>=</span>`;
  } else {
    if (second > first) [first, second] = [second, first];
    currentAnswer = first - second;
    equation.innerHTML = `${first} − ${second} <span>=</span>`;
  }
}

function updateGameStats() {
  const mainValue = currentMode === 'challenge' ? score : correctAnswers;
  scoreDisplay.textContent = mainValue;
  correctLiveDisplay.textContent = correctAnswers;
  accuracyLiveDisplay.textContent = attempts === 0
    ? '0%'
    : `${Math.round((correctAnswers / attempts) * 100)}%`;
  streakDisplay.textContent = streak;
  attemptsDisplay.textContent = attempts;

  if (currentMode === 'challenge') {
    const progress = currentLevel === 3 ? STAGE_TARGET : correctInStage;
    stageTitleDisplay.textContent = `${currentLevel}. tase`;
    stageCountDisplay.textContent = currentLevel === 3
      ? 'AVATUD'
      : `${correctInStage} / ${STAGE_TARGET}`;
    stageMeterFill.style.width = `${(progress / STAGE_TARGET) * 100}%`;
    stageMeter.setAttribute('aria-valuenow', progress);

    for (let level = 1; level <= 3; level += 1) {
      const step = document.querySelector(`#level-step-${level}`);
      step.classList.toggle('complete', level < currentLevel);
      step.classList.toggle('current', level === currentLevel);
    }

    stageProgressDisplay.textContent = currentLevel < 3
      ? `${STAGE_TARGET - correctInStage} õiget vastust järgmise tasemeni`
      : 'Kõik ajavõistluse tasemed on avatud';
  }
}

function finishSession(saveChallengeResult = false) {
  clearAllTimers();
  locked = true;
  answerInput.disabled = true;
  countdownOverlay.classList.add('hidden');
  gamePanel.classList.add('hidden');
  resultPanel.classList.remove('hidden');
  document.body.classList.remove('is-playing');

  const accuracy = attempts === 0
    ? 0
    : Math.round((correctAnswers / attempts) * 100);

  finalCorrect.textContent = correctAnswers;
  finalAccuracy.textContent = `${accuracy}%`;
  finalStreak.textContent = bestStreak;
  finalAttempts.textContent = attempts;

  if (currentMode === 'challenge') {
    finalPointsCard.classList.remove('hidden');
    finalPoints.textContent = score;
    resultModeLabel.textContent = 'AJAVÕISTLUS LÄBI';
    resultCopy.textContent = `Lahendasid ${attemptPhrase(correctAnswers)} ja kogusid ${score} punkti.`;
    resultTitle.textContent = currentLevel === 3
      ? 'Väga tubli! Kõik tasemed avatud!'
      : currentLevel === 2
        ? 'Tubli töö!'
        : 'Hea algus!';

    if (saveChallengeResult && attempts > 0) {
      saveLeaderboardEntry({
        name: playerNameInput.value.trim(),
        score,
        accuracy,
        bestStreak,
      });
    }
  } else {
    finalPointsCard.classList.add('hidden');
    resultModeLabel.textContent = 'HARJUTUS TEHTUD';
    resultCopy.textContent = `Vastasid õigesti ${correctAnswers} korda ${attempts} katsest.`;
    resultTitle.textContent = accuracy >= 80 ? 'Väga tubli harjutus!' : 'Hea harjutamine!';
  }

  leaderboardCard.classList.toggle('hidden', currentMode !== 'challenge');
}

function leaveGame() {
  if (currentMode === 'practice') {
    finishSession(false);
  } else {
    returnToSetup();
  }
}

function replayLastMode() {
  if (lastMode === 'practice') {
    startPractice();
  } else {
    startChallenge();
  }
}

function returnToSetup() {
  clearAllTimers();
  gamePanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  setupPanel.classList.remove('hidden');
  document.body.classList.remove('is-playing');
  answerInput.disabled = false;
  locked = false;
  practicePicker.classList.add('hidden');
  modeChooser.classList.remove('hidden');
  leaderboardCard.classList.remove('hidden');
}

function saveLeaderboardEntry(entry) {
  const entries = readLeaderboard();
  entries.push(entry);
  entries.sort((first, second) =>
    second.score - first.score
      || second.accuracy - first.accuracy
      || second.bestStreak - first.bestStreak
  );
  safeSet(STORAGE_LEADERBOARD_KEY, JSON.stringify(entries));
  renderLeaderboard();
}

function clearLeaderboard() {
  const confirmed = window.confirm(
    'Kas kustutame kõik selle brauseri edetabeli tulemused?'
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(STORAGE_LEADERBOARD_KEY);
  } catch {
    // Kui brauser ei luba kustutada, jääb olemasolev tabel alles.
  }

  renderLeaderboard();
}

function renderLeaderboard() {
  const entries = readLeaderboard();
  leaderboardList.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'Edetabel on veel tühi. Ole esimene!';
    leaderboardList.append(empty);
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement('li');
    const rank = document.createElement('span');
    const name = document.createElement('span');
    const result = document.createElement('span');

    rank.className = 'leaderboard-rank';
    rank.textContent = `${index + 1}.`;
    name.className = 'leaderboard-name';
    name.textContent = entry.name;
    result.className = 'leaderboard-score';
    result.textContent = `${entry.score} punkti · ${entry.accuracy}%`;
    row.append(rank, name, result);
    leaderboardList.append(row);
  });
}

function readLeaderboard() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_LEADERBOARD_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Mäng töötab ka siis, kui brauser ei luba kohalikku salvestamist.
  }
}

function showFeedback(message, kind = '') {
  feedback.textContent = message;
  feedback.className = `feedback ${kind}`.trim();
}

function focusAnswerInput() {
  if (!window.matchMedia('(pointer: coarse)').matches) {
    answerInput.focus();
  }
}

function gameIsVisible() {
  return !gamePanel.classList.contains('hidden');
}

function clearAllTimers() {
  window.clearInterval(timerId);
  window.clearInterval(countdownTimerId);
  window.clearTimeout(answerTimeoutId);
  timerId = null;
  countdownTimerId = null;
  answerTimeoutId = null;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInteger(0, index);
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
}

function attemptPhrase(correctCount) {
  if (correctCount === 1) return 'ühe tehte';
  return `${correctCount} tehet`;
}
