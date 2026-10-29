/**
 * @file user-base-category-navigation.test.ts
 * @description `_user_base.json` commerce category navigation contract.
 *
 * The base layout owns both desktop and mobile header surfaces, so both must be
 * backed by the same category source and create the same shopBase-relative
 * product/category paths.
 *
 * @scenario surface=mobile
 * @effects home_and_popular_remain_first, all_products_precedes_active_categories,
 *   category_click_uses_canonical_shop_path, mobile_menu_closes_before_navigation,
 *   mobile_category_bar_remains_visible,
 *   legacy_shop_and_board_tail_is_removed_from_default_layout,
 *   base_boards_source_is_preserved_for_upgrade_compatibility,
 *   mypage_board_does_not_redeclare_inherited_boards_source,
 *   header_categories_source_is_independent,
 *   shop_pages_keep_local_categories_source_for_upgrade_compatibility,
 *   seo_uses_header_category_source, category_header_wrapper_fixes_custom_navigation_mode,
 *   seo_header_keeps_legacy_shop_and_boards_render_mode,
 *   seo_category_header_uses_custom_navigation_render_mode,
 *   seo_shop_base_and_category_paths_are_evaluator_compatible,
 *   editor_preview_has_header_category_sample,
 *   mobile_all_products_stays_active_on_product_detail
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type JsonObject = Record<string, any>;

const templateRoot = path.resolve(__dirname, '../..');
const userBase = JSON.parse(
  fs.readFileSync(path.resolve(templateRoot, 'layouts/_user_base.json'), 'utf8'),
) as JsonObject;
const mypageBoard = JSON.parse(
  fs.readFileSync(path.resolve(templateRoot, 'layouts/mypage/board.json'), 'utf8'),
) as JsonObject;
const seoConfig = JSON.parse(
  fs.readFileSync(path.resolve(templateRoot, 'seo-config.json'), 'utf8'),
) as JsonObject;
const editorSampleData = JSON.parse(
  fs.readFileSync(path.resolve(templateRoot, 'editor-spec/sampleData.json'), 'utf8'),
) as JsonObject;

function collectObjects(input: unknown, objects: JsonObject[] = []): JsonObject[] {
  if (Array.isArray(input)) {
    for (const item of input) collectObjects(item, objects);
    return objects;
  }

  if (input && typeof input === 'object') {
    const object = input as JsonObject;
    objects.push(object);
    for (const value of Object.values(object)) collectObjects(value, objects);
  }

  return objects;
}

function findById(id: string): JsonObject | undefined {
  return collectObjects(userBase).find((node) => node.id === id);
}

function clickSequence(node: JsonObject): JsonObject[] {
  const sequence = (node.actions ?? []).find(
    (action: JsonObject) =>
      (action.type === 'click' || action.event === 'click') && action.handler === 'sequence',
  );
  return sequence?.actions ?? [];
}

describe('_user_base 상품 카테고리 헤더', () => {
  it('데스크톱·모바일이 공유할 활성 카테고리 API 데이터소스를 로드한다', () => {
    const source = (userBase.data_sources ?? []).find(
      (item: JsonObject) => item.id === 'header_categories',
    );

    expect(source).toMatchObject({
      id: 'header_categories',
      type: 'api',
      endpoint: '/api/modules/sirsoft-ecommerce/categories',
      method: 'GET',
      auto_fetch: true,
      loading_strategy: 'progressive',
      fallback: { data: [] },
    });
    expect(userBase.meta?.seo?.data_sources).toEqual(['boards', 'header_categories']);
  });

  it('레이아웃 편집기에도 공개 카테고리 API와 같은 형태의 헤더 샘플을 제공한다', () => {
    const sample = editorSampleData.byDataSourceId?.header_categories;

    expect(sample?.data?.[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(Object),
      name_localized: expect.any(String),
      slug: expect.any(String),
      depth: expect.any(Number),
      parent_id: null,
      products_count: expect.any(Number),
      children: expect.any(Array),
    });
  });

  it('쇼핑 목록·카테고리의 기존 categories 소스를 업데이트 호환을 위해 유지한다', () => {
    for (const relativePath of ['layouts/shop/index.json', 'layouts/shop/category.json']) {
      const layout = JSON.parse(
        fs.readFileSync(path.resolve(templateRoot, relativePath), 'utf8'),
      ) as JsonObject;
      const source = (layout.data_sources ?? []).find(
        (item: JsonObject) => item.id === 'categories',
      );

      expect(source, relativePath).toMatchObject({
        id: 'categories',
        type: 'api',
        endpoint: '/api/modules/sirsoft-ecommerce/categories',
        method: 'GET',
        auto_fetch: true,
        loading_strategy: 'progressive',
        fallback: { data: [] },
      });
    }
  });

  it('기존 boards 소스는 base에 유지하고 mypage/board에서 재선언하지 않는다', () => {
    const source = (userBase.data_sources ?? []).find(
      (item: JsonObject) => item.id === 'boards',
    );

    expect(source).toMatchObject({
      id: 'boards',
      type: 'api',
      endpoint: '/api/modules/sirsoft-board/boards/board-menu',
      method: 'GET',
      auto_fetch: true,
      loading_strategy: 'progressive',
      fallback: { data: [] },
    });
    expect(
      (mypageBoard.data_sources ?? []).some((item: JsonObject) => item.id === 'boards'),
    ).toBe(false);
  });

  it('검색엔진용 Header와 CategoryHeader는 기존·카테고리 메뉴를 독립적으로 렌더한다', () => {
    const legacyFields = seoConfig.render_modes?.header_nav?.fields ?? [];
    const categoryFields = seoConfig.render_modes?.category_header_nav?.fields ?? [];
    const legacyBoards = legacyFields.find(
      (field: JsonObject) => field.iterate === 'boards',
    );
    const iteratedNavigation = categoryFields.find(
      (field: JsonObject) => field.iterate === 'navigationItems',
    );

    expect(seoConfig.component_map?.Header).toMatchObject({
      tag: 'header',
      render: 'header_nav',
    });
    expect(seoConfig.component_map?.CategoryHeader).toMatchObject({
      tag: 'header',
      render: 'category_header_nav',
    });
    expect(legacyBoards).toMatchObject({
      tag: 'nav',
      iterate: 'boards',
      item_tag: 'a',
      item_content: '{name}',
      item_attrs: { href: '/board/{slug}' },
    });
    expect(JSON.stringify(legacyFields)).toContain('$t:nav.shop');
    expect(JSON.stringify(legacyFields)).not.toContain('navigationItems');

    expect(iteratedNavigation).toMatchObject({
      tag: 'nav',
      iterate: 'navigationItems',
      item_tag: 'a',
      item_content: '{label}',
      item_attrs: { href: '{path}' },
    });
    expect(JSON.stringify(categoryFields)).not.toContain('$t:nav.shop');
    expect(JSON.stringify(categoryFields)).not.toContain('"iterate":"boards"');
  });

  it('데스크톱 CategoryHeader에 전체상품을 먼저, 카테고리를 뒤에 이어 주입한다', () => {
    const desktopHeader = findById('desktop_header');
    expect(desktopHeader).toBeDefined();
    expect(desktopHeader?.name).toBe('CategoryHeader');

    const binding = desktopHeader?.props?.navigationItems;
    expect(typeof binding).toBe('string');
    expect(binding).toContain("id: 'all-products'");
    expect(binding).toContain("$t('shop.all_products')");
    expect(binding).toContain('header_categories?.data ?? []');
    expect(binding).toContain('.map(category =>');
    expect(binding).toContain("id: 'category-'.concat(category.id)");
    expect(binding).toContain("label: category.name_localized ?? ''");

    // shopBase can intentionally be empty when the ecommerce no-route option is enabled.
    expect(binding).toContain("(_global.shopBase ?? '').concat('/products')");
    expect(binding).toContain("(_global.shopBase ?? '').concat('/category/', category.slug ?? '')");
    expect(desktopHeader?.props?.maxVisibleNavigationItems).toBe(1000);
  });

  it('shopBase 초기화도 브라우저와 서버 SEO가 함께 평가할 수 있는 concat 표현식을 쓴다', () => {
    const shopBaseAction = (userBase.init_actions ?? []).find(
      (action: JsonObject) => action.handler === 'setState' && action.params?.shopBase,
    );

    expect(shopBaseAction?.params?.shopBase).toBe(
      "{{_global.modules?.['sirsoft-ecommerce']?.basic_info?.no_route ? '' : '/'.concat(_global.modules?.['sirsoft-ecommerce']?.basic_info?.route_path ?? 'shop')}}",
    );
  });

  it('모바일 드로어에 전체상품 버튼과 카테고리 반복 버튼이 있다', () => {
    const catalog = findById('mobile_catalog_navigation');
    const home = findById('mobile_nav_home');
    const popular = findById('mobile_nav_popular');
    const allProducts = findById('mobile_nav_all_products');
    const category = findById("mobile_nav_category_{{mobileCategory?.id ?? 'unknown'}}");

    expect(catalog).toBeDefined();
    expect(home?.props?.type).toBe('button');
    expect(popular?.props?.type).toBe('button');
    expect(allProducts).toBeDefined();
    expect(allProducts?.props?.type).toBe('button');
    expect(allProducts?.props?.className).toContain(
      "(route.path ?? '').startsWith((_global.shopBase ?? '').concat('/products/'))",
    );
    expect(category).toBeDefined();
    expect(category?.props?.type).toBe('button');
    expect(category?.iteration).toEqual({
      source: '{{header_categories?.data ?? []}}',
      item_var: 'mobileCategory',
      index_var: 'mobileCategoryIndex',
    });

    const categoryText = collectObjects(category).find(
      (node) => node.name === 'Span' && typeof node.text === 'string',
    );
    expect(categoryText?.text).toBe("{{mobileCategory?.name_localized ?? ''}}");

    const drawerSource = JSON.stringify(findById('mobile_nav_drawer'));
    expect(drawerSource.indexOf('mobile_nav_home')).toBeLessThan(
      drawerSource.indexOf('mobile_nav_popular'),
    );
    expect(drawerSource.indexOf('mobile_nav_popular')).toBeLessThan(
      drawerSource.indexOf('mobile_nav_all_products'),
    );
    expect(drawerSource.indexOf('mobile_nav_all_products')).toBeLessThan(
      drawerSource.indexOf("mobile_nav_category_{{mobileCategory?.id ?? 'unknown'}}"),
    );
  });

  it('좁은 화면에서도 홈·인기·전체상품·카테고리를 상단 가로 메뉴로 노출한다', () => {
    const bar = findById('mobile_category_bar');
    const source = JSON.stringify(bar);
    const category = findById("mobile_category_bar_category_{{mobileBarCategory?.id ?? 'unknown'}}");

    expect(bar?.props?.className).toBe('hidden');
    expect(bar?.responsive?.portable?.props?.className).toContain('overflow-x-auto');
    expect(source.indexOf('mobile_category_bar_home')).toBeLessThan(
      source.indexOf('mobile_category_bar_popular'),
    );
    expect(source.indexOf('mobile_category_bar_popular')).toBeLessThan(
      source.indexOf('mobile_category_bar_all_products'),
    );
    expect(source.indexOf('mobile_category_bar_all_products')).toBeLessThan(
      source.indexOf("mobile_category_bar_category_{{mobileBarCategory?.id ?? 'unknown'}}"),
    );
    expect(category?.iteration).toEqual({
      source: '{{header_categories?.data ?? []}}',
      item_var: 'mobileBarCategory',
      index_var: 'mobileBarCategoryIndex',
    });
  });

  it('모바일 메뉴는 먼저 닫히고 shopBase 기준의 상품·카테고리 경로로 이동한다', () => {
    const allProducts = findById('mobile_nav_all_products')!;
    const category = findById("mobile_nav_category_{{mobileCategory?.id ?? 'unknown'}}")!;
    const allProductsActions = clickSequence(allProducts);
    const categoryActions = clickSequence(category);

    expect(allProductsActions[0]).toMatchObject({
      handler: 'setState',
      params: { target: 'global', mobileMenuOpen: false },
    });
    expect(allProductsActions[1]).toMatchObject({
      handler: 'navigate',
      params: { path: "{{(_global.shopBase ?? '').concat('/products')}}" },
    });

    expect(categoryActions[0]).toMatchObject({
      handler: 'setState',
      params: { target: 'global', mobileMenuOpen: false },
    });
    expect(categoryActions[1]).toMatchObject({
      handler: 'navigate',
      params: {
        path: "{{(_global.shopBase ?? '').concat('/category/', mobileCategory?.slug ?? '')}}",
      },
    });
  });

  it('모바일 드로어에 기존 게시판·쇼핑 섹션을 중복 노출하지 않는다', () => {
    const drawer = findById('mobile_nav_drawer');
    expect(drawer).toBeDefined();

    const drawerNodes = collectObjects(drawer);
    const comments = drawerNodes
      .map((node) => node.comment)
      .filter((comment): comment is string => typeof comment === 'string');

    expect(comments).not.toContain('메뉴 섹션 - 게시판');
    expect(comments).not.toContain('메뉴 섹션 - 쇼핑');
    expect(JSON.stringify(drawer)).not.toContain('{{boards.data ?? []}}');
    expect(JSON.stringify(drawer)).not.toContain('/board/{{board.slug}}');
  });
});
