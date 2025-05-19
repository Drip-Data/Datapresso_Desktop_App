/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // 可以在这里定义更多的环境变量类型
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}