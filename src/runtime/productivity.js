const { ensureDayState } = require('./state-store');

function handleMorning({ dateKey, state, tasks, assistantName }) {
  const day = ensureDayState(state, dateKey);
  day.tasks = tasks.map((title) => ({
    title,
    status: 'pending'
  }));

  return {
    message: `${assistantName} morning plan:\n- ${tasks.join('\n- ')}`
  };
}

function handleMidday({ dateKey, state, statuses }) {
  const day = ensureDayState(state, dateKey);
  day.tasks = day.tasks.map((task, index) => ({
    ...task,
    status: statuses[index] || task.status
  }));

  const blockedCount = day.tasks.filter((task) => task.status === 'blocked').length;

  return {
    message: `Midday check-in complete. blocked count: ${blockedCount}`
  };
}

function handleEvening({ dateKey, state }) {
  const day = ensureDayState(state, dateKey);
  const doneCount = day.tasks.filter((task) => task.status === 'done').length;

  return {
    message: `Evening review: ${doneCount}/${day.tasks.length} done. First task for tomorrow: define priorities.`
  };
}

module.exports = {
  handleMorning,
  handleMidday,
  handleEvening
};
