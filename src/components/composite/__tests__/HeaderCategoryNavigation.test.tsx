// e2e:allow Vitest actual-component regression test for desktop category navigation.
/**
 * @file HeaderCategoryNavigation.test.tsx
 * @description Header custom navigation regression tests.
 *
 * When `navigationItems` is supplied, Home and Popular remain fixed while the
 * former Shop/board entries are replaced by the supplied commerce links. Items
 * beyond `maxVisibleNavigationItems` are available from the existing More menu.
 *
 * @scenario surface=desktop
 * @effects home_and_popular_remain_first, all_products_precedes_active_categories, desktop_overflow_uses_more_menu, category_click_uses_canonical_shop_path, category_header_wrapper_fixes_custom_navigation_mode, omitted_custom_navigation_preserves_component_fallback
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CategoryHeader from '../CategoryHeader';
import Header from '../Header';

const dispatch = vi.fn();

const boards = [
  { id: 1, name: '자유게시판', slug: 'free' },
  { id: 2, name: '질문답변', slug: 'qna' },
];

const navigationItems = [
  { id: 'all-products', label: '전체상품', path: '/shop/products' },
  { id: 10, label: '디지털기기', path: '/shop/category/digital' },
  { id: 20, label: '생활용품', path: '/shop/category/living' },
];

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  dispatch.mockReset();

  (window as any).G7Core = {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.home': '홈',
        'nav.popular': '인기',
        'nav.shop': '쇼핑',
        'nav.more': '더보기',
        'common.search_placeholder': '검색',
        'common.search': '상품 검색',
      };
      return translations[key] ?? key;
    },
    useResponsive: () => ({ width: 1280, breakpoint: 'desktop' }),
    dispatch,
    state: {
      get: () => undefined,
      getLocal: () => ({}),
      getGlobal: () => ({}),
    },
    getSlotContext: () => ({
      getSlotComponents: () => [],
      subscribeToSlot: () => () => {},
      isEnabled: true,
    }),
  };
  (window as any).__slotContextValue = (window as any).G7Core.getSlotContext();
});

afterEach(() => {
  vi.clearAllMocks();
  delete (window as any).G7Core;
  delete (window as any).__slotContextValue;
});

describe('Header 사용자 정의 상품 카테고리 네비게이션', () => {
  it.each(['', '/', '/shop'])('상품 헤더 검색은 상품 목록으로 이동한다 (base=%s)', (shopBase) => {
    const { container } = render(<CategoryHeader shopBase={shopBase} />);
    expect(screen.getByRole('textbox', { name: '상품 검색' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '상품 검색' }), { target: { value: '  콘돔 & ENSITO  ' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(dispatch).toHaveBeenCalledWith({
      handler: 'navigate',
      params: { path: `${shopBase === '/' ? '' : shopBase}/products?keyword=${encodeURIComponent('콘돔 & ENSITO')}&page=1` },
    });
  });

  it('일반 헤더의 통합 검색은 유지하고 빈 검색어는 전송하지 않는다', () => {
    const { container } = render(<Header />);
    expect(screen.getByRole('textbox', { name: '상품 검색' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '상품 검색' }), { target: { value: '   ' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: '상품 검색' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '상품 검색' }), { target: { value: 'ENSITO' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(dispatch).toHaveBeenCalledWith({ handler: 'navigate', params: { path: '/search?q=ENSITO' } });
  });

  it('홈·인기 뒤에 전달받은 상품 메뉴만 표시하고 쇼핑·게시판 메뉴를 대체한다', () => {
    const { container } = render(
      <CategoryHeader
        id="catalog-header"
        siteName="S"
        boards={boards as any}
        navigationItems={navigationItems}
        maxVisibleNavigationItems={2}
      />,
    );

    expect(screen.getByTestId('nav-home')).toHaveTextContent('홈');
    expect(container.querySelector('header')).toHaveAttribute('id', 'catalog-header');
    expect(screen.getByTestId('nav-popular')).toHaveTextContent('인기');
    expect(screen.getByTestId('nav-custom-all-products')).toHaveTextContent('전체상품');
    expect(screen.getByTestId('nav-custom-10')).toHaveTextContent('디지털기기');

    const visibleLabels = Array.from(container.querySelectorAll('nav button')).map(
      (button) => button.textContent?.trim(),
    );
    expect(visibleLabels.slice(0, 4)).toEqual(['홈', '🔥인기', '전체상품', '디지털기기']);

    expect(screen.queryByTestId('nav-shop')).not.toBeInTheDocument();
    expect(screen.queryByText('자유게시판')).not.toBeInTheDocument();
    expect(screen.queryByText('질문답변')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-custom-20')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^더보기/ })).toBeInTheDocument();
  });

  it('상품 메뉴를 클릭하면 그 항목의 경로로 SPA 이동한다', () => {
    render(
      <CategoryHeader
        siteName="S"
        navigationItems={navigationItems}
        maxVisibleNavigationItems={2}
      />,
    );

    fireEvent.click(screen.getByTestId('nav-custom-all-products'));

    expect(dispatch).toHaveBeenCalledWith({
      handler: 'navigate',
      params: { path: '/shop/products' },
    });
  });

  it('표시 제한을 넘는 카테고리는 더보기에서 열고 이동할 수 있다', () => {
    render(
      <CategoryHeader
        siteName="S"
        navigationItems={navigationItems}
        maxVisibleNavigationItems={2}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^더보기/ }));
    const livingCategory = screen.getByTestId('nav-custom-20');
    expect(livingCategory).toHaveTextContent('생활용품');

    fireEvent.click(livingCategory);

    expect(dispatch).toHaveBeenCalledWith({
      handler: 'navigate',
      params: { path: '/shop/category/living' },
    });
    expect(screen.queryByTestId('nav-custom-20')).not.toBeInTheDocument();
  });

  it.each([
    ['생략', undefined],
    ['빈 배열', []],
  ])('CategoryHeader의 navigationItems가 %s이어도 기존 쇼핑·게시판을 노출하지 않는다', (_case, items) => {
    render(<CategoryHeader siteName="S" boards={boards as any} navigationItems={items} />);

    expect(screen.getByTestId('nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-popular')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-shop')).not.toBeInTheDocument();
    expect(screen.queryByText('자유게시판')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^더보기/ })).not.toBeInTheDocument();
  });

  it('navigationItems를 생략하면 기존 쇼핑·게시판 네비게이션을 유지한다', () => {
    render(<Header siteName="S" boards={boards as any} maxVisibleBoards={2} />);

    expect(screen.getByTestId('nav-shop')).toHaveTextContent('쇼핑');
    expect(screen.getByText('자유게시판')).toBeInTheDocument();
    expect(screen.getByText('질문답변')).toBeInTheDocument();
  });
});
