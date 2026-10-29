import { afterEach, expect, it } from 'vitest';
import { createLayoutTest, createMockComponentRegistryWithBasics, screen, fireEvent, waitFor } from '@core/template-engine/__tests__/utils/layoutTestUtils';
import { Input } from '../../src/components/basic/Input';
import base from '../../layouts/_user_base.json';

let test: ReturnType<typeof createLayoutTest>;
afterEach(() => test?.cleanup());
function findSearch(value: any): any {
  if (!value || typeof value !== 'object') return;
  if (value.name === 'Input' && value.props?.name === 'q') return value;
  return Object.values(value).map(findSearch).find(Boolean);
}

it.each(['', '/shop'])('모바일 메뉴 검색은 상품 검색어를 전달하고 메뉴를 닫는다 (%s)', async (shopBase) => {
  const registry = createMockComponentRegistryWithBasics();
  registry.register('basic', 'Input', Input);
  test = createLayoutTest({ components: [findSearch(base)] }, {
    componentRegistry: registry as any,
    initialState: { _global: { shopBase, mobileMenuOpen: true } },
  });
  await test.render();
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '콘돔' } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(test.getNavigationHistory()).toHaveLength(1));
  const url = new URL(test.getNavigationHistory()[0], 'https://lusento.kr');
  expect(url.pathname).toBe(`${shopBase}/products`);
  expect(url.searchParams.get('keyword')).toBe('콘돔');
  expect(url.searchParams.get('page')).toBe('1');
  expect(test.getState()._global.mobileMenuOpen).toBe(false);
});
