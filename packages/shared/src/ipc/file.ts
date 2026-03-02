/**
 * 文件 / File - IPC 通道
 * 参考 OpenCode SDK: https://opencode.ai/docs/sdk/#files
 */

export const FILE = {
  OPENCODE_FILE_READ: 'MAIN_OPENCODE__FILE_READ',
  OPENCODE_FIND_FILES: 'MAIN_OPENCODE__FIND_FILES',
  OPENCODE_PROJECT_CURRENT: 'MAIN_OPENCODE__PROJECT_CURRENT',
  /** 本地文件选择并读取（Electron dialog + fs） */
  FILE_PICK_AND_READ: 'MAIN_FILE__PICK_AND_READ',
  PROJECT_LIST: 'MAIN_OPENCODE__PROJECT_LIST',
  PATH_GET: 'MAIN_OPENCODE__PATH_GET',
} as const;
