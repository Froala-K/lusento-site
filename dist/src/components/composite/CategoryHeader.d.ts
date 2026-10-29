import { default as React } from 'react';
import { HeaderViewProps, NavigationItem } from './Header';
export type CategoryHeaderProps = Omit<HeaderViewProps, 'navigationItems' | 'maxVisibleNavigationItems' | 'navigationMode'> & {
    /** 홈·인기 뒤에 표시할 상품 메뉴 */
    navigationItems?: NavigationItem[];
    /** 탭에 바로 표시할 최대 상품 메뉴 수 */
    maxVisibleNavigationItems?: number;
};
/**
 * 상품 카테고리 전용 헤더입니다.
 *
 * 빈 배열이 전달되거나 navigationItems가 생략돼도 기존 쇼핑·게시판 메뉴로
 * 되돌아가지 않도록 사용자 정의 네비게이션 모드를 고정합니다.
 */
declare const CategoryHeader: React.FC<CategoryHeaderProps>;
export default CategoryHeader;
