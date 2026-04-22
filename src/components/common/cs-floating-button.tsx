import { MessageCircle } from "lucide-react";
import { env } from "@/lib/env";

/**
 * 우하단에 고정 노출되는 플로팅 CS 문의 버튼.
 *
 * 클릭 시 VITE_KAKAO_CS_URL 로 설정된 오픈카카오 채팅방을 새 탭에서 연다.
 * URL 이 설정돼 있지 않으면 렌더 자체를 스킵 — 링크 없는 버튼 클릭 혼란을
 * 주는 것보다 버튼 자체를 숨기는 편이 안전하다 (스펙: 2026-04-23 참고).
 *
 * AppLayout 에 한 번만 마운트. RequireAuth 하위이므로 로그인 후 모든 페이지
 * 에서만 노출되고 로그인 페이지에는 자동으로 보이지 않는다.
 */
export function CsFloatingButton() {
  const url = env.KAKAO_CS_URL;

  if (!url) {
    if (import.meta.env.DEV) {
      console.info("[cs] VITE_KAKAO_CS_URL 미설정 — CS 플로팅 버튼 숨김");
    }
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="CS 문의"
      title="CS 담당자에게 카카오톡 문의"
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 hover:shadow-xl transition-transform"
    >
      <MessageCircle size={24} />
    </a>
  );
}
