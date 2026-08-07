const POINTS_BY_ATTEMPT = [100, 80, 60, 40, 20, 10];

function pointsForAttempt(attemptNumber) {
  const idx = attemptNumber - 1;
  if (idx < 0 || idx >= POINTS_BY_ATTEMPT.length) return 0;
  return POINTS_BY_ATTEMPT[idx];
}

module.exports = { pointsForAttempt, POINTS_BY_ATTEMPT };
