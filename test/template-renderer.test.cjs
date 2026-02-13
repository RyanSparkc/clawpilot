const test = require('node:test');
const assert = require('node:assert/strict');

const { renderTemplate } = require('../src/runtime/template-renderer');

test('renderTemplate replaces role and task placeholders', () => {
  const template = 'Hi {{assistant_name}}, first task: {{task_1}}';
  const text = renderTemplate(template, {
    assistant_name: 'Hana',
    task_1: 'Draft weekly plan'
  });

  assert.equal(text, 'Hi Hana, first task: Draft weekly plan');
});
