/**
 * Question 工具 - IPC 通道
 * 大模型通过 Question 工具向用户提问，用户选择/输入后回复
 */

export const QUESTION = {
  QUESTION_REPLY: 'MAIN_QUESTION__REPLY',
  QUESTION_REJECT: 'MAIN_QUESTION__REJECT',
} as const;
