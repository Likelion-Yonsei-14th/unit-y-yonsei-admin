import { Outlet, Link, useLocation } from 'react-router';
import { useState } from 'react';
import {
  LogOut, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { MAIN_NAV, FOOTER_NAV, type NavItem } from '@/config/nav';
import { useAuth, useLogout } from '@/features/auth/hooks';
import { ROLE_LABEL } from '@/types/role';

/**
 * 어드민 공통 레이아웃.
 *
 * 피그마 원본 Layout.tsx 기반으로 재작성:
 * - 하드코딩 그라데이션(from-blue-500 to-cyan-500) → 디자인 토큰(bg-primary)
 * - 네비게이션을 config/nav.ts에서 가져와 권한 기반 필터링
 * - 로그아웃 버튼에 useLogout 연결
 * - 현재 사용자 정보 표시
 */
export function AppLayout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { user, can } = useAuth();
  const logout = useLogout();

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  /**
   * 권한 기반 네비 필터링.
   *
   * 규칙:
   * 1. item.requires가 있으면 그 권한부터 체크. 실패 시 자식 불문 숨김.
   *    → 부모 path로 잘못 라우트되는 걸 원천 차단.
   * 2. children이 있는 경우 재귀 필터 후 하나도 안 남으면 부모도 숨김.
   * 3. requires 없고 children 없는 메뉴는 전체 공개.
   */
  const filterNav = (items: NavItem[]): NavItem[] =>
    items
      .map(item => {
        if (item.requires && !can(item.requires)) return null;
        if (item.children) {
          const children = filterNav(item.children);
          if (children.length === 0) return null;
          return { ...item, children };
        }
        return item;
      })
      .filter((x): x is NavItem => x !== null);

  const navItems = filterNav(MAIN_NAV);
  const footerItems = filterNav(FOOTER_NAV);

  const isMenuActive = (item: NavItem): boolean => {
    if (item.children?.length) {
      return (
        item.children.some(child => location.pathname === child.path) ||
        location.pathname === item.path
      );
    }
    return location.pathname === item.path;
  };

  return (
    <div className="flex h-screen bg-muted">
      <aside
        className={`
          bg-background border-r border-border flex flex-col transition-all duration-300 ease-in-out relative
          ${isCollapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* 토글 버튼 */}
        <button
          onClick={() => setIsCollapsed(v => !v)}
          className="absolute -right-3 top-6 bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-shadow z-10"
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {isCollapsed
            ? <ChevronRight size={16} className="text-muted-foreground" />
            : <ChevronLeft size={16} className="text-muted-foreground" />}
        </button>

        {/* 헤더 (로고) */}
        <div className={`p-6 border-b border-border ${isCollapsed ? 'px-3' : ''}`}>
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">대</span>
              </div>
            </div>
          ) : (
            <>
              <div className="ds-label text-muted-foreground mb-1">2026</div>
              <h1 className="ds-heading-2 text-primary">대동제 어드민</h1>
            </>
          )}
        </div>

        {/* 사용자 정보 */}
        {!isCollapsed && user && (
          <div className="px-4 py-3 border-b border-border">
            <div className="ds-caption text-muted-foreground">현재 로그인</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="ds-body-2 font-medium text-foreground">{user.name}</span>
              <span className="ds-label px-2 py-0.5 rounded-full bg-ds-primary-subtle text-ds-primary-pressed">
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>
        )}

        {/* 메인 네비 */}
        <nav className={`flex-1 overflow-y-auto p-4 space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = isMenuActive(item);
            const isExpanded = expandedMenus.has(item.path);
            const hasChildren = (item.children?.length ?? 0) > 0;

            return (
              <div key={item.path}>
                {hasChildren ? (
                  <div className="flex items-center gap-1">
                    {/* 상위 메뉴: path 접근 가능하면 링크, 아니면 버튼 */}
                    {item.requires && can(item.requires) ? (
                      <Link
                        to={item.path}
                        className={`
                          flex items-center gap-3 rounded-lg transition-all flex-1
                          ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-2.5'}
                          ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'}
                        `}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon size={18} />
                        {!isCollapsed && <span className="ds-body-2 flex-1">{item.label}</span>}
                      </Link>
                    ) : (
                      <button
                        onClick={() => toggleMenu(item.path)}
                        className={`
                          flex items-center gap-3 rounded-lg transition-all flex-1 w-full
                          ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-2.5'}
                          text-muted-foreground hover:bg-muted
                        `}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon size={18} />
                        {!isCollapsed && (
                          <>
                            <span className="ds-body-2 flex-1 text-left">{item.label}</span>
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </>
                        )}
                      </button>
                    )}

                    {/* 확장 토글 (상위가 Link인 경우 별도 버튼) */}
                    {item.requires && can(item.requires) && !isCollapsed && (
                      <button
                        onClick={() => toggleMenu(item.path)}
                        className={`
                          px-2 py-3 rounded-lg transition-all
                          ${isActive
                            ? 'text-primary-foreground hover:bg-ds-primary-pressed'
                            : 'text-muted-foreground hover:bg-muted'}
                        `}
                        aria-label="서브메뉴 토글"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`
                      flex items-center gap-3 rounded-lg transition-all
                      ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-2.5'}
                      ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'}
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} />
                    {!isCollapsed && <span className="ds-body-2">{item.label}</span>}
                  </Link>
                )}

                {/* 서브 메뉴 */}
                {hasChildren && isExpanded && !isCollapsed && (
                  <div className="mt-1 space-y-1">
                    {item.children!.map(child => {
                      const ChildIcon = child.icon;
                      const isChildActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`
                            flex items-center gap-3 rounded-lg ml-4 pl-7 pr-4 py-2 transition-all
                            ${isChildActive
                              ? 'bg-ds-primary-subtle text-ds-primary-pressed'
                              : 'text-muted-foreground hover:bg-muted'}
                          `}
                        >
                          <ChildIcon size={16} />
                          <span className="ds-body-2">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 하단 메뉴 */}
        <div className={`p-4 border-t border-border space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
          {footerItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 rounded-lg transition-all
                  ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-2.5'}
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!isCollapsed && <span className="ds-body-2">{item.label}</span>}
              </Link>
            );
          })}

          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={`
              flex items-center gap-3 rounded-lg w-full transition-all
              ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-2.5'}
              text-muted-foreground hover:bg-muted disabled:opacity-50
            `}
            title={isCollapsed ? '로그아웃' : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="ds-body-2">로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
