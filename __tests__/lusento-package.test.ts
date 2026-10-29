import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import { describe, expect, it, vi } from 'vitest';

const root = path.resolve(__dirname, '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const manifest = readJson('template.json');

function objects(value: unknown): any[] {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(objects)];
}

describe('루센토 독립 템플릿 패키지', () => {
  it('빌드 번들이 새 전역 이름으로 컴포넌트와 레이아웃의 전용 핸들러를 등록한다', () => {
    const registered = new Map<string, unknown>();
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const context: any = {
      React, ReactDOM, ReactJSXRuntime, console,
      navigator: { userAgent: 'test', platform: 'test' },
      document: { readyState: 'complete' },
      window: { G7Core: {
        createLogger: () => logger,
        getActionDispatcher: () => ({ registerHandler: (name: string, handler: unknown) => registered.set(name, handler) }),
        identity: { setLauncher: vi.fn() },
        layoutEditor: { registerWidget: vi.fn() },
        state: { get: () => ({}), set: vi.fn() },
      } },
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, manifest.assets.js[0]), 'utf8'), context);
    expect(context.SirsoftBasic).toBeUndefined();
    expect(context.LusentoSite.templateMetadata.identifier).toBe('lusento-site');
    for (const name of ['Div', 'Input', 'CategoryHeader', 'Footer', 'ProductCard', 'initTemplate']) {
      expect(context.LusentoSite[name]).toBeDefined();
    }
    const purchase = readJson('layouts/partials/shop/detail/_purchase_card.json');
    const names = objects(purchase).map(node => node.handler).filter(name => typeof name === 'string' && name.startsWith('lusento-site.'));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(registered.has(name), name).toBe(true);
    expect([...registered.keys()].some(name => name.startsWith('sirsoft-basic.'))).toBe(false);
    expect(registered.has('initTheme')).toBe(true);
    expect(context.window.G7TemplateHandlers).toBeDefined();
  });

  it('컴포넌트·편집기 식별자와 배포 자산이 템플릿 패키지 안에서 연결된다', () => {
    expect(readJson('components.json').templateId).toBe(manifest.identifier);
    expect(readJson('editor-spec.json').templateId).toBe(manifest.identifier);
    expect(readJson('package.json').version).toBe(manifest.version);
    expect(readJson('package-lock.json').version).toBe(manifest.version);
    for (const asset of [...manifest.assets.js, ...manifest.assets.css]) {
      expect(fs.statSync(path.join(root, asset)).size).toBeGreaterThan(0);
    }
    expect(manifest.github_url ?? '').not.toContain('gnuboard/g7-template-sirsoft-basic');
  });

  it('카탈로그 모듈의 공통 베이스와 비교 API 연결을 보존한다', () => {
    const base = readJson('layouts/_user_base.json');
    const nodes = objects(base);
    expect(base.layout_name).toBe('_user_base');
    for (const id of ['main_content_area', 'main_content']) expect(nodes.some(node => node.id === id)).toBe(true);
    expect(nodes.some(node => node.id === 'main_content' && node.slot === 'content')).toBe(true);
    expect(JSON.stringify(readJson('layouts/shop/compare.json'))).toContain('/api/modules/lusento-catalog/');
    expect(fs.existsSync(path.join(root, 'resources/css/product-list.css'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'modules'))).toBe(false);
  });
});
