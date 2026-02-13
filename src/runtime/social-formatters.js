function formatWins(wins) {
  return wins.map((win) => `- ${win}`).join('\n');
}

function formatSocialPost(channel, data) {
  const winsBlock = formatWins(data.wins || []);
  const lesson = data.lesson || '';

  if (channel === 'linkedin') {
    return `Today I shipped:\n${winsBlock}\nKey lesson: ${lesson}`;
  }

  if (channel === 'x') {
    return `Wins:\n${winsBlock}\nLesson: ${lesson}`;
  }

  return `Daily recap\n${winsBlock}\nLesson: ${lesson}`;
}

module.exports = {
  formatSocialPost
};
