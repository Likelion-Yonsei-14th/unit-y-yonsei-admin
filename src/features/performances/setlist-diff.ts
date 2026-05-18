/**
 * 셋리스트 편집 버퍼와 서버 상태를 비교해 항목별 작업 목록을 산출하는 순수 함수.
 *
 * 백엔드에 임베디드 일괄저장이 없어 셋리스트는 항목별 endpoint(POST/PATCH/DELETE)로
 * 처리한다. 이 모듈은 "무엇을 호출할지"만 계산하고, 실제 mutation 실행은 호출 측이
 * 담당한다 — React/부수효과 없는 순수 함수라 독립 테스트가 가능하다.
 */

import type { SetlistCreateDTO, SetlistItem, SetlistUpdateDTO } from './types';

/** 한 셋리스트 항목의 PATCH 대상 body. */
export interface SetlistUpdateWork {
  id: number;
  dto: SetlistUpdateDTO;
}

/** diff 결과 — 호출 측이 그대로 mutation 으로 소비한다. */
export interface SetlistDiff {
  /** 신규 항목 (음수 임시 id) → POST. */
  creates: SetlistCreateDTO[];
  /** 내용/순서가 바뀐 기존 항목 → PATCH. */
  updates: SetlistUpdateWork[];
  /** 서버엔 있고 버퍼엔 없는 항목 id → DELETE. */
  deletes: number[];
}

/** SetlistItem 한 건을 요청 body 로 정규화. note 는 빈 문자열이면 null. */
function toBody(item: SetlistItem): SetlistCreateDTO {
  return {
    songTitle: item.songTitle,
    singerName: item.singerName,
    songOrder: item.songOrder,
    note: item.note || null,
  };
}

/**
 * 서버 셋리스트와 편집 버퍼를 비교한다.
 *   - 음수 임시 id = 신규 → creates
 *   - 서버에 있던 id 중 버퍼에 없음 = 삭제 → deletes
 *   - 남은 항목 중 내용/순서가 변한 것 = 수정 → updates
 *
 * @param server  서버에서 로드한 셋리스트 (편집 시작 시점 스냅샷)
 * @param buffer  사용자가 편집한 로컬 버퍼
 */
export function diffSetlist(server: SetlistItem[], buffer: SetlistItem[]): SetlistDiff {
  const serverIds = new Set(server.map((s) => s.id));
  const bufferIds = new Set(buffer.filter((s) => s.id > 0).map((s) => s.id));

  const deletes: number[] = [];
  for (const s of server) {
    if (!bufferIds.has(s.id)) {
      deletes.push(s.id);
    }
  }

  const creates: SetlistCreateDTO[] = [];
  const updates: SetlistUpdateWork[] = [];
  for (const s of buffer) {
    const body = toBody(s);
    if (s.id < 0) {
      creates.push(body);
    } else if (serverIds.has(s.id)) {
      const before = server.find((x) => x.id === s.id)!;
      const changed =
        before.songTitle !== s.songTitle ||
        before.singerName !== s.singerName ||
        before.songOrder !== s.songOrder ||
        before.note !== s.note;
      if (changed) {
        updates.push({ id: s.id, dto: body });
      }
    }
  }

  return { creates, updates, deletes };
}
