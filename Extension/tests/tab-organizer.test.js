import test from "node:test";
import assert from "node:assert/strict";

import { classifyTab, planTabGroups, visibleTabGroupKey } from "../features/tools/tab-organizer.js";

test("tab organizer classifies common services locally", () => {
  assert.equal(classifyTab({ url: "https://github.com/openai/codex" }), "work");
  assert.equal(classifyTab({ url: "https://mail.google.com/mail/u/0/" }), "communication");
  assert.equal(classifyTab({ url: "https://www.youtube.com/watch?v=123" }), "video");
  assert.equal(classifyTab({ url: "https://www.wikipedia.org/wiki/Tab" }), "reading");
  assert.equal(classifyTab({ url: "chrome://settings" }), null);
});

test("tab organizer creates named per-window groups and skips pinned tabs", () => {
  const groups = planTabGroups([
    { id: 1, windowId: 7, url: "https://github.com", pinned: false },
    { id: 2, windowId: 7, url: "https://docs.google.com/document/d/1", pinned: false },
    { id: 3, windowId: 7, url: "https://youtube.com/watch?v=1", pinned: false },
    { id: 4, windowId: 7, url: "https://mail.google.com", pinned: true },
    { id: 5, windowId: 8, url: "https://github.com", pinned: false }
  ], { language: "ru" });

  assert.deepEqual(groups, [
    { category: "work", windowId: 7, title: "Работа", color: "blue", tabIds: [1, 2] },
    { category: "video", windowId: 7, title: "Видео", color: "blue", tabIds: [3] },
    { category: "work", windowId: 8, title: "Работа", color: "blue", tabIds: [5] }
  ]);
});

test("only named Chrome groups become popup folders", () => {
  assert.equal(visibleTabGroupKey({ windowId: 3, groupId: 8, groupTitle: "Work" }), "3:8");
  assert.equal(visibleTabGroupKey({ windowId: 3, groupId: 8, groupTitle: "" }), null);
  assert.equal(visibleTabGroupKey({ windowId: 3, groupId: 8, groupTitle: "   " }), null);
  assert.equal(visibleTabGroupKey({ windowId: 3, groupId: -1, groupTitle: "Work" }), null);
});
