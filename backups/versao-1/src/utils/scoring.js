const calculatePoints = (timeInSeconds) => {
  if (timeInSeconds < 600) return 25;
  if (timeInSeconds < 900) return 20;
  return 15;
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

module.exports = { calculatePoints, formatTime };