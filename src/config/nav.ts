import type { LucideIcon } from 'lucide-react';
import {
  Users, Store, Calendar, Music, Settings,
  FileText, Package, Map, MessageCircle,
} from 'lucide-react';
import type { Permission } from './permissions';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** 이 메뉴가 보이기 위해 필요한 권한. 없으면 전체 공개. */
  requires?: Permission;
  children?: NavItem[];
}

/**
 * 사이드바 메인 네비게이션 정의.
 * 레이아웃은 이 배열을 순회하며 렌더링하고,
 * useAuth().can(requires)로 필터링함.
 */
export const MAIN_NAV: NavItem[] = [
  {
    path: '/users',
    label: '유저 관리',
    icon: Users,
    requires: 'user.read',
  },
  {
    path: '/booth',
    label: '부스 정보 관리',
    icon: Store,
    // 현재 /booth 페이지는 "내 부스 편집" 화면이라 Booth 역할만 의미 있음.
    // Super/Master용 부스 목록/상세 화면이 생기면 별도 항목으로 추가.
    requires: 'booth.update.own',
  },
  {
    path: '/reservations',
    label: '예약 관리',
    icon: Calendar,
    requires: 'reservation.read',
  },
  {
    path: '/performance',
    label: '공연 정보 관리',
    icon: Music,
    requires: 'performance.read',
  },
  {
    path: '/booth-layout/edit',
    label: '부스 좌표 편집',
    icon: Map,
    requires: 'boothlayout.edit',
  },
  {
    path: '/general',
    label: '기타 정보 관리',
    icon: Settings,
    // 상위는 권한 없이도 토글되게 두고, 자식들로 필터링
    children: [
      { path: '/general/notice', label: '총학생회 공지사항', icon: FileText, requires: 'notice.manage' },
      { path: '/general/lost-found', label: '분실물 관리', icon: Package, requires: 'lostfound.read' },
      { path: '/general/booth-layout', label: '부스 배치도 매칭', icon: Map, requires: 'boothlayout.read' },
      { path: '/general/performance-review', label: '공연 후기 수합', icon: MessageCircle, requires: 'performancereview.read' },
    ],
  },
];

/**
 * 사이드바 하단 고정 메뉴.
 *
 * 현재는 비어 있다. "신규 어드민 생성"은 `/users` 페이지 헤더의 CTA로 이전됨 —
 * 유저 CRUD 액션이 한 페이지에 모여 일관성이 좋고, 로그아웃 버튼과의 오클릭 위험도 사라짐.
 * `/create-admin` 라우트 자체는 딥링크/직접 접근용으로 유지.
 */
export const FOOTER_NAV: NavItem[] = [];
