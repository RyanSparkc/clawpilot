function buildWeeklyReport(state) {
  const days = state.days || {};
  const tasks = Object.values(days).flatMap((day) => day.tasks || []);
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const blockedCount = tasks.filter((task) => task.status === 'blocked').length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0
    ? `${Math.round((doneCount / totalCount) * 100)}%`
    : '0%';

  return {
    completionRate,
    summary: `Done: ${doneCount}, Blocked: ${blockedCount}, Total: ${totalCount}`
  };
}

module.exports = {
  buildWeeklyReport
};
